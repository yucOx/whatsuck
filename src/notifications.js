'use strict';

const { Notification, app } = require('electron');
const path = require('path');
const C = require('./constants');
const { loadSettings } = require('./settings');

/**
 * Native notification bridge for WhatsApp Web.
 *
 * Always uses Electron's Notification API so we can attach a click
 * handler that brings the window to front. For the "sound off"
 * setting, we pass silent: true — on most Linux desktops this
 * suppresses the notification sound. On systems where libnotify
 * ignores silent, the user should mute notification sounds at the
 * OS level.
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
  const onNotification = (event, payload) => {
    // Suppress the renderer's own native notification. Without this,
    // Electron displays WhatsApp's Notification regardless of our
    // settings, so "Notifications Enabled: off" had no effect, and
    // the auto-shown popup carried no click handler (issue: clicking
    // it sometimes did nothing). We take over display entirely.
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

    showNativeNotification(payload, mainWindow, settings);
  };

  mainWindow.webContents.on('notification', onNotification);
  mainWindow.once('closed', () => {
    mainWindow.webContents.removeListener('notification', onNotification);
  });
}

/**
 * Show a native notification with a click handler that focuses
 * the main window, even if it's hidden or minimized.
 */
function showNativeNotification(payload, mainWindow, settings) {
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
    if (mainWindow.isDestroyed()) return;

    // Order matters: focus() on a hidden window is a no-op, so
    // restore/show first. moveTop() forces a raise on Linux where
    // focus() alone can be blocked by focus-stealing prevention.
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setSkipTaskbar(false);
    mainWindow.moveTop();
    mainWindow.focus();
  });

  notification.show();
}

module.exports = { attachNotificationBridge };