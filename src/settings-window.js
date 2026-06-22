'use strict';

const { BrowserWindow } = require('electron');
const path = require('path');
const C = require('./constants');

/**
 * Modal Settings window.
 *
 * Mirrors the profile-dialog pattern: a modal BrowserWindow with a
 * preload script (no nodeIntegration), inlined HTML, and IPC for
 * load/save. The renderer is sandboxed and can only call the two
 * `settings` channels exposed by settings-preload.js.
 *
 * @param {BrowserWindow} [parent] - Owner window for modal parenting.
 */
function openSettingsWindow(parent) {
  const win = new BrowserWindow({
    width: C.settingsWindow.width,
    height: C.settingsWindow.height,
    parent: parent || undefined,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Settings',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'settings-preload.js'),
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 18px;
         background: #1e1e1e; color: #eee; }
  h1 { font-size: 15px; margin: 0 0 12px; font-weight: 600; }
  .row { display: flex; align-items: center; gap: 10px; margin: 10px 0;
         font-size: 13px; }
  .row > label { flex: 1; }
  .row > .ctrl { flex: 0 0 auto; }
  input[type="number"] { width: 90px; padding: 4px 6px; font-size: 13px;
         background: #2a2a2a; color: #eee; border: 1px solid #444;
         border-radius: 4px; }
  select { padding: 4px 6px; font-size: 13px; background: #2a2a2a; color: #eee;
          border: 1px solid #444; border-radius: 4px; }
  .section { margin-top: 16px; padding-top: 10px; border-top: 1px solid #333;
             font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
             opacity: .6; }
  .hint { font-size: 11px; opacity: .5; margin: -4px 0 8px; }
  .buttons { margin-top: 18px; display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 7px 16px; font-size: 13px; cursor: pointer; border-radius: 4px;
           border: 1px solid #555; background: #2a2a2a; color: #eee; }
  button.primary { background: #25d366; border-color: #25d366; color: #000; font-weight: 500; }
  button:hover { filter: brightness(1.1); }
  button:disabled { opacity: .4; cursor: not-allowed; }
</style></head><body>
  <h1>Settings</h1>

  <div class="row">
    <label for="notifEnabled">Notifications enabled</label>
    <input class="ctrl" id="notifEnabled" type="checkbox" />
  </div>
  <div class="row">
    <label for="notifSound">Notification sound</label>
    <input class="ctrl" id="notifSound" type="checkbox" />
  </div>
  <div class="row">
    <label for="cooldown">Min delay between notifications (ms)</label>
    <input class="ctrl" id="cooldown" type="number" min="0" step="100" />
  </div>

  <div class="section">Window</div>
  <div class="row">
    <label for="startupProfile">Open this profile on launch</label>
    <select class="ctrl" id="startupProfile"></select>
  </div>
  <div class="row">
    <label for="escMin">Press Esc on minimize to leave the chat</label>
    <input class="ctrl" id="escMin" type="checkbox" />
  </div>
  <div class="section">Close button</div>
  <div class="row">
    <label><input type="radio" name="closeBehavior" value="hideToTray" /> Hide to tray (keep running)</label>
  </div>
  <div class="row">
    <label><input type="radio" name="closeBehavior" value="quit" /> Quit the app</label>
  </div>

  <div class="buttons">
    <button id="cancel">Cancel</button>
    <button id="save" class="primary">Save</button>
  </div>

  <script>
    const $ = (id) => document.getElementById(id);
    let initial = null;

    async function load() {
      const { settings, profiles } = await window.settings.get();
      initial = settings;
      $('notifEnabled').checked = settings.notifications.enabled;
      $('notifSound').checked = settings.notifications.sound;
      $('cooldown').value = settings.notifications.cooldownMs;
      $('escMin').checked = settings.minimize.escToDeselect;
      const sel = $('startupProfile');
      sel.innerHTML = '';
      profiles.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.isDefault ? ' (default)' : '');
        if (p.id === settings.startup.profileId) opt.selected = true;
        sel.appendChild(opt);
      });
      document.querySelectorAll('input[name="closeBehavior"]').forEach((r) => {
        r.checked = (r.value === settings.closeButton.behavior);
      });
      syncSoundEnabled();
    }
    function syncSoundEnabled() {
      const on = $('notifEnabled').checked;
      $('notifSound').disabled = !on;
      if (!on) $('notifSound').checked = false;
    }
    $('notifEnabled').addEventListener('change', syncSoundEnabled);

    function collect() {
      const close = document.querySelector('input[name="closeBehavior"]:checked');
      return {
        notifications: {
          enabled: $('notifEnabled').checked,
          sound: $('notifSound').checked,
          cooldownMs: parseInt($('cooldown').value, 10) || 0,
        },
        startup: { profileId: $('startupProfile').value },
        minimize: { escToDeselect: $('escMin').checked },
        closeButton: { behavior: close ? close.value : 'hideToTray' },
      };
    }

    $('save').addEventListener('click', async () => {
      $('save').disabled = true;
      await window.settings.save(collect());
      window.close();
    });
    $('cancel').addEventListener('click', () => window.close());

    load();
  </script>
</body></html>`;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  win.once('ready-to-show', () => win.show());
}

module.exports = { openSettingsWindow };