'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the media permission prompt (mic / camera Allow-Deny modal).
 *
 * Runs in an isolated world with contextIsolation=true. Exposes a minimal
 * `dialog` API on the window for the inlined HTML to call. The renderer has
 * no other access to Node.js or ipcRenderer.
 */
contextBridge.exposeInMainWorld('dialog', {
  /**
   * @param {boolean|null} value - true = Allow, false/null = Deny.
   */
  submit: (value) => {
    ipcRenderer.send('media-prompt-result', value);
  },
});