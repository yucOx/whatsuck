'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const C = require('./constants');
const { createMainWindow, createProfileView } = require('./window');
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
const { pickProfile } = require('./profile-picker');
const { promptMediaPermission } = require('./media-prompt');
const { createShell, sendTabsUpdate } = require('./tabs-shell');

// BrowserWindow-per-profile registry (switch / windows modes).
const windowsByProfile = new Map();

// Tabs mode: one shell + one WebContentsView per open profile.
let shell = null;
const viewsByProfile = new Map();
let activeTabId = null;

let isQuitting = false;
let refreshMenu = () => {};

// Last profile the user interacted with — source of truth for tray
// "Show", menu radio, and the tray per-profile list.
let lastActiveProfileId = 'default';

function layout() {
  return loadSettings().ui.layout; // 'switch' | 'tabs' | 'windows'
}

/**
 * Resolve which profile to open on launch. CLI `--profile=<id>` wins;
 * otherwise Settings → startup.profileId; otherwise the marked-default
 * profile, then 'default'.
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

const initialProfileId = resolveInitialProfileId(process.argv);
lastActiveProfileId = initialProfileId;

for (const sw of C.cliSwitches) {
  app.commandLine.appendSwitch(sw);
}
if (initialProfileId !== 'default') {
  app.commandLine.appendSwitch('class', `whatsuck-${initialProfileId}`);
}

// `whatsuck --version` — print the packaged version and exit, before the
// single-instance lock, so it works even if another instance is running.
// Makes the bug-report instruction in README/CONTRIBUTING ("whatsuck --version")
// resolve to the real distributed-binary version (app.getVersion() = package.json).
if (process.argv.includes('--version')) {
  console.log(app.getVersion());
  app.exit(0);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// --- helpers shared across modes ---

/**
 * Send Esc to a webContents so the open conversation is deselected.
 * Must run while the window still has focus (sendInputEvent is a
 * no-op on an unfocused webContents), so call before hide()/minimize().
 */
function deselectChat(wc) {
  try {
    if (!wc || wc.isDestroyed()) return;
    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  } catch (err) {
    console.error(`[main] failed to deselect chat: ${err.message}`);
  }
}

/** Raise a profile's BrowserWindow (switch/windows modes). */
function raiseProfileWindow(profileId) {
  const win = windowsByProfile.get(profileId);
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.setSkipTaskbar(false);
  win.moveTop();
  win.focus();
}

/** Surface a profile regardless of layout (used by notification click). */
function raiseProfile(profileId) {
  if (layout() === 'tabs') {
    if (!shell || shell.isDestroyed()) return;
    if (!shell.isVisible()) shell.show();
    if (shell.isMinimized()) shell.restore();
    setActiveTab(profileId);
    shell.setSkipTaskbar(false);
    shell.moveTop();
    shell.focus();
  } else {
    raiseProfileWindow(profileId);
  }
}

// --- BrowserWindow path (switch / windows modes) ---

function registerWindow(win) {
  windowsByProfile.set(win._profileId, win);
  win.on('closed', () => {
    windowsByProfile.delete(win._profileId);
    refreshAllMenus();
  });
  win.on('focus', () => {
    lastActiveProfileId = win._profileId;
    refreshMenu();
  });
}

