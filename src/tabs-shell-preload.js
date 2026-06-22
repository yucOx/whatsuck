'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the tabbed shell's tab-bar strip.
 *
 * Isolated world + contextIsolation. Exposes a minimal `tabs` API so
 * the inlined tab-bar HTML can receive the tab list and report
 * select / new / close actions. No other Node.js access.
 */
contextBridge.exposeInMainWorld('tabs', {
  /**
   * @param {(payload: {tabs: Array, activeId: string|null}) => void} cb
   */
  onUpdate: (cb) => ipcRenderer.on('tabs-update', (_e, payload) => cb(payload)),
  /** @param {string} id */
  select: (id) => ipcRenderer.send('tabs-select', id),
  new: () => ipcRenderer.send('tabs-new'),
  /** @param {string} id */
  close: (id) => ipcRenderer.send('tabs-close', id),
});