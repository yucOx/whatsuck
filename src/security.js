'use strict';

const { app, safeStorage, dialog, shell } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * OS keyring integration.
 *
 * On Linux, Chromium's cookie storage can be encrypted with a key
 * held in libsecret / GNOME Keyring / KWallet. This prevents
 * someone with raw disk access from reading the session token.
 *
 * Electron's safeStorage API reports whether a backend is available:
 *   - 'basic_text'        : no keyring, encryption is a no-op
 *   - 'gnome_libsecret'   : real keyring backing
 *   - 'kwallet'           : KDE wallet
 *   - 'kwallet5'/'kwallet6': KDE wallet variants
 *
 * We surface a one-time warning when the backend is unsafe, and
 * offer to open a help page. The user is never blocked.
 */
function checkKeyringAndWarn(mainWindow) {
  // safeStorage isn't available until the app is ready and on macOS
  // we already have Keychain so the check is informational only.
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: `${C.productName}: session encryption unavailable`,
      message: 'No system keyring detected (libsecret / GNOME Keyring).',
      detail:
        'Your WhatsApp session cookies will be stored in PLAIN TEXT ' +
        'on disk. Anyone with raw access (e.g. a stolen laptop, or ' +
        '`sudo` on this machine) could read your session and impersonate ' +
        'your WhatsApp account.\n\n' +
        'Recommended: install gnome-keyring or enable full-disk ' +
        'encryption (LUKS). This app will still run either way.',
      buttons: ['Run anyway (unsafe)', 'Open help', 'Quit'],
      defaultId: 0,
      cancelId: 0,
    });

    if (choice === 1) {
      shell.openExternal(
        'https://gitlab.gnome.org/GNOME/gnome-keyring/-/wikis/home'
      );
    } else if (choice === 2) {
      app.quit();
    }
    // Choice 0 (Run anyway) falls through and the app continues.
  }
}

module.exports = { checkKeyringAndWarn };