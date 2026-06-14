'use strict';

const { app, BrowserWindow } = require('electron');

const C = require('./constants');
const { createMainWindow } = require('./window');
const { installAppMenu } = require('./menu');
const { attachNotificationBridge } = require('./notifications');
const { checkKeyringAndWarn } = require('./security');
const { checkForUpdates } = require('./updater');
const { checkBrowserStaleness } = require('./browser-check');
const { loadProfiles, getActiveProfileId } = require('./profiles');
const { syncDesktopFiles } = require('./desktop');

// Track windows by profile id, since multiple windows can coexist.
const windowsByProfile = new Map();

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
      require('./profiles').saveProfiles(profiles);
    }
  }
  const existing = windowsByProfile.get(profileId);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return existing;
  }

  const win = createMainWindow({
    profileId,
    onClosed: () => {},
  });
  registerWindow(win);
  attachNotificationBridge(win);
  return win;
}

function bootstrap() {
  openProfile(initialProfileId);

  // Install the app menu ONCE. It dynamically rebuilds based on
  // whichever window is focused, so multiple windows share a single
  // menu that just queries the current focus.
  installAppMenu({
    currentWindow: () => BrowserWindow.getFocusedWindow() || null,
    openProfile,
  });

  // The keyring/updater dialogs need a parent window. They only
  // fire once per process, so they can attach to the first window.
  const primary = windowsByProfile.get(initialProfileId);
  if (primary) {
    checkKeyringAndWarn(primary);
  }

  // Auto-update runs in the background, no window parent needed.
  checkForUpdates();

  // Check if the bundled Chromium is too far behind stable Chrome.
  checkBrowserStaleness();

  // Reconcile pinned .desktop files with current profile list.
  syncDesktopFiles(loadProfiles(), app.getPath('exe'));
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // Standard desktop behavior: quit when all windows close,
  // except on macOS where apps stay in the dock.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openProfile(initialProfileId);
  }
});

// Expose openProfile for the menu module to call.
module.exports = { openProfile, windowsByProfile };