'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * User settings store.
 *
 * Lives in <userData>/settings.json. Currently holds notification
 * preferences; future per-user knobs (window position, theme, etc.)
 * can land here without inventing a new file.
 */

const DEFAULTS = Object.freeze({
  notifications: {
    // Master switch — false means don't show OS notifications at all.
    enabled: true,
    // Play a sound with each notification.
    sound: true,
    // Min ms between two native notifications. Stops a page from
    // flooding the OS notification daemon. Mirrors the default in
    // constants.js so the constant remains the single source of the
    // default value; this is the user-overridable copy.
    cooldownMs: 1000,
  },
  // Which profile opens on launch. 'default' or an existing profile id.
  // CLI `--profile=<id>` always wins over this when present.
  startup: {
    profileId: 'default',
  },
  // Send Esc to the WhatsApp page on minimize/hide so the open
  // conversation is deselected (user doesn't appear "in" a chat).
  minimize: {
    escToDeselect: true,
  },
  // What the window close (X) button does.
  //   'hideToTray' — hide to tray / minimize (keeps app alive).
  //   'quit'       — actually quit the app.
  closeButton: {
    behavior: 'hideToTray',
  },
});

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
      && target[key] && typeof target[key] === 'object'
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * Load settings from disk, falling back to defaults on missing or
 * corrupted file. Bad settings are backed up like profiles.js does.
 *
 * @returns {object} Settings object (always fully populated).
 */
function loadSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  try {
    const text = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(text);
    return deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), parsed);
  } catch (err) {
    const backup = `${p}.broken.${Date.now()}`;
    try { fs.renameSync(p, backup); } catch {}
    console.error(`[settings] corrupted, backed up to ${backup}: ${err.message}`);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

/**
 * Save settings atomically (write .tmp, rename).
 *
 * @param {object} settings
 * @throws {Error} if the write fails.
 */
function saveSettings(settings) {
  const p = settingsPath();
  const tmp = p + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8');
    fs.renameSync(tmp, p);
  } catch (err) {
    throw new Error(`Failed to save settings.json: ${err.message}`);
  }
}

module.exports = {
  loadSettings,
  saveSettings,
  DEFAULTS,
};