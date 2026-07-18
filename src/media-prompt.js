'use strict';

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * Modal Allow/Deny prompt for a single media device (microphone or camera).
 *
 * Mirrors the profile-dialog pattern: a modal BrowserWindow with a preload
 * script (no nodeIntegration), inlined HTML, and a one-shot IPC result. The
 * renderer is sandboxed and can only call the single `dialog.submit()` we
 * expose via media-prompt-preload.js.
 *
 * Used by permissions.js the first time WhatsApp Web requests a media device
 * whose setting is still undecided (null). The answer is persisted to
 * settings.json so the prompt never repeats.
 *
 * @param {BrowserWindow} [parent] - Owner window for modal parenting.
 * @param {object} opts
 * @param {'microphone'|'camera'} opts.device - Which device is being asked for.
 * @returns {Promise<boolean>} true on Allow, false on Deny / dismiss.
 */
function promptMediaPermission(parent, { device } = {}) {
  return new Promise((resolve) => {
    const label = device === 'camera'
      ? C.media.labels.camera
      : C.media.labels.microphone;

    const dialog = new BrowserWindow({
      width: C.dialog.width,
      height: C.dialog.height,
      parent: parent || undefined,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Medya izni',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        // Strict isolation. The renderer is fully sandboxed and has no
        // access to Node.js, ipcRenderer, or any other Electron API beyond
        // what we explicitly expose via the preload.
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'media-prompt-preload.js'),
        webviewTag: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    const dialogWebContentsId = dialog.webContents.id;

    const onResult = (event, value) => {
      if (event.sender.id !== dialogWebContentsId) {
        // Foreign IPC — drop it. Defence in depth.
        return;
      }
      ipcMain.removeListener('media-prompt-result', onResult);
      resolve(value === true);
      if (!dialog.isDestroyed()) dialog.close();
    };
    ipcMain.on('media-prompt-result', onResult);

    dialog.on('closed', () => {
      ipcMain.removeListener('media-prompt-result', onResult);
      // Closed without an explicit choice — treat as Deny.
      resolve(false);
    });

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #1e1e1e; color: #eee; }
  label { display: block; font-size: 13px; margin-bottom: 14px; line-height: 1.4; }
  .buttons { display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 7px 16px; font-size: 13px; cursor: pointer; border-radius: 4px;
           border: 1px solid #555; background: #2a2a2a; color: #eee; }
  button.primary { background: #25d366; border-color: #25d366; color: #000; font-weight: 500; }
  button:hover { filter: brightness(1.1); }
</style></head><body>
  <label id="lbl"></label>
  <div class="buttons">
    <button id="deny">Reddet</button>
    <button id="allow" class="primary">İzin ver</button>
  </div>
  <script>
    const lbl = document.getElementById('lbl');
    const allow = document.getElementById('allow');
    const deny = document.getElementById('deny');
    lbl.textContent = ${JSON.stringify(`Whatsuck'in ${label} kullanmasına izin verilsin mi?`)};
    allow.addEventListener('click', () => window.dialog.submit(true));
    deny.addEventListener('click', () => window.dialog.submit(false));
    allow.focus();
  </script>
</body></html>`;

    dialog.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    dialog.show();
  });
}

module.exports = { promptMediaPermission };