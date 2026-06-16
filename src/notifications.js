'use strict';

const { Notification, app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const C = require('./constants');
const { loadSettings } = require('./settings');

/**
 * Native notification bridge for WhatsApp Web.
 *
 * WhatsApp Web runs in a regular BrowserWindow, so its in-page
 * `Notification` API calls do NOT reach the OS notification daemon
 * automatically. We intercept two events on the page's webContents:
 *
 *   1. `permissionrequest`  – auto-grant notifications
 *   2. `notification`       – re-emit as a native notification
 *
 * Clicking a notification focuses the main window.
 *
 * On Linux, Electron's Notification.silent is ignored by libnotify.
 * When sound is disabled, we fall back to `notify-send` with
 * --hint=int:transient:1 and --urgency=low to suppress the sound.
 */
function attachNotificationBridge(mainWindow) {
  const session = mainWindow.webContents.session;

  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      return callback(true);
    }
    return callback(false);
  });

  session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'notifications';
  });

  let lastNotificationTime = 0;
  const onNotification = (_event, payload) => {
    const settings = loadSettings();

    // Master switch — user can turn off all OS notifications.
    if (!settings.notifications.enabled) {
      return;
    }

    const now = Date.now();
    if (now - lastNotificationTime < C.notifications.cooldownMs) {
      return; // throttled
    }
    lastNotificationTime = now;

    showNativeNotification(payload, mainWindow, settings);
  };

  mainWindow.webContents.on('notification', onNotification);
  mainWindow.once('closed', () => {
    mainWindow.webContents.removeListener('notification', onNotification);
  });
}

/**
 * Show a native notification. On Linux, if sound is disabled,
 * we use notify-send with --urgency=low to suppress the sound.
 * Otherwise we use Electron's Notification API.
 */
function showNativeNotification(payload, mainWindow, settings) {
  const { title = C.productName, body = '', icon } = payload;
  const iconPath = icon && icon.startsWith('data:') ? icon : C.iconPath;

  const soundOff = settings && settings.notifications && settings.notifications.sound === false;

  // On Linux, Notification.silent is often ignored by libnotify.
  // When sound is off, use notify-send with --urgency=low which
  // typically suppresses the notification sound.
  if (soundOff && process.platform === 'linux') {
    showViaNotifySend(title, body, iconPath, mainWindow);
    return;
  }

  // Fallback: Electron's Notification API (works well on macOS/Windows,
  // and on Linux when sound is enabled).
  if (!Notification.isSupported()) {
    // Last resort: try notify-send even for the sound-on case.
    showViaNotifySend(title, body, iconPath, mainWindow);
    return;
  }

  const opts = {
    title,
    body,
    icon: iconPath,
    silent: soundOff,
  };

  const notification = new Notification(opts);

  notification.on('click', () => {
    if (!mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  notification.show();
}

/**
 * Send a notification via notify-send (Linux). This gives us control
 * over urgency and sound that Electron's Notification API lacks.
 */
function showViaNotifySend(title, body, iconPath, mainWindow) {
  const args = [
    // --urgency=low: most desktop environments don't play a sound
    // for low-urgency notifications.
    '--urgency=low',
    // --hint=int:transient:1: auto-dismiss after a few seconds
    // so it doesn't linger in the notification center.
    '--hint=int:transient:1',
  ];

  if (iconPath && !iconPath.startsWith('data:')) {
    args.push(`--icon=${iconPath}`);
  }

  args.push(title);
  // notify-send treats the second positional arg as the body.
  // If body is empty, just pass the title.
  if (body) {
    args.push(body);
  }

  execFile('notify-send', args, (err) => {
    // If notify-send isn't installed, silently fail — the user
    // has bigger problems (no notification daemon).
    if (err) {
      console.log(`[notifications] notify-send failed: ${err.message}`);
    }
  });

  // We can't attach a click handler to notify-send from Node.
  // The user will have to click the window manually. This is
  // acceptable for the "sound off" case since the notification
  // auto-dismisses anyway.
}

module.exports = { attachNotificationBridge };