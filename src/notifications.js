'use strict';

const { Notification } = require('electron');
const C = require('./constants');
const { loadSettings } = require('./settings');
const { installPermissionHandlers } = require('./permissions');

/**
 * Native notification bridge for WhatsApp Web.
 *
 * Attaches to a single WebContents (a profile window's webContents, or
 * a WebContentsView's webContents in tabs mode) and its session. The
 * click handler calls `onRaise`, supplied by the caller, which knows
 * how to surface the right window/tab for that profile.
 *
 * Session permission handlers (notifications + media) are installed once
 * per session via permissions.installPermissionHandlers; this function
 * keeps only the notification *event* bridge (wc.on('notification')).
 *
 * For "sound off" we pass silent: true — best-effort on Linux, where
 * the notification sound is often desktop-environment-controlled.
 *
 * @param {Electron.WebContents} wc - The profile's webContents.
 * @param {Function} onRaise - Called on notification click to surface
 *   the profile's window/tab (no args).
 * @param {object} [opts]
 * @param {Function} [opts.promptMedia] - Injected media permission prompter
 *   (media-prompt.js). Forwarded to installPermissionHandlers.
 */
function attachNotificationBridge(wc, onRaise, opts = {}) {
  const ses = wc.session;

  // Install the unified session permission handlers (notifications + media).
  // Idempotent per session; safe to call again for a shared partition.
  installPermissionHandlers(ses, opts.promptMedia);

  let lastNotificationTime = 0;
  const onNotification = (event, payload) => {
    // Suppress the renderer's own native notification so we fully
    // control whether/with-what-options a notification shows.
    event.preventDefault();

    const settings = loadSettings();

    // Master switch — user can turn off all OS notifications.
    if (!settings.notifications.enabled) {
      return;
    }

    const now = Date.now();
    const cooldown =
      Number.isFinite(settings.notifications.cooldownMs)
        ? settings.notifications.cooldownMs
        : C.notifications.cooldownMs;
    if (now - lastNotificationTime < cooldown) {
      return; // throttled
    }
    lastNotificationTime = now;

    showNativeNotification(payload, settings, onRaise);
  };

  wc.on('notification', onNotification);
  wc.once('destroyed', () => {
    wc.removeListener('notification', onNotification);
  });
}

/**
 * Show a native notification with a click handler that calls onRaise
 * to surface the profile's window/tab, even if it's hidden/minimized.
 */
function showNativeNotification(payload, settings, onRaise) {
  if (!Notification.isSupported()) {
    return;
  }

  const { title = C.productName, body = '', icon } = payload;
  const soundOff = settings && settings.notifications && settings.notifications.sound === false;

  const opts = {
    title,
    body,
    icon: icon && icon.startsWith('data:') ? icon : C.iconPath,
    silent: soundOff,
  };

  const notification = new Notification(opts);

  notification.on('click', () => {
    if (typeof onRaise === 'function') onRaise();
  });

  notification.show();
}

module.exports = { attachNotificationBridge };