function openProfile(profileId) {
  if (profileId === 'default') {
    const profiles = loadProfiles();
    if (!profiles.some((p) => p.id === 'default')) {
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

  const win = createMainWindow({ profileId, onClosed: () => {} });
  win.on('close', (event) => {
    if (isQuitting) return;
    const settings = loadSettings();
    if (settings.closeButton.behavior === 'quit') {
      event.preventDefault();
      quitApp();
      return;
    }
    event.preventDefault();
    if (settings.minimize.escToDeselect) deselectChat(win.webContents);
    const tray = getTray();
    if (tray) {
      win.hide();
    } else {
      win.setSkipTaskbar(false);
      win.minimize();
    }
  });
  win.on('minimize', () => {
    if (loadSettings().minimize.escToDeselect) deselectChat(win.webContents);
  });

  registerWindow(win);
  attachNotificationBridge(win.webContents, () => raiseProfile(profileId),
    { promptMedia: promptMediaPermission });
  applySoundMute();
  return win;
}

// --- Tabs path ---

function ensureShell() {
  if (shell && !shell.isDestroyed()) return shell;
  shell = createShell({ onClosed: () => {
    shell = null;
    viewsByProfile.clear();
    activeTabId = null;
    refreshAllMenus();
  }});

  shell.on('close', (event) => {
    if (isQuitting) return;
    const settings = loadSettings();
    if (settings.closeButton.behavior === 'quit') {
      event.preventDefault();
      quitApp();
      return;
    }
    event.preventDefault();
    const activeWc = activeTabId && viewsByProfile.get(activeTabId);
    if (activeWc && settings.minimize.escToDeselect) {
      deselectChat(activeWc.webContents);
    }
    const tray = getTray();
    if (tray) {
      shell.hide();
    } else {
      shell.setSkipTaskbar(false);
      shell.minimize();
    }
  });
  shell.on('minimize', () => {
    const activeView = activeTabId && viewsByProfile.get(activeTabId);
    if (activeView && loadSettings().minimize.escToDeselect) {
      deselectChat(activeView.webContents);
    }
  });
  shell.on('focus', () => refreshMenu());
  shell.on('resize', () => {
    const v = activeTabId && viewsByProfile.get(activeTabId);
    if (v) layoutActiveView(v);
  });

  // Wire tab-bar IPC to the shell's webContents only.
  const sid = shell.webContents.id;
  ipcMain.on('tabs-select', (e, id) => { if (e.sender.id === sid) setActiveTab(id); });
  ipcMain.on('tabs-new', (e) => { if (e.sender.id === sid) openProfileTabPicker(); });
  ipcMain.on('tabs-close', (e, id) => { if (e.sender.id === sid) closeTab(id); });

  return shell;
}

/** Position the active view below the tab-bar strip. */
function layoutActiveView(view) {
  const [w, h] = shell.getContentSize();
  view.setBounds({ x: 0, y: C.tabs.barHeight, width: w, height: Math.max(0, h - C.tabs.barHeight) });
}

function openTabInShell(profileId) {
  ensureShell();
  if (viewsByProfile.has(profileId)) {
    setActiveTab(profileId);
    return;
  }
  const view = createProfileView(profileId);
  viewsByProfile.set(profileId, view);
  attachNotificationBridge(view.webContents, () => raiseProfile(profileId),
    { promptMedia: promptMediaPermission });
  applySoundMute();
  setActiveTab(profileId);
}

function setActiveTab(profileId) {
  const view = viewsByProfile.get(profileId);
  if (!view) return;
  // Hide inactive views (remove from contentView; webContents stays alive).
  for (const [id, v] of viewsByProfile) {
    if (id !== profileId && !v.webContents.isDestroyed()) {
      shell.contentView.removeChildView(v);
    }
  }
  shell.contentView.addChildView(view);
  layoutActiveView(view);
  activeTabId = profileId;
  lastActiveProfileId = profileId;
  refreshMenu();
  sendTabsUpdate(shell, tabList(), activeTabId);
}

function closeTab(profileId) {
  const view = viewsByProfile.get(profileId);
  if (!view) return;
  if (!view.webContents.isDestroyed()) {
    shell.contentView.removeChildView(view);
    view.webContents.destroy();
  }
  viewsByProfile.delete(profileId);
  if (activeTabId === profileId) {
    const next = viewsByProfile.keys().next().value || null;
    activeTabId = null;
    if (next) setActiveTab(next);
    else sendTabsUpdate(shell, [], null);
  } else {
    sendTabsUpdate(shell, tabList(), activeTabId);
  }
  refreshAllMenus();
}

function tabList() {
  const profiles = loadProfiles();
  return profiles
    .filter((p) => viewsByProfile.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, isDefault: p.isDefault }));
}

