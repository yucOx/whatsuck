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
const { createTray, destroyTray, focusExistingWindows, getTray } = require('./tray');

// Track windows by profile id, since multiple windows can coexist.
const windowsByProfile = new Map();

// Whether the user explicitly asked to quit (tray Quit, File > Quit).
// When false, the close button hides to tray instead of quitting.
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

// --- Single instance ---
// If the user clicks the app launcher while Whatsuck is already
// running (hidden in tray), we want to focus the existing window
// instead of opening a second instance. requestSingleInstanceLock
// makes the OS send a 'second-instance' event to the first process.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another instance is already running. Tell it to show its
  // windows, then exit this one immediately.
  app.quit();
}

function registerWindow(win) {
  windowsByProfile.set(win._profileId, win);
  win.on('closed', () => {
    windowsByProfile.delete(win._profileId);
  });
}

/**
 * Open a window for a given profile. If one is already open, show it.
 */
function openProfile(profileId) {
  if (profileId === 'default') {
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
    existing.focus();
    return existing;
  }

  const win = createMainWindow({
    profileId,
    onClosed: () => {},
  });

  // Intercept the close button:
  //   - If tray works → hide to tray
  //   - If tray is unavailable → minimize to dock (window stays
  //     visible in the taskbar as a minimized icon)
  //   - If user explicitly chose Quit → allow close
  win.on('close', (event) => {
    if (isQuitting) return;
    const tray = getTray();
    if (tray) {
      event.preventDefault();
      win.hide();
    } else {
      // No tray: minimize instead of closing. The app stays
      // visible in the dock/taskbar so the user can restore it.
      // The window-all-closed event won't fire because we don't
      // actually close.
      event.preventDefault();
      win.minimize();
    }
  });

  registerWindow(win);
  attachNotificationBridge(win);
  return win;
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

// Second instance: the user clicked the launcher again. Show the
// existing windows instead of doing nothing.
app.on('second-instance', () => {
  focusExistingWindows();
});

// With the tray active, "all windows closed" is not a quit signal.
// The tray remains. Only explicit Quit (tray menu, File > Quit)
// ends the process.
app.on('window-all-closed', (e) => {
  if (process.platform === 'darwin') return;
  if (!isQuitting) {
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