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

/**
 * Build and install the application menu with a Profiles section.
 *
 * @param {object} options
 * @param {Function} options.currentWindow  - Returns the focused BrowserWindow.
 * @param {Function} options.openProfile    - Opens a new window for a profile.
 */
function installAppMenu({ currentWindow, openProfile } = {}) {
  function rebuildMenu() {
    const win = currentWindow ? currentWindow() : null;
    const currentProfileId = win ? win._profileId : 'default';
    const profiles = loadProfiles();
    const current = profiles.find(p => p.id === currentProfileId) || profiles[0];

    // --- Profiles menu ---
    const profileItems = profiles.map((p) => ({
      label: p.name + (p.isDefault ? ' (default)' : ''),
      type: 'radio',
      checked: p.id === currentProfileId,
      click: () => {
        if (p.id !== currentProfileId && openProfile) {
          openProfile(p.id);
        }
      },
    }));

    const profilesMenu = {
      label: 'Profiles',
      submenu: [
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
            const profile = createProfile(name);
            // Also generate a .desktop file if the user is on a packaged app.
            if (app.isPackaged) {
              generateDesktopFile(profile, app.getPath('exe'));
            }
            rebuildMenu();
            if (openProfile) openProfile(profile.id);
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
            // Refresh the .desktop file with the new name if pinned.
            if (current.isPinned && app.isPackaged) {
              const updated = loadProfiles().find(p => p.id === currentProfileId);
              if (updated) generateDesktopFile(updated, app.getPath('exe'));
            }
            rebuildMenu();
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
            const remaining = deleteProfile(currentProfileId);
            removeDesktopFile(current);
            // Close the window for the deleted profile.
            if (win && !win.isDestroyed()) win.close();
            rebuildMenu();
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
            rebuildMenu();
          },
        },
      ],
    };

    // --- Standard menus ---
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Window',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              if (openProfile) openProfile(currentProfileId);
            },
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => win && win.webContents.reload(),
          },
          { type: 'separator' },
          { role: 'quit' },
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
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => win && win.webContents.toggleDevTools(),
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