// --- single entry points (layout-aware) ---

/**
 * Open a profile as a new tab/window per the current layout. The menu
 * "Open Profile…" (Ctrl+T) and the tray entry both call this.
 */
function openProfileTab(profileId) {
  if (layout() === 'tabs') {
    openTabInShell(profileId);
  } else {
    // switch + windows both open a BrowserWindow; switch hides others.
    switchToProfile(profileId);
  }
}

function openProfileTabPicker() {
  const parent = (layout() === 'tabs') ? shell : (BrowserWindow.getFocusedWindow() || null);
  pickProfile(parent).then((id) => { if (id) openProfileTab(id); });
}

/**
 * Switch to a profile per layout. switch: show + hide others. windows:
 * show + focus (no hide). tabs: setActiveTab (create if needed).
 */
function switchToProfile(profileId) {
  if (layout() === 'tabs') {
    ensureShell();
    if (!shell.isVisible()) shell.show();
    if (viewsByProfile.has(profileId)) {
      setActiveTab(profileId);
    } else {
      openTabInShell(profileId);
    }
    return;
  }
  const target = openProfile(profileId);
  lastActiveProfileId = profileId;
  if (layout() === 'switch') {
    for (const [id, win] of windowsByProfile) {
      if (id !== profileId && win && !win.isDestroyed() && win.isVisible()) {
        win.hide();
      }
    }
  }
  return target;
}

/** Restore the last-active profile — used by tray "Show" / second-instance. */
function showActiveProfile() {
  return switchToProfile(lastActiveProfileId);
}

/** Close a profile's window or tab (used by menu Delete). */
function closeProfile(profileId) {
  if (layout() === 'tabs') {
    closeTab(profileId);
  } else {
    const win = windowsByProfile.get(profileId);
    if (win && !win.isDestroyed()) {
      // Force close (bypass the hide-to-tray preventDefault).
      win.destroy();
    }
  }
}

// --- menu target helpers ---

function getActiveProfileId() {
  return lastActiveProfileId;
}
function getActiveWebContents() {
  if (layout() === 'tabs') {
    const v = activeTabId && viewsByProfile.get(activeTabId);
    return v ? v.webContents : null;
  }
  const win = BrowserWindow.getFocusedWindow();
  return win ? win.webContents : null;
}
function getActiveWindow() {
  if (layout() === 'tabs') return shell;
  return BrowserWindow.getFocusedWindow() || null;
}

function refreshAllMenus() {
  refreshMenu();
  refreshTrayMenu();
}

function quitApp() {
  isQuitting = true;
  destroyTray();
  app.quit();
}

/**
 * Apply the "sound off" setting to every live profile webContents.
 *
 * WhatsApp Web's incoming-message beep is in-page audio, not the OS
 * notification sound, so muting the page (webContents.setAudioMuted) is the
 * only reliable way to honor notifications.sound=false. Covers both layouts:
 * BrowserWindow-per-profile (switch/windows) and WebContentsView tabs.
 */
function applySoundMute() {
  const muted = loadSettings().notifications.sound === false;
  for (const win of windowsByProfile.values()) {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.setAudioMuted(muted);
    }
  }
  for (const v of viewsByProfile.values()) {
    if (v.webContents && !v.webContents.isDestroyed()) {
      v.webContents.setAudioMuted(muted);
    }
  }
}

/**
 * Best window to parent a settings dialog on: the focused window, else the
 * first live profile window, else null (app-modal).
 *
 * @returns {BrowserWindow | null}
 */
function getActiveProfileWindow() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  for (const win of windowsByProfile.values()) {
    if (win && !win.isDestroyed()) return win;
  }
  return null;
}

/**
 * Confirm before turning notification sound off — muting the page also
 * silences voice messages and call audio. Returns true to proceed.
 *
 * @param {BrowserWindow} [parent]
 * @returns {Promise<boolean>}
 */
