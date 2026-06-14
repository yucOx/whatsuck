'use strict';

const { app, BrowserWindow, dialog } = require('electron');

const C = require('./constants');
const { createMainWindow } = require('./window');
const { installAppMenu } = require('./menu');
const { attachNotificationBridge } = require('./notifications');
const { checkKeyringAndWarn } = require('./security');
const { checkForUpdates } = require('./updater');
const { checkBrowserStaleness } = require('./browser-check');
const { loadProfiles, getActiveProfileId, saveProfiles } = require('./profiles');
const { syncDesktopFiles } = require('./desktop');
const { createTray, destroyTray, focusExistingWindows } = require('./tray');

// Track windows by profile id, since multiple windows can coexist.
const windowsByProfile = new Map();

// Whether closing a window should quit the app. When the tray is
// active, the user closing the last window means "hide to tray",
// not "quit". The only path to quit is the tray's Quit menu.
let isQuitting = false;

// Resolve the profile to open on this launch.
const initialProfileId = getActiveProfileId(process.argv);

// Apply CLI switches before app is ready.
for (const sw of C.cliSwitches) {
  app.commandLine.appendSwitch(sw);
}

// Set the X11/Wayland window class to match the per-profile
// StartupWMClass in the .desktop file, so taskbar grouping works.
if (initialProfileId !== 'default') {
  app.commandLine.appendSwitch('class', `whatsuck-${initialProfileId}`);
}

function registerWindow(win) {
  windowsByProfile.set(win._profileId, win);
  win.on('closed', () => {
    windowsByProfile.delete(win._profileId);
  });
}

/**
 * Open a window for a given profile. If one is already open, focus it.
 */
function openProfile(profileId) {
  if (profileId === 'default') {
    // Ensure the default profile exists in profiles.json.
    const profiles = loadProfiles();
    if (!profiles.some(p => p.id === 'default')) {
      profiles.unshift({ id: 'default', name: 'Personal', isDefault: true, isPinned: false });
      saveProfiles(profiles);
    }
  }
  const existing = windowsByProfile.get(profileId);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    return existing;
  }

  const win = createMainWindow({
    profileId,
    onClosed: () => {},
  });

  // Intercept the close button: hide to tray instead of quitting,
  // unless the user explicitly chose Quit.
  win.on('close', (event) => {
    if (isQuitting) return; // allow close during real quit
    if (!trayExists()) return; // no tray → behave normally
    event.preventDefault();
    win.hide();
  });

  registerWindow(win);
  attachNotificationBridge(win);
  return win;
}

function trayExists() {
  // The tray module returns a singleton. If createTray has been
  // called and not yet destroyed, the tray is active.
  try {
    const { getTray } = require('./tray');
    return getTray() !== null;
  } catch {
    return false;
  }
}

function quitApp() {
  isQuitting = true;
  destroyTray();
  app.quit();
}

function bootstrap() {
  openProfile(initialProfileId);

  installAppMenu({
    currentWindow: () => BrowserWindow.getFocusedWindow() || null,
    openProfile,
    quitApp,
  });

  // Create the tray so closing the window keeps the app alive.
  // The tray icon gives the user a way back in (left click to
  // restore) and out (right-click → Quit).
  createTray(quitApp);

  const primary = windowsByProfile.get(initialProfileId);
  if (primary) {
    checkKeyringAndWarn(primary);
  }

  checkForUpdates();
  checkBrowserStaleness();
  syncDesktopFiles(loadProfiles(), app.getPath('exe'));
}

app.whenReady().then(bootstrap);

// With the tray active, "all windows closed" is not a quit signal.
// The tray remains. Only explicit Quit (tray menu, or the in-app
// menu's Quit role) ends the process.
app.on('window-all-closed', (e) => {
  if (process.platform === 'darwin') return;
  if (!isQuitting) {
    // Prevent the default app-quit behavior. The user can still
    // quit via the tray menu.
    e.preventDefault();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openProfile(initialProfileId);
  } else {
    focusExistingWindows();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
});

module.exports = { openProfile, windowsByProfile };