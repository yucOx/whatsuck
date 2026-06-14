# Whatsuck

A native Ubuntu desktop client for [WhatsApp Web](https://web.whatsapp.com). Wraps the web app in an Electron shell, packages it as a `.deb`, and integrates with the OS so it shows up in the application menu, in the dock/taskbar, and — for incoming messages — as a real notification with the app's own icon.

## Features

- **Multi-profile** – Create, rename, and delete profiles from the Profiles menu. Each profile gets its own isolated session (cookies, localStorage, IndexedDB). Run multiple profiles side by side in separate windows.
- **Pin to desktop** – Any profile can be pinned to the application menu. A `.desktop` file is generated so the profile appears as "Whatsuck (Work)" in GNOME/KDE and can be launched directly.
- **Default profile** – Choose which profile opens when you launch Whatsuck without arguments. `whatsuck --profile=work` opens a specific profile from the command line.
- **Native notifications** – Incoming messages appear in the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon. Clicking a notification focuses the main window.
- **Auto-update** – On startup the app checks GitHub for a new release, downloads it in the background, and prompts to restart. Updates install automatically on next quit. No manual `.deb` downloading needed after the first install.
- **Browser staleness warning** – Chromium (the rendering engine inside Electron) does not auto-update between app releases. If the bundled version falls 2+ major versions behind the latest stable Chrome, the app shows a one-time warning with a link to the releases page.
- **External links open in your browser** – Links in WhatsApp messages open in the OS default browser (Firefox, Chrome, etc.), not inside the app window.
- **OS keyring integration** – Session cookies are encrypted with your system keyring (libsecret / GNOME Keyring / KWallet) when available. You'll get a one-time warning at startup if no keyring is detected.
- **Real `.deb` package** – Install with `dpkg`, uninstall with `apt remove`. Registers a `.desktop` file so the app appears in your app menu.
- **Auto-hide menu bar** – The app menu is hidden by default; press `Alt` to reveal it. `F12` opens DevTools, `Ctrl+R` reloads, `Ctrl+N` opens a new window for the current profile.

## Multi-profile

Each profile is a fully isolated WhatsApp session:

- **Cookies** – separate session token per profile
- **IndexedDB / LocalStorage** – separate cache, contacts, message history
- **HTTP cache** – separate network cache

Profile data is stored under `~/.config/whatsuck/`:

```
~/.config/whatsuck/
├── profiles.json              # Profile metadata (name, isDefault, isPinned)
├── Cookies                   # Default profile cookies
├── Local Storage/            # Default profile storage
├── IndexedDB/                # Default profile database
└── Partitions/
    ├── work/
    │   ├── Cookies           # "Work" profile cookies
    │   ├── Local Storage/
    │   └── IndexedDB/
    └── side-hustle/
        └── ...
```

The `default` profile uses `session.defaultSession` for backward compatibility — existing single-profile users keep their session data after upgrade.

### Profiles menu

Press `Alt` to reveal the menu bar, then click **Profiles**:

- **Profile list** – radio buttons; clicking a profile opens it in a new window
- **New Profile…** – prompts for a name, creates an isolated session
- **Rename…** – renames the current profile's display name
- **Delete** – erases the profile's session data permanently (disabled if only one profile remains)
- **Set as Default** – which profile opens on bare launch
- **Pin to Desktop** – creates a `.desktop` entry so the profile appears in the application launcher as "Whatsuck (Work)"

### CLI

```bash
whatsuck                     # Opens the default profile
whatsuck --profile=work      # Opens the "work" profile
```

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

## Browser engine updates

Electron bundles its own Chromium build. Unlike a normal Chrome install, the bundled browser does **not** auto-update — it only updates when the maintainer bumps the Electron version and publishes a new app release. The auto-update mechanism (above) takes care of that: when a new release ships a newer Chromium, every user gets it within a session or two of next launch.

If the bundled Chromium falls 2+ major versions behind the latest stable Chrome, the app shows a one-time notice at startup with a link to the releases page. This is informational; it doesn't block the app from running.

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

Pinned profile `.desktop` files in `~/.local/share/applications/` are not removed by `apt remove`. To clean them up:

```bash
rm ~/.local/share/applications/whatsuck-*.desktop
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
├── main.js           # Entry point: app lifecycle, CLI switches, multi-window orchestration
├── window.js         # BrowserWindow factory, per-profile partitions, UA spoofing, external links
├── profiles.js       # Profile metadata store (load, save, create, delete, rename, setDefault)
├── desktop.js        # Per-profile .desktop file generation and cleanup
├── profile-dialog.js # Modal text input dialog (New Profile / Rename)
├── menu.js           # App menu (File, Profiles, Edit, View)
├── notifications.js  # In-page Notification → OS notification bridge
├── security.js       # OS keyring availability check + user warning
├── updater.js        # Auto-update via electron-updater (download + install on quit)
├── browser-check.js  # Chromium staleness check (warns if 2+ major versions behind)
└── constants.js      # Frozen config object (URL, dimensions, paths)
build/
├── afterPack.js      # electron-builder hook: replaces binary with wrapper
└── whatsuck-wrapper.sh  # Sample wrapper (unused; afterPack generates one)
```

Each module has a single responsibility and is the only file that imports its private concern. `main.js` orchestrates; it doesn't do work itself.

### How profile isolation works

Each profile gets a `session.fromPartition('persist:<id>')`. Electron stores the partition data in a separate directory under `~/.config/whatsuck/Partitions/<id>/`. The `default` profile uses `session.defaultSession` for backward compatibility — no partition key in `webPreferences`.

When you click a profile in the menu, `openProfile(id)` checks if a window already exists for that profile. If so, it focuses the existing window. If not, it creates a new `BrowserWindow` with the partition.

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