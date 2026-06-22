'use strict';

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * Tabbed shell window.
 *
 * One BrowserWindow whose own webContents renders a thin tab-bar strip
 * at the top. Each open profile is a WebContentsView child added to the
 * shell's contentView and bounded below the strip. The shell keeps the
 * application menu, the close-to-tray behavior, and tray integration.
 *
 * IPC channels (handled by the caller via the returned hook registrations):
 *   - 'tabs-select'  → (event, id)   switch active tab
 *   - 'tabs-new'     → (event)       open the profile picker
 *   - 'tabs-close'   → (event, id)   close a tab
 * The main process pushes the tab list with `sendTabsUpdate(shell, ...)`.
 *
 * @param {object} [opts]
 * @param {Function} [opts.onClosed] - fired once when the shell window
 *   closes (so main can drop its references).
 * @returns {BrowserWindow}
 */
function createShell({ onClosed } = {}) {
  const shell = new BrowserWindow({
    width: C.window.defaultWidth,
    height: C.window.defaultHeight,
    minWidth: C.window.minWidth,
    minHeight: C.window.minHeight,
    title: C.productName,
    icon: C.iconPath,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'tabs-shell-preload.js'),
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; height: ${C.tabs.barHeight}px;
               background: #1b2a23; overflow: hidden; }
  body { display: flex; align-items: stretch; font-family: system-ui, sans-serif;
         color: #eee; user-select: none; }
  .tabs { display: flex; flex: 1; align-items: stretch; overflow-x: auto; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 0 12px;
         font-size: 12px; cursor: pointer; border-right: 1px solid #243329;
         max-width: 180px; white-space: nowrap; opacity: .75; }
  .tab.active { background: #0c7a4d; opacity: 1; }
  .tab .x { opacity: .5; font-size: 13px; padding: 0 2px; }
  .tab .x:hover { opacity: 1; }
  .add { padding: 0 14px; display: flex; align-items: center; cursor: pointer;
         font-size: 16px; opacity: .6; }
  .add:hover { opacity: 1; background: #243329; }
</style></head><body>
  <div class="tabs" id="tabs"></div>
  <div class="add" id="add" title="Open profile">+</div>
  <script>
    const el = document.getElementById('tabs');
    let tabs = []; let activeId = null;
    window.tabs.onUpdate((payload) => {
      tabs = payload.tabs; activeId = payload.activeId; render();
    });
    function render() {
      el.innerHTML = '';
      tabs.forEach((t) => {
        const d = document.createElement('div');
        d.className = 'tab' + (t.id === activeId ? ' active' : '');
        d.innerHTML =
          '<span>' + t.name + (t.isDefault ? ' (d)' : '') + '</span>' +
          '<span class="x" title="Close tab">×</span>';
        d.addEventListener('click', (e) => {
          if (e.target.classList.contains('x')) window.tabs.close(t.id);
          else window.tabs.select(t.id);
        });
        el.appendChild(d);
      });
    }
    document.getElementById('add').addEventListener('click', () => window.tabs.new());
  </script>
</body></html>`;

  shell.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  shell.once('ready-to-show', () => shell.show());
  shell.on('closed', () => { if (onClosed) onClosed(); });
  return shell;
}

/**
 * Push the current tab list + active id to the shell's tab bar.
 *
 * @param {BrowserWindow} shell
 * @param {Array<{id:string,name:string,isDefault:boolean}>} tabs
 * @param {string|null} activeId
 */
function sendTabsUpdate(shell, tabs, activeId) {
  if (!shell || shell.isDestroyed()) return;
  shell.webContents.send('tabs-update', { tabs, activeId });
}

module.exports = { createShell, sendTabsUpdate };