'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const C = require('./constants');

/**
 * System tray integration.
 *
 * On Linux the tray is unreliable (GNOME Wayland, missing
 * AppIndicator extension). If Tray creation fails we return
 * null and main.js falls back to minimize-to-dock behavior.
 */

let tray = null;

function focusExistingWindows() {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length === 0) return;

  for (const win of wins) {
    if (win.isDestroyed()) continue;
    // show() before restore/focus — a hidden window can't be focused.
    if (!win.isVisible()) win.show();
    if (win.isMinimized()) win.restore();
  }

  // Steal focus to the last window. The user clicked a button
  // (tray, launcher, notification) — they want the app in front.
  const last = wins[wins.length - 1];
  if (!last.isDestroyed()) {
    last.focus();
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

function createTray(quitFn) {
  if (tray) return tray;

  let image;
  try {
    image = nativeImage.createFromPath(C.iconPath);
    if (image.isEmpty()) throw new Error('icon empty');
    image = image.resize({ width: 22, height: 22, quality: 'best' });
  } catch {
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