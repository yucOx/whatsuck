'use strict';

const { app, dialog, BrowserWindow } = require('electron');
const C = require('./constants');

/**
 * Auto-update via electron-updater.
 *
 * Reads the latest release from GitHub, downloads the new .deb in the
 * background, and prompts the user to install. The user is in control —
 * they confirm before anything is replaced.
 *
 * electron-updater uses `app-update.yml` which electron-builder
 * embeds in the .deb at build time. The publish config in
 * package.json points it at the GitHub releases.
 *
 * Security: the GitHub provider uses HTTPS + downloads a signed
 * releases.json (or latest-linux.yml) that includes SHA512 hashes
 * for each artifact. electron-updater verifies the hash of the
 * downloaded .deb against this manifest before installing. A
 * network attacker cannot inject a different binary.
 *
 * Skipped during `npm start` (`app.isPackaged === false`).
 */

// Lazy-load so dev mode (where electron-updater isn't strictly needed)
// doesn't blow up if something in its chain isn't fully ready.
let autoUpdater = null;
function getUpdater() {
  if (autoUpdater) return autoUpdater;
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  return autoUpdater;
}

/**
 * Run the update flow. Safe to call once on app start.
 *
 * @returns {Promise<void>}
 */
async function checkForUpdates() {
  if (!app.isPackaged) {
    return;
  }

  let updater;
  try {
    updater = getUpdater();
  } catch (err) {
    // No releases published yet, or network unreachable on first run.
    return;
  }

  // Wire up event handlers.
  updater.removeAllListeners();

  updater.on('update-available', (info) => {
    // Notification in a window that the user can act on later.
    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    dialog.showMessageBox(parent, {
      type: 'info',
      title: `${C.productName}: update available`,
      message: `Version ${info.version} is downloading…`,
      detail:
        'The update will install automatically the next time you quit ' +
        `${C.productName}. Or use File → Quit Now.`,
      buttons: ['OK'],
    });
  });

  updater.on('update-downloaded', (info) => {
    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const choice = dialog.showMessageBoxSync(parent, {
      type: 'info',
      title: `${C.productName}: update ready`,
      message: `Version ${info.version} has been downloaded.`,
      detail:
        'Restart now to install, or choose "Later" to install the next ' +
        'time you quit the app.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (choice === 0) {
      // Close all windows cleanly first to avoid Electron's
      // "destroyed" race during quitAndInstall on Linux.
      BrowserWindow.getAllWindows().forEach((w) => {
        if (!w.isDestroyed()) w.destroy();
      });
      // The updater installs the downloaded .deb on the next
      // process exit (autoInstallOnAppQuit is true).
      app.exit(0);
    }
  });

  updater.on('error', () => {
    // Silent: don't nag the user about transient network or release
    // config issues. Updates are a convenience, not a critical path.
  });

  try {
    await updater.checkForUpdates();
  } catch {
    // Silent. Same reason as above.
  }
}

module.exports = { checkForUpdates };