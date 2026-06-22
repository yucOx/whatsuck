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

  // Chromium switches (passed WITHOUT the -- prefix to appendSwitch).
  //
  // no-sandbox — required when running as a non-root user without the
  // SUID chrome-sandbox helper. Common for AppImage/deb installs.
  //
  // disable-dev-shm-usage — /dev/shm can be too small or restricted
  // (containers, user-quota'd mounts) for Chromium's shared memory
  // segments. Redirects shared memory to /tmp.
  cliSwitches: ['no-sandbox', 'disable-dev-shm-usage'],

  // Profile dialog dimensions
  dialog: {
    width: 380,
    height: 180,
  },

  // Settings window dimensions
  settingsWindow: {
    width: 520,
    height: 480,
  },

  // Notification bridge
  notifications: {
    // Throttle: min ms between two native notifications. Stops a
    // compromised page from flooding the OS notification daemon.
    cooldownMs: 1000,
  },

  // Tabbed shell (ui.layout === 'tabs')
  tabs: {
    // Height of the tab-bar strip rendered by the shell's webContents.
    barHeight: 36,
  },

  // Browser staleness check
  browser: {
    // Warn when bundled Chromium is this many major versions behind
    // the latest stable Chrome.
    stalenessThresholdMajor: 2,
  },

  // Update checker
  updater: {
    // Network timeout for the GitHub releases API request.
    timeoutMs: 8000,
  },

  // Security: Chromium version check feed
  security: {
    chromeVersionsFeed:
      'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json',
  },
});
