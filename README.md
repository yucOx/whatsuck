# Whatsuck

A native Ubuntu desktop client for [WhatsApp Web](https://web.whatsapp.com). Wraps the web app in an Electron shell, packages it as a `.deb`, and integrates with the OS so it shows up in the application menu, in the dock/taskbar, and — for incoming messages — as a real notification with the app's own icon.

## Features

- **Native notifications** – Incoming messages appear in the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon. Clicking a notification focuses the main window.
- **OS keyring integration** – Session cookies are encrypted with your system keyring (libsecret / GNOME Keyring / KWallet) when available. You'll get a one-time warning at startup if no keyring is detected.
- **Update checker** – On startup the app queries GitHub releases and notifies you when a new version is available. Skipped during `npm start` to avoid noise.
- **Real `.deb` package** – Install with `dpkg`, uninstall with `apt remove`. Registers a `.desktop` file so the app appears in your app menu.
- **Auto-hide menu bar** – The app menu is hidden by default; press `Alt` to reveal it. `F12` opens DevTools, `Ctrl+R` reloads.
- **Small surface** – No custom UI, no analytics, no telemetry. The wrapper does four things and stops: load URL, bridge notifications, warn about keyring, check for updates.

## Security & Privacy

What's stored on disk:

- **Cookies** – Your WhatsApp session token. Encrypted with the OS keyring when available.
- **IndexedDB / LocalStorage** – Cached contact list, recent message metadata, UI state. Stored in plain LevelDB/SQLite files.
- **App preferences** – Window position, notification settings, etc.

Who can read this:

| Access level | Risk |
| --- | --- |
| You (your user) | Full read/write — your account |
| Other users on the same machine | Protected by `0700`/`0600` Unix permissions |
| `sudo` / root | Can read everything |
| Stolen disk (without FDE) | Can read everything |
| Stolen disk (with LUKS / eCryptfs) | Protected by disk encryption |

**Recommended**: enable full-disk encryption (Ubuntu installer offers this). The OS-keyring integration is a defense-in-depth measure, not a replacement for FDE.

The keyring check on first launch will warn you if `libsecret` / `gnome-keyring` / `kwallet` is missing, with a one-click link to install instructions. The app runs either way — the warning is informational.

## Install

Download the latest release, or build it yourself (see below), then:

```bash
sudo dpkg -i dist/whatsuck_1.0.0_amd64.deb
sudo apt-get install -f   # resolve any missing runtime deps
```

After install, search for **Whatsuck** in your application menu.

## Uninstall

```bash
sudo apt remove whatsuck
```

Wipes the `.deb` install but leaves your session data in `~/.config/whatsuck/`. To wipe that too:

```bash
rm -rf ~/.config/whatsuck
```

## Develop

```bash
npm install
npm start
```

This launches the app in dev mode with the same code path as the packaged build. The update checker is skipped in dev mode.

## Build

```bash
npm run build
```

Produces `dist/whatsuck_1.0.0_amd64.deb`. Build size is ~85 MB because the whole Electron runtime is bundled.

## Architecture

```
src/
├── main.js           # Entry point: app lifecycle, CLI switches, orchestration
├── window.js         # BrowserWindow factory for WhatsApp Web, UA spoofing
├── notifications.js  # In-page Notification → OS notification bridge
├── security.js       # OS keyring availability check + user warning
├── updater.js        # GitHub releases check + update dialog
├── menu.js           # App menu template (Reload, DevTools, Edit)
└── constants.js      # Frozen config object (URL, dimensions, paths)
build/
├── afterPack.js      # electron-builder hook: replaces binary with wrapper
└── whatsuck-wrapper.sh  # Sample wrapper (unused; afterPack generates one)
```

Each module has a single responsibility and is the only file that imports its private concern. `main.js` orchestrates; it doesn't do work itself.

### How the notification bridge works

WhatsApp Web runs in a `BrowserWindow` like any other page. Its `new Notification(...)` calls don't reach the OS automatically. `src/notifications.js` does two things on the window's `webContents`:

1. **`setPermissionRequestHandler`** auto-grants the `notifications` permission, so the page can call `Notification.requestPermission()` without prompting the user through the in-page flow.
2. **`webContents.on('notification', ...)`** catches the in-page notification event and re-emits it as a native `Notification`, with the app icon, so the desktop shell (Unity, GNOME Shell, KDE) shows it as a real toast.

Click handlers focus the existing window rather than spawning a second one.

### How the wrapper script works

`build/afterPack.js` runs after `electron-builder` packages the app. It renames the real Electron binary to `whatsuck.bin` and writes a shell script in its place. The script:

1. Creates `~/.cache/whatsuck/tmp` if missing
2. Sets `TMPDIR` to that directory (bypasses `/dev/shm` and `/tmp` usrquota issues on some Ubuntu installs)
3. Passes `--no-sandbox`, `--disable-dev-shm-usage`, and a Chrome `--user-agent` as CLI flags (must arrive before any Chromium code runs)
4. Resolves any symlinks via `readlink -f` (the `.deb` install creates `/usr/bin/whatsuck` → `/opt/Whatsuck/whatsuck`)
5. `exec`s the real binary

The Node-side `app.commandLine.appendSwitch` calls in `src/main.js` still run as a backup, but the CLI flags are the ones that actually take effect for the first-navigation and child-process checks.

## License

MIT
