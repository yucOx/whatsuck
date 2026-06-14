'use strict';

const { app, dialog, BrowserWindow, shell } = require('electron');
const https = require('https');
const C = require('./constants');

/**
 * Chromium staleness check.
 *
 * Electron bundles a specific Chromium version. Unlike a regular
 * Chrome install, the bundled browser does NOT auto-update — it
 * only updates when the maintainer bumps the Electron dependency
 * in package.json and publishes a new app release.
 *
 * This check queries the Chrome for Testing JSON feed (the
 * authoritative source for stable Chrome versions) and compares
 * it against the bundled Chromium. If we're more than one major
 * version behind, we surface a one-time notice. The user can
 * dismiss it; it's informational, not blocking.
 *
 * Skipped in dev mode.
 */

function bundledMajor() {
  const v = process.versions.chrome || '0.0.0';
  return parseInt(v.split('.')[0], 10) || 0;
}

function fetchLatestChromeMajor() {
  return new Promise((resolve) => {
    const req = https.get(
      C.security.chromeVersionsFeed,
      { timeout: 6000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const stable = json.channels && json.channels.stable;
            if (!stable || !stable.version) return resolve(null);
            return resolve(parseInt(stable.version.split('.')[0], 10));
          } catch {
            return resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Check whether the bundled Chromium is significantly behind the
 * latest stable Chrome, and notify the user if so. Runs once on
 * startup. Silent on network errors.
 *
 * @returns {Promise<void>}
 */
async function checkBrowserStaleness() {
  if (!app.isPackaged) return;

  const bundled = bundledMajor();
  if (!bundled) return;

  const latest = await fetchLatestChromeMajor();
  if (!latest) return; // Silent on network issues.

  if (latest - bundled >= C.browser.stalenessThresholdMajor) {
    const parent =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const choice = dialog.showMessageBoxSync(parent, {
      type: 'warning',
      title: `${C.productName}: bundled browser is outdated`,
      message: `This build ships Chromium ${bundled}. The latest stable Chrome is ${latest}.`,
      detail:
        'Electron bundles its own browser engine and does not auto-update ' +
        'between app releases. A newer version of this app will include ' +
        'a more recent Chromium. Check the project repository for updates ' +
        'or open the releases page.',
      buttons: ['View releases', 'Dismiss'],
      defaultId: 0,
      cancelId: 1,
    });

    if (choice === 0) {
      shell.openExternal('https://github.com/yucOx/whatsuck/releases');
    }
  }
}

module.exports = { checkBrowserStaleness };