'use strict';

const { BrowserWindow, WebContentsView, session, shell } = require('electron');
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

// Sessions we've already installed the UA-spoof webRequest on, so we
// don't re-register it per view sharing the same partition.
const configuredSessions = new WeakSet();

/**
 * @param {string} profileId
 * @returns {Electron.Session} defaultSession for 'default', else
 *   session.fromPartition('persist:<id>').
 */
function profileSession(profileId) {
  if (profileId === 'default') return session.defaultSession;
  return session.fromPartition(`persist:${profileId}`);
}

/**
 * Install the UA spoof on the profile's session (idempotent) and
 * return the webPreferences object a BrowserWindow / WebContentsView
 * should use for this profile.
 *
 * @param {string} profileId
 * @returns {object} webPreferences
 */
function profileWebPrefs(profileId) {
  const isDefault = profileId === 'default';
  const ses = profileSession(profileId);
  if (!configuredSessions.has(ses)) {
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = CHROME_UA;
      callback({ requestHeaders: details.requestHeaders });
    });
    configuredSessions.add(ses);
  }
  const prefs = {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webviewTag: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
  };
  if (!isDefault) prefs.partition = `persist:${profileId}`;
  return prefs;
}

// External link handling — only http(s) to non-WhatsApp hosts leave the
// app via xdg-open; everything else stays in-app. Shared by the
// BrowserWindow and WebContentsView paths.
function attachExternalLinkHandlers(wc, profileId) {
  const isExternal = (url) => {
    try {
      const u = new URL(url);
      return (u.protocol === 'http:' || u.protocol === 'https:')
          && u.host !== 'web.whatsapp.com';
    } catch {
      return true;
    }
  };

  // Same-origin popups (WhatsApp opens voice/video calls in a new window).
  // Allow those so calls work; about:blank is the bootstrap URL WhatsApp
  // sometimes opens before navigating to the call UI.
  const isWhatsAppOrigin = (url) => {
    if (url === 'about:blank') return true;
    try {
      const u = new URL(url);
      return (u.protocol === 'http:' || u.protocol === 'https:')
          && (u.host === 'web.whatsapp.com' || u.host.endsWith('.whatsapp.com'));
    } catch {
      return false;
    }
  };

  wc.on('will-navigate', (event, url) => {
    if (isExternal(url)) {
      event.preventDefault();
      try { shell.openExternal(url); } catch {}
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    if (isWhatsAppOrigin(url)) {
      // Electron 14+ popups inherit NO window options from the parent, so
      // pass our strict webPreferences explicitly (sandbox, no node, the
      // profile's partition) plus a clean, icon'd, menu-less frame.
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: C.productName,
          icon: C.iconPath,
          autoHideMenuBar: true,
          webPreferences: profileWebPrefs(profileId),
        },
      };
    }
    if (isExternal(url)) {
      try { shell.openExternal(url); } catch {}
    }
    return { action: 'deny' };
  });

  // The call popup shares the profile's session, so the media/notifications
  // permission handlers already apply. Re-attach the link guard so a call
  // window can't navigate the app off-site or spawn unguarded popups.
  wc.on('did-create-window', (childWin) => {
    attachExternalLinkHandlers(childWin.webContents, profileId);
  });
}

/**
 * Load WhatsApp Web into a webContents, spoof its UA, and install the
 * external-link interceptors. Used by both the BrowserWindow factory
 * (switch/windows modes) and the WebContentsView factory (tabs mode).
 *
 * @param {Electron.WebContents} wc
 */
function loadWhatsApp(wc, profileId) {
  wc.setUserAgent(CHROME_UA);
  attachExternalLinkHandlers(wc, profileId);
  wc.loadURL(C.whatsAppUrl);
}

/**
 * Create a browser window pointed at WhatsApp Web.
 *
 * @param {object} [options]
 * @param {string} [options.profileId='default']
 * @param {Function} [options.onClosed]
 * @returns {BrowserWindow}
 */
function createMainWindow({ profileId = 'default', onClosed } = {}) {
  const win = new BrowserWindow({
    width: C.window.defaultWidth,
    height: C.window.defaultHeight,
    minWidth: C.window.minWidth,
    minHeight: C.window.minHeight,
    title: C.productName,
    icon: C.iconPath,
    show: false,
    webPreferences: profileWebPrefs(profileId),
  });
  win._profileId = profileId;
  loadWhatsApp(win.webContents, profileId);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { if (onClosed) onClosed(); });
  return win;
}

/**
 * Create a WebContentsView for a profile (tabs mode). Loads WhatsApp
 * Web with the profile's partition and the same strict webPrefs as
 * the BrowserWindow path.
 *
 * @param {string} profileId
 * @returns {WebContentsView}
 */
function createProfileView(profileId) {
  const view = new WebContentsView({ webPreferences: profileWebPrefs(profileId) });
  view._profileId = profileId;
  loadWhatsApp(view.webContents, profileId);
  return view;
}

module.exports = { createMainWindow, createProfileView };