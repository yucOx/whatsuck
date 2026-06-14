'use strict';

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

/**
 * Modal text input dialog.
 *
 * Electron's dialog module has no native text input. This is a small
 * modal BrowserWindow that uses a preload script for IPC instead of
 * nodeIntegration. The renderer runs in a strict context — it can
 * only call the two channels we explicitly expose (submit / cancel)
 * and it cannot reach Node.js APIs directly.
 *
 * Resolves with the entered string on OK, or null on cancel / close.
 */
function promptInput(parent, { title, label, defaultValue = '', confirmLabel = 'OK' } = {}) {
  return new Promise((resolve) => {
    const dialog = new BrowserWindow({
      width: 380,
      height: 180,
      parent: parent || undefined,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: title || 'Input',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        // Strict isolation. The renderer is fully sandboxed and has
        // no access to Node.js, ipcRenderer, or any other Electron
        // API beyond what we explicitly expose via the preload.
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'profile-dialog-preload.js'),
        // No webview, no remote, no insecure content.
        webviewTag: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    // Receive the result via a one-shot ipc listener.
    // The preload identifies itself with its own webContents.id so
    // we don't accept answers from any other window.
    const dialogWebContentsId = dialog.webContents.id;

    const onResult = (event, value) => {
      if (event.sender.id !== dialogWebContentsId) {
        // Foreign IPC — drop it. Defence in depth.
        return;
      }
      ipcMain.removeListener('profile-dialog-result', onResult);
      resolve(typeof value === 'string' && value.trim() ? value.trim() : null);
      if (!dialog.isDestroyed()) dialog.close();
    };
    ipcMain.once('profile-dialog-result', onResult);

    dialog.on('closed', () => {
      ipcMain.removeListener('profile-dialog-result', onResult);
      // If closed without sending a result, treat as cancel.
      resolve(null);
    });

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #1e1e1e; color: #eee; }
  label { display: block; font-size: 12px; margin-bottom: 6px; opacity: 0.8; }
  input { width: 100%; box-sizing: border-box; padding: 8px; font-size: 14px;
          background: #2a2a2a; color: #eee; border: 1px solid #444; border-radius: 4px; }
  input:focus { outline: none; border-color: #25d366; }
  .buttons { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 6px 14px; font-size: 13px; cursor: pointer; border-radius: 4px;
           border: 1px solid #555; background: #2a2a2a; color: #eee; }
  button.primary { background: #25d366; border-color: #25d366; color: #000; font-weight: 500; }
  button:hover { filter: brightness(1.1); }
</style></head><body>
  <label id="lbl"></label>
  <input id="inp" type="text" autocomplete="off" spellcheck="false" />
  <div class="buttons">
    <button id="cancel">Cancel</button>
    <button id="ok" class="primary"></button>
  </div>
  <script>
    const lbl = document.getElementById('lbl');
    const inp = document.getElementById('inp');
    const ok = document.getElementById('ok');
    const cancel = document.getElementById('cancel');
    lbl.textContent = ${JSON.stringify(label || '')};
    ok.textContent = ${JSON.stringify(confirmLabel)};
    inp.value = ${JSON.stringify(defaultValue)};
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    function submit(val) { window.dialog.submit(val); }
    ok.addEventListener('click', () => submit(inp.value));
    cancel.addEventListener('click', () => submit(null));
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit(inp.value);
      else if (e.key === 'Escape') submit(null);
    });
  </script>
</body></html>`;

    dialog.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    dialog.show();
  });
}

module.exports = { promptInput };