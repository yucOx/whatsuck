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
      height: 360,
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
         background: #1e1e1e; color: #eee; }
  h1 { font-size: 13px; margin: 0 0 10px; font-weight: 600; opacity: .8;
       text-transform: uppercase; letter-spacing: .04em; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px;
         font-size: 13px; border-radius: 4px; cursor: pointer; }
  .row:hover { background: #2a2a2a; }
  .row.active { background: #23352e; }
  input { accent-color: #25d366; }
  .sep { height: 1px; background: #333; margin: 6px 0; }
</style></head><body>
  <h1>Open profile</h1>
  <div id="list"></div>
  <div class="sep"></div>
  <div class="row" id="new"><input type="radio" name="p" value="__new__"><span>New profile…</span></div>
  <script>
    const list = document.getElementById('list');
    (async () => {
      const profiles = await window.picker.list();
      profiles.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML =
          '<input type="radio" name="p" value="' + p.id + '">' +
          '<span>' + p.name + (p.isDefault ? ' (default)' : '') + '</span>';
        row.addEventListener('click', () => {
          list.querySelectorAll('input').forEach((i) => i.checked = false);
          row.querySelector('input').checked = true;
        });
        row.querySelector('input').addEventListener('dblclick', () => window.picker.select(p.id));
        list.appendChild(row);
      });
    })();
    document.getElementById('new').addEventListener('click', () => {
      list.querySelectorAll('input').forEach((i) => i.checked = false);
      document.querySelector('#new input').checked = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const sel = document.querySelector('input[name="p"]:checked');
        window.picker.select(sel ? sel.value : null);
      } else if (e.key === 'Escape') {
        window.picker.select(null);
      }
    });
  </script>
</body></html>`;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.once('ready-to-show', () => win.show());
  });
}

module.exports = { pickProfile };