async function confirmSoundOff(parent) {
  const { response } = await dialog.showMessageBox(parent || null, {
    type: 'warning',
    buttons: ['İptal', 'Sesi kapat'],
    defaultId: 0,
    cancelId: 0,
    title: 'Bildirim sesi',
    message: 'Bildirim sesi kapatılsın mı?',
    detail: 'Not: ses kapalıyken sesli mesajlar ve aramalar da duyulmaz (sayfanın tüm sesi kapatılır).',
  });
  return response === 1;
}

// --- IPC for the Settings window ---
ipcMain.handle('settings-get', () => ({
  settings: loadSettings(),
  profiles: loadProfiles(),
}));

/**
 * Did the media (mic/camera) permission block change between two settings
 * snapshots? Used to decide whether saving Settings should relaunch the app
 * so WhatsApp Web re-requests the device with the new allow/deny state.
 *
 * @param {object} [a]
 * @param {object} [b]
 * @returns {boolean}
 */
function mediaSettingsChanged(a, b) {
  a = a || {};
  b = b || {};
  return a.microphone !== b.microphone || a.camera !== b.camera;
}

ipcMain.handle('settings-save', (_event, s) => {
  const prev = loadSettings();
  try {
    saveSettings(s);
  } catch (err) {
    console.error(`[main] settings save failed: ${err.message}`);
    return false;
  }
  refreshAllMenus();
  // notifications.sound change must reach every open profile's page audio
  // live (no restart needed, unlike media). See applySoundMute.
  applySoundMute();
  // Media permission changes need WhatsApp Web to re-request the device,
  // which only happens on a fresh page/session. Relaunch the whole app so
  // the new state is applied reliably across every open profile. Other
  // settings (notifications, layout, …) already apply live, no restart.
  if (mediaSettingsChanged(prev.media, s && s.media)) {
    app.relaunch();
    app.exit(0);
  }
  return true;
});

// Confirm before muting page audio from the Settings window (sound true→false).
ipcMain.handle('settings-confirm-sound-off', async () =>
  confirmSoundOff(getActiveProfileWindow()));

// --- IPC for the profile picker ---
ipcMain.handle('profile-picker-get', () => loadProfiles());

function bootstrap() {
  openProfileTab(initialProfileId);
  applySoundMute();

  refreshMenu = installAppMenu({
    currentWindow: getActiveWindow,
    getActiveProfileId,
    getActiveWebContents,
    openProfileTabPicker,
    openSettingsWindow,
    onProfilesChanged: refreshAllMenus,
    closeProfile,
    quitApp,
    confirmSoundOff,
    applySoundMute,
  }).rebuildMenu;

  createTray(quitApp, showActiveProfile, {
    getProfiles: loadProfiles,
    switchProfile: switchToProfile,
    getActiveId: () => lastActiveProfileId,
    openPicker: openProfileTabPicker,
  });

  const primary = windowsByProfile.get(initialProfileId)
    || (layout() === 'tabs' ? shell : null);
  if (primary) {
    checkKeyringAndWarn(primary);
  }

  checkForUpdates();
  checkBrowserStaleness();
  syncDesktopFiles(loadProfiles(), app.getPath('exe'));
}

app.whenReady().then(bootstrap);

app.on('second-instance', (_event, argv) => {
  const match = argv.find((a) => a.startsWith('--profile='));
  if (match) {
    const id = match.split('=')[1];
    if (PROFILE_ID_RE.test(id)) {
      openProfileTab(id);
      return;
    }
  }
  showActiveProfile();
});

app.on('window-all-closed', (e) => {
  if (process.platform === 'darwin') return;
  // In tabs mode the shell is the only window; keep alive via tray.
  if (!isQuitting) {
    e.preventDefault();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !shell) {
    openProfileTab(initialProfileId);
  } else {
    showActiveProfile();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
});

module.exports = { openProfileTab, switchToProfile, windowsByProfile };