# Architecture

Whatsuck is a thin Electron shell over WhatsApp Web. The goal of the
architecture is to keep the wrapper small and the security model obvious:
the renderer should never have any more power than a regular Chrome tab.

## Module map

```
src/
├── main.js                  # Entry point. App lifecycle, single-instance, layout modes (switch/tabs/windows).
├── window.js                # BrowserWindow + WebContentsView factories. UA spoofing, external links.
├── profiles.js               # Profile metadata store (profiles.json).
├── desktop.js                # Per-profile .desktop file management.
├── profile-dialog.js         # Modal text input (New Profile, Rename).
├── profile-dialog-preload.js # Preload script — contextBridge, no nodeIntegration.
├── profile-picker.js         # Modal profile picker (Open Tab). Lists profiles + New.
├── profile-picker-preload.js # Preload for the picker — contextBridge, no nodeIntegration.
├── tabs-shell.js             # Tabbed shell: one BrowserWindow + tab-bar strip + WebContentsView per profile (layout: tabs).
├── tabs-shell-preload.js     # Preload for the tab-bar strip.
├── menu.js                   # Application menu (File, Profiles, Edit, View, Settings).
├── notifications.js          # In-page → OS notification event bridge (per-webContents, settings-aware).
├── permissions.js            # Session permission handlers (notifications + media), single owner per session.
├── media-prompt.js           # First-use Allow/Deny modal for mic/camera (called from permissions.js).
├── media-prompt-preload.js   # Preload for the media prompt — contextBridge, no nodeIntegration.
├── settings.js                # User settings store (settings.json — notifications, media, startup, minimize, close, ui.layout).
├── settings-window.js        # Modal Settings window (load/save via IPC).
├── settings-preload.js       # Preload for the Settings window — contextBridge, no nodeIntegration.
├── tray.js                   # System tray icon (Show, Open Profile, per-profile list, Quit).
├── security.js               # OS keyring availability check.
├── updater.js                # Auto-update via electron-updater.
├── browser-check.js          # Chromium staleness warning.
└── constants.js              # Frozen config object — single source of truth.
build/
└── afterPack.js              # electron-builder hook: wrapper script generator.
.github/workflows/
└── release.yml               # Auto-build .deb on v* tag push.
setup.sh                      # One-command install (downloads from GitHub releases).
uninstall.sh                  # Interactive uninstaller (asks about data deletion).
```

Total ~900 LOC. No transpilation, no bundler — Electron runs plain Node.js.

## Data flow on startup

```
1. main.js
   └─ resolve initial profile: --profile= CLI wins, else Settings → startup.profileId, else default
   └─ apply CLI switches (--no-sandbox, --disable-dev-shm-usage)
   └─ app.whenReady()
       └─ openProfile(initialProfileId)
           ├─ createMainWindow({ profileId })
           │   └─ session.fromPartition('persist:<id>')
           │   └─ install UA spoofing
           │   └─ install external link interceptors
           │   └─ loadURL('https://web.whatsapp.com')
           └─ attachNotificationBridge(win)
               └─ installPermissionHandlers(session)   # notifications + media, single owner per session
                   └─ setPermissionRequestHandler  (media: first-use Allow/Deny prompt via media-prompt.js, persisted to settings)
                   └─ setPermissionCheckHandler     (notifications + per-type media gating, settings live)
               └─ webContents.on('notification', ...) → event.preventDefault(), then showNativeNotification (settings-aware)
       └─ installAppMenu({ currentWindow, openProfile, switchToProfile, openSettingsWindow, onProfilesChanged })
       └─ createTray(quitApp, showActiveProfile, { getProfiles, switchProfile, getActiveId })  # per-profile list
       └─ ipcMain.handle('settings-get' / 'settings-save')                                   # for the Settings window
       └─ checkKeyringAndWarn(win)         [one-time]
       └─ checkForUpdates()                [background]
       └─ checkBrowserStaleness()          [background]
       └─ syncDesktopFiles(profiles, exe)  [reconcile pinned .desktop]
```

## Profile isolation

Each profile is an Electron partition: a separate session, separate cookies,
separate cache. We don't try to implement session isolation ourselves — the
Chromium sandbox does it for us.

```js
const isDefault = profileId === 'default';
const partitionName = isDefault ? undefined : `persist:${profileId}`;
const ses = isDefault ? session.defaultSession : session.fromPartition(partitionName);
```

The `default` profile uses `session.defaultSession` for backward compatibility
with the pre-multi-profile era — existing users keep their session data after
upgrade.

## Security model

We treat the renderer as untrusted. Every feature that involves loading remote
content goes through the same checklist:

| Concern | Mitigation |
|---|---|
| Renderer reaches Node.js | `nodeIntegration: false` |
| Renderer escapes sandbox | `contextIsolation: true`, `sandbox: true` |
| Malicious link opens in-app | `will-navigate` + `setWindowOpenHandler` interceptors |
| Malicious URL string in `openExternal` | `isExternal()` validates protocol + host |
| Compromised page floods notifications | 1 notification/second rate limit |
| Page accesses mic/camera silently | `media` permission gated per device (settings-gated); first use prompts, answer persisted; everything else still denied |
| Compromised page spoofs IPC | `webContents.id` validation in `ipcMain` |
| Compromised page exploits webPreferences legacy | Explicit `webviewTag: false`, `webSecurity: true`, etc. |
| Update channel MITM | `electron-updater` over HTTPS, SHA512 verification |

The dialog windows are the only thing that talks to the main process. They
do so via a preload script that exposes a single `window.dialog.submit()`
function through `contextBridge`. The renderer has no other IPC capability.

## Wrapper script (the afterPack hook)

`build/afterPack.js` runs after `electron-builder` packages the app. It
renames the real Electron binary to `whatsuck.bin` and writes a shell script
in its place. The script:

1. Creates `~/.cache/whatsuck/tmp` if missing
2. Sets `TMPDIR` to that directory (bypasses `/dev/shm` and `/tmp` usrquota)
3. Passes `--no-sandbox`, `--disable-dev-shm-usage`, and a Chrome `--user-agent`
   as CLI flags (must arrive before any Chromium code runs)
4. Resolves symlinks via `readlink -f`
5. `exec`s the real binary

The Node-side `app.commandLine.appendSwitch` calls in `main.js` are a
backup — the CLI flags take effect first.

## State

There is no global state. `main.js` holds a `Map<profileId, BrowserWindow>`
to dedupe windows, and the menu is a module-level singleton that rebuilds
itself when profiles change. All persistent state is in:

| Path | Contents |
|---|---|
| `~/.config/whatsuck/profiles.json` | Profile metadata (name, default, pinned) |
| `~/.config/whatsuck/Cookies`, `Local Storage/`, `IndexedDB/` | Default profile session |
| `~/.config/whatsuck/Partitions/<id>/...` | Per-profile session data |
| `~/.local/share/applications/whatsuck-*.desktop` | Pinned profile launchers |
| `~/.cache/whatsuck/tmp/` | TMPDIR for the wrapper |

## Testing

There are no automated tests yet. The codebase is small enough that
end-to-end manual testing (`npm start` against a real WhatsApp account)
catches most regressions. The defensive code paths (corrupted JSON,
invalid CLI input, unparseable URLs) are documented inline and exercised
by simple manual scenarios.

If you're adding tests, the easiest entry point is `src/profiles.js` — pure
filesystem logic with no Electron dependencies beyond `app.getPath`.

## Releasing

```bash
# bump version in package.json
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions builds the .deb and creates a release. `electron-updater`
on every user's machine picks it up within a session or two.