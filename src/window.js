'use strict';

const { BrowserWindow } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * Create the main browser window pointed at WhatsApp Web.
 *
 * @param {object} [options]
 * @param {Function} [options.onClosed]  - Callback when window closes.
 * @returns {BrowserWindow}
 */
function createMainWindow({ onClosed } = {}) {
  const win = new BrowserWindow({
    width: C.window.defaultWidth,
    height: C.window.defaultHeight,
    minWidth: C.window.minWidth,
    minHeight: C.window.minHeight,
    title: C.productName,
    icon: C.iconPath,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadURL(C.whatsAppUrl);

  // Show once the page has finished painting — avoids white flash.
  win.once('ready-to-show', () => win.show());

  win.on('closed', () => {
    if (onClosed) onClosed();
  });

  return win;
}

module.exports = { createMainWindow };