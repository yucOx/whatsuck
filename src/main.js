'use strict';

const { app, BrowserWindow, dialog, ipcMain } = require('electron');

const C = require('./constants');
const { createMainWindow } = require('./window');
const { installAppMenu } = require('./menu');
const { attachNotificationBridge } = require('./notifications');
const { checkKeyringAndWarn } = require('./security');
const { checkForUpdates } = require('./updater');
const { checkBrowserStaleness } = require('./browser-check');
const { loadProfiles, saveProfiles, PROFILE_ID_RE } = require('./profiles');
const { syncDesktopFiles } = require('./desktop');
const { createTray, destroyTray, refreshTrayMenu, getTray } = require('./tray');
const { loadSettings, saveSettings } = require('./settings');
const { openSettingsWindow } = require('./settings-window');

// Track windows by profile id, since multiple windows can coexist.
const windowsByProfile = new Map();

// Whether the user explicitly asked to quit (tray Quit, File > Quit).
// When false, the close button hides to tray instead of quitting.
let isQuitting = false;

// Refreshes the app menu (re-reads which profile is focused). Set from
// bootstrap once installAppMenu returns. Kept as a no-op until then so
// the 'focus' listener below is safe to register at any time.
let refreshMenu = () => {};

/**
 * Resolve which profile to open on launch. CLI `--profile=<id>` wins;
 * otherwise the user's Settings → startup.profileId; otherwise the
 * marked-default profile, then 'default'. Invalid ids fall through.
 *
 * @param {string[]} [argv]
 * @returns {string}
 */
function resolveInitialProfileId(argv) {
  const a = argv || process.argv;
  const cli = a.find((x) => x.startsWith('--profile='));
  if (cli) {
    const id = cli.split('=')[1];
    if (PROFILE_ID_RE.test(id) && loadProfiles().some((p) => p.id === id)) {
      return id;
    }
    console.warn(`[main] ignoring invalid --profile="${id}"`);
  }
  const sid = loadSettings().startup.profileId;
  if (sid && PROFILE_ID_RE.test(sid) && loadProfiles().some((p) => p.id === sid)) {
    return sid;
  }
  const def = loadProfiles().find((p) => p.isDefault);
  return def ? def.id : 'default';
}

// Resolve the profile to open on this launch.
const initialProfileId = resolveInitialProfileId(process.argv);

// The profile the user last interacted with. Used by tray "Show" and
// second-instance so we restore ONE window (the active profile), not
// every hidden profile window at once.
let lastActiveProfileId = initialProfileId;

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
  // Rebuild the menu whenever this window gains focus, so the Profiles
  // radio reflects the actually-focused profile. The menu is otherwise
  // built once at bootstrap and its currentProfileId would go stale.
  win.on('focus', () => {
    lastActiveProfileId = win._profileId;
    refreshMenu();
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
    lastActiveProfileId = profileId;
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
    const settings = loadSettings();
    // User option: X quits the app instead of hiding to tray.
    if (settings.closeButton.behavior === 'quit') {
      event.preventDefault();
      quitApp();
      return;
    }
    event.preventDefault();
    if (settings.minimize.escToDeselect) {
      // hide() does not fire 'minimize', so deselect here while still
      // focused. The minimize() path lets the 'minimize' handler do it
      // (avoids a double Esc).
      deselectChat(win);
    }
    const tray = getTray();
    if (tray) {
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
  win.on('minimize', () => {
    if (loadSettings().minimize.escToDeselect) deselectChat(win);
  });

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
  lastActiveProfileId = profileId;
  for (const [id, win] of windowsByProfile) {
    if (id === profileId) continue;
    if (win && !win.isDestroyed() && win.isVisible()) {
      win.hide();
    }
  }
  return target;
}

/**
 * Restore the profile the user last interacted with — used by tray
 * "Show" and second-instance. Shows exactly one window (the active
 * profile), not every hidden profile window.
 */
function showActiveProfile() {
  return switchToProfile(lastActiveProfileId);
}

/**
 * Refresh both the app menu and the tray context menu. Call after
 * profile create/rename/delete/pin and after settings save.
 */
function refreshAllMenus() {
  refreshMenu();
  refreshTrayMenu();
}

function quitApp() {
  isQuitting = true;
  destroyTray();
  app.quit();
}

// Settings window IPC: the preload (settings-preload.js) invokes these.
ipcMain.handle('settings-get', () => ({
  settings: loadSettings(),
  profiles: loadProfiles(),
}));
ipcMain.handle('settings-save', (_event, s) => {
  try {
    saveSettings(s);
  } catch (err) {
    console.error(`[main] settings save failed: ${err.message}`);
    return false;
  }
  refreshAllMenus();
  return true;
});

function bootstrap() {
  // Only the default profile opens on launch. Other profiles are
  // opened explicitly via the menu or CLI flag.
  openProfile(initialProfileId);

  // installAppMenu returns { rebuildMenu }; wire it so window focus
  // events can refresh the Profiles radio. See registerWindow.
  refreshMenu = installAppMenu({
    currentWindow: () => BrowserWindow.getFocusedWindow() || null,
    openProfile,
    switchToProfile,
    openSettingsWindow,
    onProfilesChanged: refreshAllMenus,
    quitApp,
  }).rebuildMenu;

  // Create the tray so closing the window keeps the app alive. Pass a
  // show handler that restores only the active profile window, and a
  // per-profile list so the user can switch from the tray directly.
  createTray(quitApp, showActiveProfile, {
    getProfiles: loadProfiles,
    switchProfile: switchToProfile,
    getActiveId: () => lastActiveProfileId,
  });

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
  showActiveProfile();
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
    showActiveProfile();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
});

module.exports = { openProfile, switchToProfile, windowsByProfile };