'use strict';

const { Menu } = require('electron');

/**
 * Build and install the application menu.
 *
 * WhatsApp Web brings its own in-page context menu, so the app-level
 * menu is kept minimal — just window/edit/dev roles and a useful
 * toggle for DevTools.
 */
function installAppMenu({ onToggleDevTools, onReload } = {}) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => onReload && onReload(),
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
          click: () => onToggleDevTools && onToggleDevTools(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { installAppMenu };
