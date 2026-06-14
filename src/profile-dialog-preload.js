'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the profile dialog.
 *
 * Runs in an isolated world with contextIsolation=true. Exposes a
 * minimal `dialog` API on the window for the inlined HTML to call.
 * The renderer has no other access to Node.js or ipcRenderer.
 */
contextBridge.exposeInMainWorld('dialog', {
  submit: (value) => {
    ipcRenderer.send('profile-dialog-result', value);
  },
});