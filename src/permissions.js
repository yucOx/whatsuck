'use strict';

const { BrowserWindow } = require('electron');
const { loadSettings, saveSettings } = require('./settings');

/**
 * Session permission handlers — the single owner of
 * setPermissionRequestHandler / setPermissionCheckHandler for a session.
 *
 * Only one pair of handlers can be installed per session, so every
 * permission this app ever gates (notifications, media, …) must flow
 * through here. notifications.js delegates to this module and keeps only
 * the notification *event* bridge (wc.on('notification')).
 *
 * Media (microphone / camera) gating:
 *   - Per device, settings.media.<device> is null (undecided), true, or false.
 *   - The check handler returns the stored boolean; null reads as false,
 *     which makes Chromium issue a permission *request* — that is the path
 *     where we show the first-use Allow/Deny prompt (once per device).
 *   - After the prompt the answer is persisted, so it never repeats; the
 *     Settings window toggles override it live.
 *   - A media request may ask for both audio + video at once. The request
 *     callback grants only if EVERY requested device is allowed, so denying
 *     camera blocks a video call without silently enabling its mic half.
 */

// Sessions we've already installed handlers on, so re-attaching a
// notification bridge for a shared partition doesn't overwrite them.
const installedSessions = new WeakSet();

/** Map a Chromium mediaType to a settings.media key. null if unknown. */
function deviceKey(mediaType) {
  if (mediaType === 'audio') return 'microphone';
  if (mediaType === 'video') return 'camera';
  return null;
}

/** Synchronous per-type check: true only if the device is explicitly granted. */
function mediaTypeAllowed(mediaType) {
  const key = deviceKey(mediaType);
  if (!key) return false;
  return loadSettings().media[key] === true;
}

/**
 * Resolve a media permission request: prompt for any device whose setting is
 * still undecided, persist the answers, then grant only if every requested
 * device ended up allowed. Async — Electron tolerates a deferred callback.
 *
 * @param {Electron.WebContents} wc
 * @param {object} details - MediaAccessPermissionRequest (details.mediaTypes).
 * @param {Function} promptMedia - (parent, {device}) => Promise<boolean>.
 * @param {Function} callback - Permission request callback.
 */
async function resolveMedia(wc, details, promptMedia, callback) {
  const types = (details && Array.isArray(details.mediaTypes)) ? details.mediaTypes : [];
  const settings = loadSettings();
  const parent = BrowserWindow.fromWebContents(wc);

  for (const t of types) {
    const key = deviceKey(t);
    if (!key) continue;
    if (settings.media[key] === null || settings.media[key] === undefined) {
      let allow = false;
      if (typeof promptMedia === 'function') {
        try {
          allow = await promptMedia(parent, { device: key });
        } catch (err) {
          console.error(`[permissions] media prompt failed for ${key}: ${err.message}`);
          allow = false;
        }
      }
      settings.media[key] = !!allow;
      try {
        saveSettings(settings);
      } catch (err) {
        console.error(`[permissions] failed to persist media setting: ${err.message}`);
      }
    }
  }

  const granted = types.every((t) => {
    const key = deviceKey(t);
    return key ? settings.media[key] === true : false;
  });
  callback(granted);
}

/**
 * Install the unified permission handlers on a session (idempotent).
 *
 * @param {Electron.Session} session
 * @param {Function} [promptMedia] - Injected from main.js (media-prompt.js)
 *   to keep this module free of cross-feature imports. main.js is the only
 *   module allowed to import across feature modules.
 */
function installPermissionHandlers(session, promptMedia) {
  if (installedSessions.has(session)) return;
  installedSessions.add(session);

  session.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (permission === 'notifications') {
      return callback(loadSettings().notifications.enabled);
    }
    if (permission === 'media') {
      return resolveMedia(wc, details, promptMedia, callback);
    }
    return callback(false);
  });

  session.setPermissionCheckHandler((wc, permission, _requestingOrigin, details) => {
    if (permission === 'notifications') {
      return loadSettings().notifications.enabled;
    }
    if (permission === 'media') {
      return mediaTypeAllowed(details && details.mediaType);
    }
    return false;
  });
}

module.exports = { installPermissionHandlers };