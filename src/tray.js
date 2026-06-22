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
let trayArgs = null;

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

function buildContextMenu(quitFn, showFn, opts) {
  const { getProfiles, switchProfile, getActiveId } = opts || {};
  const items = [
    {
      label: 'Show',
      click: () => (showFn ? showFn() : focusExistingWindows()),
    },
    { type: 'separator' },
  ];

  if (typeof getProfiles === 'function' && typeof switchProfile === 'function') {
    const activeId = typeof getActiveId === 'function' ? getActiveId() : null;
    for (const p of getProfiles()) {
      items.push({
        label: p.name + (p.isDefault ? ' (default)' : ''),
        type: 'radio',
        checked: p.id === activeId,
        click: () => switchProfile(p.id),
      });
    }
    items.push({ type: 'separator' });
  }

  items.push({
    label: 'Quit',
    click: () => quitFn(),
  });
  return Menu.buildFromTemplate(items);
}

function createTray(quitFn, showFn, opts) {
  if (tray) return tray;
  trayArgs = { quitFn, showFn, opts };

  let image;
  try {
    image = nativeImage.createFromPath(C.iconPath);
    if (image.isEmpty()) throw new Error('icon empty');
    image = image.resize({ width: 22, height: 22, quality: 'best' });
  } catch {
    console.log('[tray] icon unavailable, tray disabled');
    return null;
  }

  const onClick = () => (showFn ? showFn() : focusExistingWindows());
  try {
    tray = new Tray(image);
    tray.setToolTip(C.productName);
    tray.setContextMenu(buildContextMenu(quitFn, showFn, opts));
    tray.on('click', onClick);
    tray.on('double-click', onClick);
    console.log('[tray] system tray created');
    return tray;
  } catch (err) {
    console.log(`[tray] failed: ${err.message}, tray disabled`);
    tray = null;
    return null;
  }
}

/**
 * Rebuild the tray context menu from fresh profile data. Call after
 * profile create/rename/delete/pin so the per-profile list stays
 * current. No args — reuses what createTray was given.
 */
function refreshTrayMenu() {
  if (!tray || !trayArgs) return;
  tray.setContextMenu(
    buildContextMenu(trayArgs.quitFn, trayArgs.showFn, trayArgs.opts)
  );
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  trayArgs = null;
}

module.exports = {
  createTray,
  destroyTray,
  refreshTrayMenu,
  focusExistingWindows,
  getTray: () => tray,
};