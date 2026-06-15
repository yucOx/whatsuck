'use strict';

const { Notification, app } = require('electron');
const path = require('path');
const C = require('./constants');
const { loadSettings } = require('./settings');

/**
 * Native notification bridge for WhatsApp Web.
 *
 * WhatsApp Web runs in a regular BrowserWindow, so its in-page
 * `Notification` API calls do NOT reach the OS notification daemon
 * automatically. We intercept two events on the page's webContents:
 *
 *   1. `permissionrequest`  – the page calls
 *      `Notification.requestPermission()`. We auto-grant it.
 *   2. `notification`       – the page fires a Notification. We re-emit
 *      it as a native Notification, so libnotify / the desktop shell
 *      (Unity, GNOME Shell, KDE, etc.) can show a proper toast with
 *      the app's own icon and our entry in the notification list.
 *
 * Clicking a notification focuses the main window. This matches
 * user expectations from a native chat app.
 *
 * The notification listener is removed on window close to avoid
 * accumulating listeners across window lifecycles.
 *
 * User settings (in settings.json) control:
 *   - notifications.enabled: false = don't show OS notifications at all
 *   - notifications.sound:    false = show toast but silent
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
 * Render and show one native notification, then wire its click
 * handler to focus the main window.
 */
function showNativeNotification(payload, mainWindow, settings) {
  if (!Notification.isSupported()) {
    return;
  }

  const { title = C.productName, body = '', icon } = payload;

  const opts = {
    title,
    body,
    icon: icon && icon.startsWith('data:') ? icon : C.iconPath,
    // Respect the user's sound preference. If sound is off, the
    // notification still appears but silently.
    silent: !settings.notifications.sound,
  };

  const notification = new Notification(opts);

  notification.on('click', () => {
    if (!mainWindow.isDestroyed()) {
      // If the window is hidden (e.g. user closed it to tray),
      // show it first. focus() on a hidden window does nothing.
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

module.exports = { attachNotificationBridge };