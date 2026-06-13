'use strict';

const { app, BrowserWindow } = require('electron');

const C = require('./constants');
const { createMainWindow } = require('./window');
const { installAppMenu } = require('./menu');
const { attachNotificationBridge } = require('./notifications');

let mainWindow = null;

/**
 * Single entry point for window setup. The notification bridge is
 * attached AFTER the window is created so it can bind to its
 * webContents and session.
 */
function bootstrap() {
  mainWindow = createMainWindow({
    onClosed: () => {
      mainWindow = null;
    },
  });

  attachNotificationBridge(mainWindow);

  installAppMenu({
    onReload: () => mainWindow && mainWindow.webContents.reload(),
    onToggleDevTools: () =>
      mainWindow && mainWindow.webContents.toggleDevTools(),
  });
}

// Apply CLI switches before app is ready.
for (const sw of C.cliSwitches) {
  app.commandLine.appendSwitch(sw);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // Standard desktop behavior: quit when all windows close,
  // except on macOS where apps stay in the dock.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS dock-click re-creates the window if none are open.
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});