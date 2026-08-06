'use strict';

const { Menu, dialog, app } = require('electron');
const {
  loadProfiles,
  saveProfiles,
  createProfile,
  deleteProfile,
  renameProfile,
  setDefault,
} = require('./profiles');
const { generateDesktopFile, removeDesktopFile } = require('./desktop');
const { promptInput } = require('./profile-dialog');
const { loadSettings, saveSettings } = require('./settings');

const LAYOUTS = ['switch', 'tabs', 'windows'];

/**
 * Build and install the application menu with a Profiles section.
 *
 * @param {object} options
 * @param {Function} options.currentWindow      - Returns the focused BrowserWindow (or the tabbed shell).
 * @param {Function} options.getActiveProfileId - Returns the active profile id.
 * @param {Function} options.getActiveWebContents - Returns the active profile's webContents.
 * @param {Function} options.switchToProfile    - Layout-aware profile switch/open.
 * @param {Function} options.openProfileTabPicker - Opens the profile picker.
 * @param {Function} options.openSettingsWindow - Opens the Settings window.
 * @param {Function} options.onProfilesChanged  - Rebuild app menu + tray.
 * @param {Function} options.closeProfile       - Close a profile's window/tab.
 * @param {Function} options.quitApp            - Quit the app.
 */
function installAppMenu({
  currentWindow, getActiveProfileId, getActiveWebContents,
  switchToProfile, openProfileTabPicker, openSettingsWindow,
  onProfilesChanged, closeProfile, quitApp,
} = {}) {
  const profilesChanged = () => {
    if (onProfilesChanged) onProfilesChanged();
    else rebuildMenu();
  };

  function rebuildMenu() {
    const win = currentWindow ? currentWindow() : null;
    const currentProfileId = getActiveProfileId ? getActiveProfileId() : 'default';
    const profiles = loadProfiles();
    const current = profiles.find(p => p.id === currentProfileId) || profiles[0];

    // --- Profiles menu ---
    const profileItems = profiles.map((p) => ({
      label: p.name + (p.isDefault ? ' (default)' : ''),
      type: 'radio',
      checked: p.id === currentProfileId,
      click: () => {
        if (p.id !== currentProfileId && switchToProfile) {
          switchToProfile(p.id);
          rebuildMenu();
        }
      },
    }));

    const profilesMenu = {
      label: 'Profiles',
      submenu: [
        {
          label: 'Open Profile…',
          accelerator: 'CmdOrCtrl+T',
          click: () => { if (openProfileTabPicker) openProfileTabPicker(); },
        },
        { type: 'separator' },
        ...profileItems,
        { type: 'separator' },
        {
          label: 'New Profile…',
          click: async () => {
            const name = await promptInput(win, {
              title: 'New Profile',
              label: 'Profile name:',
              confirmLabel: 'Create',
            });
            if (!name) return;
            try {
              const profile = createProfile(name);
              if (app.isPackaged) {
                generateDesktopFile(profile, app.getPath('exe'));
              }
              profilesChanged();
              if (switchToProfile) switchToProfile(profile.id);
            } catch (err) {
              dialog.showErrorBox(
                'Could not create profile',
                `${err.message}\n\nTry again with a different name.`
              );
            }
          },
        },
        {
          label: 'Rename…',
          click: async () => {
            const newName = await promptInput(win, {
              title: 'Rename Profile',
              label: `Rename "${current.name}" to:`,
              defaultValue: current.name,
              confirmLabel: 'Rename',
            });
            if (!newName || newName === current.name) return;
            renameProfile(currentProfileId, newName);
            if (current.isPinned && app.isPackaged) {
              const updated = loadProfiles().find(p => p.id === currentProfileId);
              if (updated) generateDesktopFile(updated, app.getPath('exe'));
            }
            profilesChanged();
          },
        },
        {
          label: 'Delete',
          enabled: profiles.length > 1,
          click: () => {
            const choice = dialog.showMessageBoxSync(win, {
              type: 'question',
              title: 'Delete Profile',
              message: `Delete "${current.name}"?`,
              detail:
                'This will permanently erase the session data (cookies, cached messages) ' +
                'for this profile. This cannot be undone.',
              buttons: ['Delete', 'Cancel'],
              defaultId: 1,
              cancelId: 1,
            });
            if (choice !== 0) return;
            deleteProfile(currentProfileId);
            removeDesktopFile(current);
            // Close the profile's window/tab (layout-aware).
            if (closeProfile) closeProfile(currentProfileId);
            profilesChanged();
          },
        },
        { type: 'separator' },
        {
          label: 'Set as Default',
          checked: current.isDefault,
          type: 'checkbox',
          click: () => {
            setDefault(currentProfileId);
            rebuildMenu();
          },
        },
        {
          label: 'Pin to Desktop',
          checked: current.isPinned,
          type: 'checkbox',
          click: () => {
            const profiles = loadProfiles();
            const p = profiles.find(x => x.id === currentProfileId);
            if (!p) return;
            const nowPinned = !p.isPinned;
            p.isPinned = nowPinned;
            saveProfiles(profiles);
            if (nowPinned && app.isPackaged) {
              generateDesktopFile(p, app.getPath('exe'));
            } else {
              removeDesktopFile(p);
            }
            profilesChanged();
          },
        },
      ],
    };

    const layout = loadSettings().ui.layout;
    const layoutItems = LAYOUTS.map((mode) => ({
      label: { switch: 'Switch (one visible)', tabs: 'Tabs (one window)', windows: 'Windows (side by side)' }[mode],
      type: 'radio',
      checked: layout === mode,
      click: () => {
        const s = loadSettings();
        s.ui.layout = mode;
        saveSettings(s);
        rebuildMenu();
      },
    }));

    // --- Standard menus ---
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Profile…',
            accelerator: 'CmdOrCtrl+N',
            click: () => { if (openProfileTabPicker) openProfileTabPicker(); },
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              const wc = getActiveWebContents && getActiveWebContents();
              if (wc && !wc.isDestroyed()) wc.reload();
            },
          },
          { type: 'separator' },
          {
            label: 'Hide to Tray',
            click: () => win && win.hide(),
          },
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              if (quitApp) quitApp();
              else app.quit();
            },
          },
        ],
      },
      profilesMenu,
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Menu Bar',
            type: 'checkbox',
            checked: true,
            click: (item, focusedWindow) => {
              if (!focusedWindow) return;
              const show = !item.checked;
              focusedWindow.setMenuBarVisibility(show);
              focusedWindow.autoHideMenuBar = !show;
            },
          },
          { type: 'separator' },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              const wc = getActiveWebContents && getActiveWebContents();
              if (wc && !wc.isDestroyed()) wc.toggleDevTools();
            },
          },
        ],
      },
      {
        label: 'Settings',
        submenu: [
          {
            label: 'Open Settings…',
            click: () => { if (openSettingsWindow) openSettingsWindow(win); },
          },
          { type: 'separator' },
          {
            label: 'Layout',
            submenu: layoutItems,
          },
          {
            label: 'Notifications Enabled',
            type: 'checkbox',
            checked: loadSettings().notifications.enabled,
            click: (item) => {
              const s = loadSettings();
              s.notifications.enabled = item.checked;
              saveSettings(s);
              rebuildMenu();
            },
          },
          {
            label: 'Notification Sound',
            type: 'checkbox',
            checked: loadSettings().notifications.sound,
            enabled: loadSettings().notifications.enabled,
            click: (item) => {
              const s = loadSettings();
              s.notifications.sound = item.checked;
              saveSettings(s);
              rebuildMenu();
            },
          },
          {
            label: 'Esc on Minimize',
            type: 'checkbox',
            checked: loadSettings().minimize.escToDeselect,
            click: (item) => {
              const s = loadSettings();
              s.minimize.escToDeselect = item.checked;
              saveSettings(s);
            },
          },
          {
            label: 'Close Button Quits',
            type: 'checkbox',
            checked: loadSettings().closeButton.behavior === 'quit',
            click: (item) => {
              const s = loadSettings();
              s.closeButton.behavior = item.checked ? 'quit' : 'hideToTray';
              saveSettings(s);
            },
          },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  rebuildMenu();
  return { rebuildMenu };
}

module.exports = { installAppMenu };