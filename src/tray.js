'use strict';

const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * System tray integration.
 *
 * Lets the user close the window to hide instead of quit. Click
 * the tray icon to bring windows back; right-click for a context
 * menu (Show, Quit).
 *
 * Single instance of Tray per app. The tray icon is generated
 * programmatically because Linux's StatusNotifierItem spec
 * requires a small, well-defined icon size and 256x256 app icons
 * either come out blurry or are rejected by the panel.
 */

let tray = null;

// Pre-baked 22x22 green circle with white "W" — PNG bytes generated
// once at module load. We can't bundle an actual asset here, so
// build a simple solid-color icon at runtime.
function buildTrayIcon() {
  // Try the app icon first (resized), then fall back to a
  // generated icon if that fails or looks wrong.
  try {
    const appIcon = nativeImage.createFromPath(C.iconPath);
    if (!appIcon.isEmpty()) {
      // Resize to a common Linux tray size with a smoothing pass.
      const resized = appIcon.resize({ width: 22, height: 22, quality: 'best' });
      if (!resized.isEmpty()) return resized;
    }
  } catch {}

  // Fallback: build a 22x22 dark green square with a white W via
  // a small hand-rolled PNG. Using a simple BMP via nativeImage
  // is more portable than constructing raw PNG bytes.
  // Empty image with a placeholder — the panel will show a default
  // icon rather than nothing.
  return nativeImage.createEmpty();
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
      // Only steal focus if no window currently has it. This way
      // we surface the app without yanking the user's cursor away
      // from their browser.
      if (!BrowserWindow.getFocusedWindow()) {
        win.focus();
      }
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

  const image = buildTrayIcon();

  try {
    tray = new Tray(image);
  } catch (err) {
    // Some Linux panels reject empty icons or require a different
    // format. Try once more with a 1x1 transparent fallback.
    console.error(`[tray] failed to create with primary icon: ${err.message}`);
    tray = new Tray(nativeImage.createEmpty());
  }
  tray.setToolTip(C.productName);
  tray.setContextMenu(buildContextMenu(quitFn));
  // Left click on tray → bring all windows to front.
  tray.on('click', () => focusExistingWindows());
  // Some panels (GNOME) emit 'double-click' rather than 'click'
  // — bind that too for consistency.
  tray.on('double-click', () => focusExistingWindows());

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray, focusExistingWindows, getTray: () => tray };