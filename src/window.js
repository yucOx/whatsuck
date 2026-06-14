'use strict';

const { BrowserWindow, session } = require('electron');
const C = require('./constants');

// WhatsApp Web rejects browsers whose User-Agent doesn't look like
// Chrome 85+.  Electron's default string includes "Electron/..."
// which triggers the "works with Google Chrome 85+" gate.
//
// We spoof a standard Linux Chrome UA at two levels:
//   1. per-session webRequest  – catches every sub-resource request
//   2. webContents.setUserAgent – covers the top-level navigation
//
// Both are necessary: WhatsApp's initial HTML page and its
// service-worker both inspect the UA independently.

const CHROME_UA = [
  'Mozilla/5.0 (X11; Linux x86_64)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  `Chrome/${process.versions.chrome}.0.0.0`,
  'Safari/537.36',
].join(' ');

/**
 * Create a browser window pointed at WhatsApp Web.
 *
 * @param {object} [options]
 * @param {string} [options.profileId='default'] - Profile to load.
 *   'default' uses session.defaultSession (backward compat).
 *   Any other id uses session.fromPartition('persist:<id>').
 * @param {Function} [options.onClosed] - Callback when window closes.
 * @returns {BrowserWindow}
 */
function createMainWindow({ profileId = 'default', onClosed } = {}) {
  // Choose session: default profile keeps backward compat with
  // session.defaultSession; other profiles get isolated partitions.
  const isDefault = profileId === 'default';
  const partitionName = isDefault ? undefined : `persist:${profileId}`;
  const ses = isDefault
    ? session.defaultSession
    : session.fromPartition(partitionName);

  // Spoof UA on this profile's session so every request (including
  // service-worker loads) carries the Chrome string.
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

  const webPrefs = {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  };

  // Non-default profiles need an explicit partition key so the
  // BrowserWindow uses the right session from creation time.
  if (!isDefault) {
    webPrefs.partition = partitionName;
  }

  const win = new BrowserWindow({
    width: C.window.defaultWidth,
    height: C.window.defaultHeight,
    minWidth: C.window.minWidth,
    minHeight: C.window.minHeight,
    title: C.productName,
    icon: C.iconPath,
    autoHideMenuBar: true,
    show: false,
    webPreferences: webPrefs,
  });

  // Top-level navigation and navigator.userAgent must see Chrome too.
  win.webContents.setUserAgent(CHROME_UA);

  // Tag the window with its profile id so the menu and main process
  // can look up which profile this window belongs to.
  win._profileId = profileId;

  win.loadURL(C.whatsAppUrl);

  // Show once the page has finished painting — avoids white flash.
  win.once('ready-to-show', () => win.show());

  win.on('closed', () => {
    if (onClosed) onClosed();
  });

  return win;
}

module.exports = { createMainWindow };