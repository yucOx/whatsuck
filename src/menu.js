'use strict';

const { Menu } = require('electron');

/**
 * Build and install the application menu.
 *
 * @param {object} options
 * @param {Function} options.currentWindow  - Returns the focused BrowserWindow.
 */
function installAppMenu({ currentWindow } = {}) {
  function rebuildMenu() {
    const win = currentWindow ? currentWindow() : null;

    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => win && win.webContents.reload(),
          },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
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