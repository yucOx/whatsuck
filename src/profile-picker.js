'use strict';

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * Modal profile picker.
 *
 * Lists existing profiles as a radio list plus a "New profile…" row.
 * Resolves with the chosen profile id, or with a freshly-created
 * profile's id (when the user picks "New profile…" and enters a name),
 * or null on cancel/close. Mirrors the profile-dialog security model:
 * modal BrowserWindow + preload + contextBridge, strict webPrefs, no
 * nodeIntegration.
 *
 * @param {BrowserWindow} [parent]
 * @returns {Promise<string|null>} profile id, or null
 */
function pickProfile(parent) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 360,
      height: 400,
      parent: parent || undefined,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Open Profile',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'profile-picker-preload.js'),
        webviewTag: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('profile-picker-select', onSelect);
      resolve(val);
      if (!win.isDestroyed()) win.close();
    };

    const pickerId = win.webContents.id;
    const onSelect = (event, choice) => {
      // Defence in depth: only accept selections from this picker.
      if (event.sender.id !== pickerId) return;
      if (choice === '__new__') {
        // Defer to the text-input dialog; chain back through finish().
        const { promptInput } = require('./profile-dialog');
        promptInput(parent, {
          title: 'New Profile',
          label: 'Profile name:',
          confirmLabel: 'Create',
        }).then((name) => {
          if (!name) {
            // Cancelled naming — back to the picker, don't close it.
            return;
          }
          try {
            const { createProfile } = require('./profiles');
            finish(createProfile(name).id);
          } catch (err) {
            const { dialog } = require('electron');
            dialog.showErrorBox(
              'Could not create profile',
              `${err.message}\n\nTry again with a different name.`
            );
          }
        });
        return;
      }
      finish(typeof choice === 'string' ? choice : null);
    };
    ipcMain.on('profile-picker-select', onSelect);

    win.on('closed', () => finish(null));

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 14px;
         background: #1e1e1e; color: #eee; display: flex; flex-direction: column;
         height: 100vh; box-sizing: border-box; }
  h1 { font-size: 13px; margin: 0 0 10px; font-weight: 600; opacity: .8;
       text-transform: uppercase; letter-spacing: .04em; }
  .list { flex: 1; overflow-y: auto; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px;
         font-size: 13px; border-radius: 4px; cursor: pointer; }
  .row:hover { background: #2a2a2a; }
  .row.active { background: #23352e; }
  input { accent-color: #25d366; }
  .sep { height: 1px; background: #333; margin: 6px 0; }
  .buttons { margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 6px 14px; font-size: 13px; cursor: pointer; border-radius: 4px;
           border: 1px solid #555; background: #2a2a2a; color: #eee; }
  button.primary { background: #25d366; border-color: #25d366; color: #000; font-weight: 500; }
  button:hover { filter: brightness(1.1); }
  button:disabled { opacity: .4; cursor: not-allowed; }
</style></head><body>
  <h1>Open profile</h1>
  <div class="list" id="list"></div>
  <div class="sep"></div>
  <div class="row" id="new"><input type="radio" name="p" value="__new__"><span>New profile…</span></div>
  <div class="buttons">
    <button id="cancel">Cancel</button>
    <button id="open" class="primary" disabled>Open</button>
  </div>
  <script>
    const list = document.getElementById('list');
    const openBtn = document.getElementById('open');
    let profiles = [];
    function currentChoice() {
      const sel = document.querySelector('input[name="p"]:checked');
      return sel ? sel.value : null;
    }
    function refreshOpen() { openBtn.disabled = !currentChoice(); }
    function render() {
      list.innerHTML = '';
      profiles.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML =
          '<input type="radio" name="p" value="' + p.id + '">' +
          '<span>' + p.name + (p.isDefault ? ' (default)' : '') + '</span>';
        row.addEventListener('click', () => {
          list.querySelectorAll('input').forEach((i) => i.checked = false);
          row.querySelector('input').checked = true;
          document.querySelector('#new input').checked = false;
          refreshOpen();
        });
        list.appendChild(row);
      });
    }
    document.getElementById('new').addEventListener('click', () => {
      list.querySelectorAll('input').forEach((i) => i.checked = false);
      document.querySelector('#new input').checked = true;
      refreshOpen();
    });
    openBtn.addEventListener('click', () => {
      const c = currentChoice();
      if (c) window.picker.select(c);
    });
    document.getElementById('cancel').addEventListener('click', () => window.picker.select(null));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const c = currentChoice();
        if (c) window.picker.select(c);
      } else if (e.key === 'Escape') {
        window.picker.select(null);
      }
    });
    (async () => {
      profiles = await window.picker.list();
      render();
      refreshOpen();
    })();
  </script>
</body></html>`;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.once('ready-to-show', () => win.show());
  });
}

module.exports = { pickProfile };