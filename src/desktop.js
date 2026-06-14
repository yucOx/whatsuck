'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

/**
 * Per-profile .desktop file management.
 *
 * Pinning a profile writes a .desktop file under
 * ~/.local/share/applications/ so the user can launch that
 * specific profile from the system application menu or pin
 * it to a dock.
 *
 * The StartupWMClass is unique per profile so GNOME/KDE
 * taskbars group each profile's window separately.
 */

function desktopDir() {
  return path.join(os.homedir(), '.local', 'share', 'applications');
}

function desktopFilePath(profileId) {
  return path.join(desktopDir(), `whatsuck-${profileId}.desktop`);
}

function generateDesktopFile(profile, execPath) {
  if (!app.isPackaged) return;

  fs.mkdirSync(desktopDir(), { recursive: true });

  const wmClass = `whatsuck-${profile.id}`;
  const displayName = `Whatsuck (${profile.name})`;

  const contents = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${displayName}`,
    'GenericName=WhatsApp Web Client',
    `Comment=Open Whatsuck with the "${profile.name}" profile`,
    `Exec=${execPath} --profile=${profile.id}`,
    'Icon=whatsuck',
    `StartupWMClass=${wmClass}`,
    'Categories=Network;InstantMessaging;',
    'Terminal=false',
    '',
  ].join('\n');

  fs.writeFileSync(desktopFilePath(profile.id), contents, { mode: 0o644 });
}

function removeDesktopFile(profile) {
  const p = desktopFilePath(profile.id);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
  }
}

/**
 * Reconcile on-disk .desktop files with the profiles list.
 * - Adds files for any pinned profile that lacks one.
 * - Removes stale files for profiles that no longer exist
 *   or have been unpinned.
 * Called once on startup.
 */
function syncDesktopFiles(profiles, execPath) {
  if (!app.isPackaged) return;

  fs.mkdirSync(desktopDir(), { recursive: true });

  const wanted = new Set();
  for (const p of profiles) {
    if (p.isPinned) {
      generateDesktopFile(p, execPath);
      wanted.add(desktopFilePath(p.id));
    }
  }

  // Sweep stale files (different id, or no matching profile).
  const existing = fs
    .readdirSync(desktopDir())
    .filter(f => f.startsWith('whatsuck-') && f.endsWith('.desktop'))
    .map(f => path.join(desktopDir(), f));

  for (const file of existing) {
    if (!wanted.has(file)) {
      fs.rmSync(file, { force: true });
    }
  }
}

module.exports = { generateDesktopFile, removeDesktopFile, syncDesktopFiles };