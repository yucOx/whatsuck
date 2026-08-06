'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the Settings window.
 *
 * Runs in an isolated world with contextIsolation=true. Exposes a
 * minimal `settings` API on the window: get the current settings +
 * profile list, and save a settings object back. The renderer has no
 * other access to Node.js or ipcRenderer.
 */
contextBridge.exposeInMainWorld('settings', {
  /**
   * @returns {Promise<{settings: object, profiles: Array}>}
   */
  get: () => ipcRenderer.invoke('settings-get'),
  /**
   * @param {object} settings
   * @returns {Promise<boolean>} true on success
   */
  save: (settings) => ipcRenderer.invoke('settings-save', settings),
  /**
   * Confirm before turning sound off (mutes page audio incl. calls).
   * @returns {Promise<boolean>} true to proceed.
   */
  confirmSoundOff: () => ipcRenderer.invoke('settings-confirm-sound-off'),
});