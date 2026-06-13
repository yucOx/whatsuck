'use strict';

const { BrowserWindow, session } = require('electron');
const C = require('./constants');

// WhatsApp Web rejects browsers whose User-Agent doesn't look like
// Chrome 85+.  Electron's default string includes "Electron/35.7.5"
// which triggers the "works with Google Chrome 85+" gate.
//
// We spoof a standard Linux Chrome UA at two levels:
//   1. session.defaultSession.webRequest  – catches every sub-resource request
//   2. webContents.setUserAgent            – covers the top-level navigation
//
// Both are necessary: WhatsApp's initial HTML page and its service-worker
// both inspect the UA independently.

const CHROME_UA = [
  'Mozilla/5.0 (X11; Linux x86_64)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  `Chrome/${process.versions.chrome}.0.0.0`,
  'Safari/537.36',
].join(' ');

/**
 * Create the main browser window pointed at WhatsApp Web.
 *
 * @param {object} [options]
 * @param {Function} [options.onClosed]  - Callback when window closes.
 * @returns {BrowserWindow}
 */
function createMainWindow({ onClosed } = {}) {
  // Patch every outgoing request from the default session to carry
  // a Chrome-like UA.  This covers XHR / fetch / service-worker loads
  // that don't inherit the webContents-level override.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

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

  // Also set the webContents-level UA so the initial navigation
  // and any JS inspection of navigator.userAgent see Chrome.
  win.webContents.setUserAgent(CHROME_UA);

  win.loadURL(C.whatsAppUrl);

  // Show once the page has finished painting — avoids white flash.
  win.once('ready-to-show', () => win.show());

  win.on('closed', () => {
    if (onClosed) onClosed();
  });

  return win;
}

module.exports = { createMainWindow };