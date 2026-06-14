'use strict';

/**
 * Application-wide constants.
 * Centralized so config tweaks don't require hunting through modules.
 */

const path = require('path');

module.exports = Object.freeze({
  // App identity
  appId: 'com.whatsuck.app',
  productName: 'Whatsuck',
  desktopName: 'whatsuck',

  // Target
  whatsAppUrl: 'https://web.whatsapp.com',

  // Window
  window: {
    defaultWidth: 1280,
    defaultHeight: 800,
    minWidth: 600,
    minHeight: 400,
  },

  // Assets (resolved relative to project root)
  iconPath: path.join(__dirname, '..', 'assets', 'icon.png'),

  // Chromium switches
  // --no-sandbox is required when running as a non-root user without
  // the SUID chrome-sandbox helper (typical for AppImage/deb installs
  // where the sandbox can't be re-mounted with setuid).
  //
  // --disable-dev-shm-usage  — /dev/shm is too small or locked down on
  // some Linux setups (containers, restricted environments). Tells
  // Chromium to fall back to /tmp for shared memory. Adds a perf cost
  // on render-heavy pages but avoids the FATAL startup crash.
  cliSwitches: ['--no-sandbox', '--disable-dev-shm-usage'],
});
