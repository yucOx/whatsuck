'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const C = require('./constants');

/**
 * System tray integration.
 *
 * On Linux (GNOME/KDE), tray icons are unreliable:
 * - GNOME 41+ needs the AppIndicator extension
 * - Wayland sessions often don't render tray icons
 * - Some panels ignore nativeImage.createFromPath
 *
 * We try to create the tray, but if it fails we fall back to
 * "minimize to dock" behavior. The caller (main.js) checks
 * getTray() — if null, close = quit instead of hide.
 */

let tray = null;

function focusExistingWindows() {
  const wins = BrowserWindow.getAllWindows();
  for (const win of wins) {
    if (!win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
    }
  }
  // Steal focus so the user sees the window immediately.
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused && wins.length > 0) {
    const last = wins[wins.length - 1];
    if (!last.isDestroyed()) last.focus();
  }
}

function buildContextMenu(quitFn) {
  return Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => focusExistingWindows(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => quitFn(),
    },
  ]);
}

/**
 * Try to create a system tray icon. Returns the Tray on success,
 * or null if the tray isn't available (common on GNOME Wayland).
 */
function createTray(quitFn) {
  if (tray) return tray;

  let image;
  try {
    image = nativeImage.createFromPath(C.iconPath);
    if (image.isEmpty()) throw new Error('icon empty');
    image = image.resize({ width: 22, height: 22, quality: 'best' });
  } catch {
    // Can't load or resize the icon — tray won't work on this system.
    console.log('[tray] icon unavailable, tray disabled');
    return null;
  }

  try {
    tray = new Tray(image);
    tray.setToolTip(C.productName);
    tray.setContextMenu(buildContextMenu(quitFn));
    tray.on('click', () => focusExistingWindows());
    tray.on('double-click', () => focusExistingWindows());
    console.log('[tray] system tray created');
    return tray;
  } catch (err) {
    console.log(`[tray] failed: ${err.message}, tray disabled`);
    tray = null;
    return null;
  }
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray, focusExistingWindows, getTray: () => tray };