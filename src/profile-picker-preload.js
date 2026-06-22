'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the profile picker dialog.
 *
 * Isolated world + contextIsolation. Exposes a minimal `picker` API:
 * fetch the profile list, and report the user's selection back to the
 * main process. The renderer has no other access to Node.js.
 */
contextBridge.exposeInMainWorld('picker', {
  /**
   * @returns {Promise<Array<{id:string,name:string,isDefault:boolean}>>}
   */
  list: () => ipcRenderer.invoke('profile-picker-get'),
  /**
   * @param {string|null} profileId - chosen id, '__new__' to create, or null to cancel
   */
  select: (profileId) => ipcRenderer.send('profile-picker-select', profileId),
});