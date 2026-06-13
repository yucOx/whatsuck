'use strict';

const { Notification, app } = require('electron');
const path = require('path');
const C = require('./constants');

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
 */
function attachNotificationBridge(mainWindow) {
  // Auto-grant the `notifications` permission for the WhatsApp origin.
  // Returning `true` from the handler accepts the request.
  const session = mainWindow.webContents.session;

  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      return callback(true);
    }
    // Default-deny everything else. Returning false here is safer
    // than calling callback(false) directly when the permission
    // is unknown to us.
    return callback(false);
  });

  // Also pre-grant the permission state on the Permission API so the
  // page sees `Notification.permission === 'granted'` without a
  // prompt round-trip.
  session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'notifications';
  });

  // Bridge in-page Notification → native Notification.
  mainWindow.webContents.on('notification', (_event, payload) => {
    showNativeNotification(payload, mainWindow);
  });
}

/**
 * Render and show one native notification, then wire its click
 * handler to focus the main window.
 */
function showNativeNotification(payload, mainWindow) {
  if (!Notification.isSupported()) {
    return;
  }

  const { title = C.productName, body = '', icon } = payload;

  const opts = {
    title,
    body,
    // The app icon doubles as the notification icon. WhatsApp Web
    // sometimes supplies a data: URL avatar in `payload.icon` — that
    // works too, but falls back to ours if absent.
    icon: icon && icon.startsWith('data:') ? icon : C.iconPath,
    silent: false,
  };

  const notification = new Notification(opts);

  notification.on('click', () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  notification.show();
}

module.exports = { attachNotificationBridge };