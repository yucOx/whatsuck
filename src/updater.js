'use strict';

const { app, dialog, shell } = require('electron');
const https = require('https');
const C = require('./constants');

/**
 * Check GitHub releases for a newer version.
 *
 * Runs once on startup (non-blocking). If a newer version is found,
 * shows a dialog offering to open the release page. The user is never
 * forced to update — this is informational only.
 *
 * We compare against package.json version. The check is skipped when
 * running in development (`npm start`) to avoid noise.
 */
const GITHUB_REPO = 'yucOx/whatsuck';

async function fetchLatestVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'Whatsuck-Updater' },
      timeout: 8000,
    };

    const req = https.get(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            tag: json.tag_name || null,
            url: json.html_url || null,
            error: null,
          });
        } catch {
          resolve({ tag: null, url: null, error: 'parse_error' });
        }
      });
    });

    req.on('error', () => resolve({ tag: null, url: null, error: 'network' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ tag: null, url: null, error: 'timeout' });
    });
  });
}

/**
 * Compare semver strings. Returns true if `remote` > `local`.
 */
function isNewer(remote, local) {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates(mainWindow) {
  // Skip update checks during development.
  if (!app.isPackaged) {
    return;
  }

  const result = await fetchLatestVersion();

  if (result.error || !result.tag) {
    // Silent fail — don't nag the user about network issues.
    return;
  }

  const currentVersion = app.getVersion();

  if (isNewer(result.tag, currentVersion)) {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: `${C.productName}: update available`,
      message: `Version ${result.tag} is available (you have ${currentVersion}).`,
      detail:
        'Download the new .deb from the release page and install it ' +
        'with: sudo dpkg -i whatsuck_*.deb',
      buttons: ['Download', 'Skip'],
      defaultId: 0,
      cancelId: 1,
    });

    if (choice === 0 && result.url) {
      shell.openExternal(result.url);
    }
  }
}

module.exports = { checkForUpdates };