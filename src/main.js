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
 * Send Esc to the WhatsApp page so the open conversation is
 * deselected. Keeps the user from appearing "in" a chat after the
 * window hides. Must run while the window still has focus —
 * sendInputEvent is a no-op on an unfocused window — so call before
 * hide()/minimize().
 */
function deselectChat(win) {
  try {
    const wc = win.webContents;
    if (!wc || wc.isDestroyed()) return;
    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  } catch (err) {
    console.error(`[main] failed to deselect chat: ${err.message}`);
  }
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
  //   - If tray works → hide to tray (invisible, click tray to restore)
  //   - If tray unavailable → minimize to dock (window icon visible
  //     in the taskbar, click to restore)
  //   - If user explicitly chose Quit → allow close
  win.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    const tray = getTray();
    if (tray) {
      // hide() does not fire 'minimize', so deselect here while still
      // focused. The minimize() path lets the 'minimize' handler do it
      // (avoids a double Esc).
      deselectChat(win);
      win.hide();
    } else {
      // Make sure the window stays in the taskbar even when minimized.
      win.setSkipTaskbar(false);
      win.minimize();
    }
  });

  // Covers the taskbar minimize button and the no-tray close path
  // above (minimize() fires this event). Best-effort: the window may
  // already be losing focus.
  win.on('minimize', () => deselectChat(win));

  registerWindow(win);
  attachNotificationBridge(win);
  return win;
}

/**
 * Show one profile at a time: focus (or create) the target window
 * and hide every other profile window. Makes the Profiles menu act
 * as a switcher instead of opening profiles side by side.
 */
function switchToProfile(profileId) {
  const target = openProfile(profileId);
  for (const [id, win] of windowsByProfile) {
    if (id === profileId) continue;
    if (win && !win.isDestroyed() && win.isVisible()) {
      win.hide();
    }
  }
  return target;
}

function quitApp() {
  isQuitting = true;
  destroyTray();
  app.quit();
}

function bootstrap() {
  // Only the default profile opens on launch. Other profiles are
  // opened explicitly via the menu or CLI flag.
  openProfile(initialProfileId);

  installAppMenu({
    currentWindow: () => BrowserWindow.getFocusedWindow() || null,
    openProfile,
    switchToProfile,
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
// existing windows and steal focus.
app.on('second-instance', (_event, argv) => {
  // If the user passed --profile=work, try to show that specific window.
  const match = argv.find((a) => a.startsWith('--profile='));
  if (match) {
    const { PROFILE_ID_RE } = require('./profiles');
    const id = match.split('=')[1];
    if (PROFILE_ID_RE.test(id)) {
      openProfile(id);
      return;
    }
  }
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

module.exports = { openProfile, switchToProfile, windowsByProfile };