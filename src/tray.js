'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * System tray integration.
 *
 * Lets the user close the window to hide instead of quit. Click
 * the tray icon to bring windows back; right-click for a context
 * menu (Show, Quit).
 *
 * Single instance of Tray per app. The tray icon uses the same
 * icon as the app, scaled down for the system tray size.
 */

let tray = null;

function trayIconPath() {
  return C.iconPath;
}

function focusExistingWindows() {
  // Bring all live windows to the front. We do NOT open new windows
  // — the user might be focused on another app and we don't want
  // to steal focus aggressively. We just unhide the existing ones.
  const wins = BrowserWindow.getAllWindows();
  for (const win of wins) {
    if (!win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
    }
  }
}

function buildContextMenu(quitFn) {
  return Menu.buildFromTemplate([
    {
      label: 'Show Whatsuck',
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
  if (tray) return tray; // singleton

  let image;
  try {
    image = nativeImage.createFromPath(trayIconPath());
    if (image.isEmpty()) throw new Error('empty');
  } catch {
    // If the icon is missing, fall back to a tiny empty image so
    // the tray still registers. Users get a default icon.
    image = nativeImage.createEmpty();
  }
  // Resize to 22x22 which is a common tray size; nativeImage
  // handles upscaling if needed.
  if (!image.isEmpty()) {
    image = image.resize({ width: 22, height: 22 });
  }

  tray = new Tray(image);
  tray.setToolTip(C.productName);
  tray.setContextMenu(buildContextMenu(quitFn));
  // Left click on tray → bring all windows to front.
  tray.on('click', () => focusExistingWindows());

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray, focusExistingWindows, getTray: () => tray };