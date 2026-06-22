<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Whatsuck icon">
</p>

<h1 align="center">Whatsuck</h1>

<p align="center">
  <strong>WhatsApp Web as a native Ubuntu desktop app.</strong><br>
  Switch between multiple accounts, real OS notifications, auto-update, keyring-encrypted sessions — all in one ~85 MB package.
</p>

<p align="center">
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/v/release/yucOx/whatsuck?style=flat-square" alt="Release"></a>
  <a href="https://github.com/yucOx/whatsuck/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/yucOx/whatsuck/release.yml?style=flat-square" alt="Build"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/yucOx/whatsuck?style=flat-square" alt="License"></a>
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/downloads/yucOx/whatsuck/total?style=flat-square" alt="Downloads"></a>
  <a href="https://github.com/yucOx/whatsuck/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>
  <a href="https://github.com/yucOx/whatsuck"><img src="https://img.shields.io/github/last-commit/yucOx/whatsuck?style=flat-square" alt="Last commit"></a>
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> ·
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

> **Not affiliated with WhatsApp or Meta.** Whatsuck is an independent,
> open-source Electron wrapper around `web.whatsapp.com`. WhatsApp is a
> trademark of Meta Platforms, Inc. This project receives no data from
> WhatsApp and sends none to anyone — it's a thin shell around the same
> web page you'd open in a browser.

---

## Why Whatsuck?

A browser tab gets you most of the way to a WhatsApp desktop experience — until you try to actually live in it.

| Browser tab | Whatsuck |
|---|---|
| ❌ Close the tab, lose notifications | ✅ Background process, notifications always on |
| ❌ One WhatsApp number at a time | ✅ Multiple isolated profiles, switch instantly |
| ❌ "Works with Chrome 85+" warning | ✅ Bundled Chromium (Electron 35.7.5), no warnings |
| ❌ Cookies cleared on browser reset | ✅ Encrypted with OS keyring, persist across restarts |
| ❌ No app launcher entry | ✅ Real `.desktop` integration per profile |
| ❌ No auto-update | ✅ Downloads and installs in the background, SHA512-verified |
| ❌ Closing a chat keeps you "online" | ✅ Optional Esc-on-minimize leaves the conversation |

The headline feature is **multiple WhatsApp accounts in one app**. Each profile is a fully isolated session (separate cookies, localStorage, IndexedDB, HTTP cache), so you can keep your personal number and your work number a click apart — without incognito windows, a second browser, or logging out. One profile is visible at a time; switching is instant because every profile's window stays alive in the background.

---

## ✨ Features

### 💬 Built for WhatsApp

- **Multi-profile** — two or more WhatsApp accounts, each in its own isolated Electron partition. Switch from the menu, the tray, or the CLI
- **Configurable layout** — choose in Settings how profiles are displayed: **Switch** (one visible at a time, default), **Tabs** (one window with a Chrome-like tab bar), or **Windows** (one window per profile, side by side)
- **Open Tab…** — `Ctrl+T` or the tray menu opens a profile picker so you can open another account without closing the current one
- **Pin to desktop** — pin any profile to your app menu as "Whatsuck (Work)"
- **Startup profile** — choose which account opens on bare launch (Settings → *Open this profile on launch*)
- **Real notifications** — incoming messages hit the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon; clicking a notification raises the right window
- **Configurable notifications** — enable/disable, sound on/off, and a per-notification cooldown (default 1/s) to prevent DoS
- **External links** — URLs in chat open in your default browser, not inside the app

### 🖥️ System integration

- **System tray** — close the window to keep the app running in the background; the tray context menu lists every profile so you can switch or restore from there
- **Single instance** — clicking the app launcher again focuses the existing window instead of opening a duplicate
- **Minimize-to-dock fallback** — on systems without a working tray (GNOME Wayland without AppIndicator), closing the window minimizes to the taskbar instead of quitting
- **Esc-on-minimize** — optionally press Esc when you minimize so WhatsApp doesn't keep you "in" the last conversation
- **Close-button behavior** — keep the default (hide to tray) or make the X button quit the app outright

### 🔐 Security

- **Auto-update** — checks GitHub releases, downloads in background, SHA512-verified via `electron-updater`
- **OS keyring** — session cookies encrypted with GNOME Keyring / KWallet when available; a warning fires on first launch if `libsecret` is missing
- **Strict sandboxing** — `contextIsolation`, `sandbox`, `webSecurity=true`, no `nodeIntegration`, no `webviewTag`
- **Isolated dialogs** — profile input and the Settings window use preload + `contextBridge`; renderers have zero Node.js access
- **Locked-down permissions** — only `notifications` is granted; every other permission is denied
- **External links** — only `http`/`https` to non-WhatsApp hosts leave the app, via `shell.openExternal`

### ⚙️ Technical

- **Bundled Chromium** — Electron 35.7.5, Chromium ~130. A staleness warning fires if it ever falls 2+ majors behind stable Chrome
- **Plain JavaScript** — no TypeScript, no bundler, no transpile. ~18 files in `src/`, ~900 LOC
- **UA spoofing** — WhatsApp Web's "works with Chrome 85+" gate rejects Electron's default UA; we spoof a standard Linux Chrome UA at both the session and webContents level
- **Robust I/O** — corrupted `profiles.json` / `settings.json` are auto-backed-up and re-seeded rather than crash-looping
- **Atomic writes** — all stores write to `.tmp` then `rename`
- **Keyboard shortcuts** — `Ctrl+R` reload, `Ctrl+N` new window, `F12` DevTools
- **CLI** — `whatsuck --profile=work` opens a specific account

---

## 📦 Install

### One command (recommended)

No git, node, or npm needed — just `curl` or `wget`:

```bash
curl -sL https://raw.githubusercontent.com/yucOx/whatsuck/main/setup.sh | bash -
```

Or clone and run locally:

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
./setup.sh
```

The setup script checks for `curl`/`wget` and `dpkg`, downloads the latest `.deb` from GitHub releases, installs it system-wide, and resolves runtime dependencies via `apt-get install -f`. Whatsuck then appears in your application menu.

### Manual install

```bash
sudo dpkg -i whatsuck_1.0.5_amd64.deb
sudo apt-get install -f   # resolve missing runtime deps
```

### Uninstall

```bash
./uninstall.sh
```

The uninstaller asks interactively whether to keep or delete your WhatsApp session data (profiles, cookies, logins). Reinstalling later preserves your sessions if you keep the data.

---

## 📋 Requirements & compatibility

| | |
|---|---|
| **OS** | Ubuntu 22.04 / 24.04, Debian 12 (x86_64). Other Debian-likes may work but are untested |
| **Package** | `.deb` only (macOS/Windows on the roadmap) |
| **Install deps** | `curl` or `wget`, `dpkg` |
| **Notifications** | `libnotify-bin` (usually preinstalled); a running notification daemon |
| **Cookie encryption** | `libsecret` + GNOME Keyring or KWallet (optional — falls back to plaintext with a warning) |
| **Tray icon** | X11 works out of the box. On GNOME Wayland install `libayatana-appindicator3-1` and the *AppIndicator* extension, or the tray is disabled and closing minimizes to the taskbar instead |

To round-trip the runtime deps in one go:

```bash
sudo apt install libnotify-bin libsecret-1-0 gnome-keyring libayatana-appindicator3-1
```

---

## 👥 Multiple WhatsApp Accounts

Each profile is a fully isolated WhatsApp session. Switch from the menu bar (**Profiles**) or right-click the tray icon and pick a profile. One window is visible at a time; the others stay alive in the background.

| Menu item | What it does |
|---|---|
| New Profile… | Creates a new session and opens a fresh WhatsApp window |
| Rename… | Changes the display name of the current profile |
| Delete | Permanently erases the profile's session data |
| Set as Default | Which profile opens on bare launch (also settable in Settings) |
| Pin to Desktop | Adds a `.desktop` entry so the profile appears in the app launcher |

### Command line

```bash
whatsuck                       # Opens the startup profile (Settings, or the default)
whatsuck --profile=work        # Opens the "work" profile (overrides Settings)
```

### How it works

Each profile runs in its own Electron partition (`persist:<id>`), stored under `~/.config/whatsuck/Partitions/<id>/`. The `default` profile uses `session.defaultSession` for backward compatibility — existing users keep their session after upgrading.

```
~/.config/whatsuck/
├── profiles.json              # Profile metadata
├── settings.json              # User settings (notifications, startup, window behavior)
├── Cookies                   # Default profile cookies
├── Local Storage/            # Default profile storage
├── IndexedDB/                # Default profile database
└── Partitions/
    ├── work/
    │   ├── Cookies
    │   └── Local Storage/
    └── side-hustle/
        └── ...
```

---

## ⚙️ Settings

Open **Settings → Open Settings…** for the full window, or use the quick toggles under the Settings menu.

| Setting | What it controls |
|---|---|
| Notifications enabled | Master switch for OS notifications |
| Notification sound | Play a sound with each notification (best-effort on Linux; some desktops ignore `silent`) |
| Min delay between notifications | Cooldown in ms (default 1000) — throttles bursts |
| Open this profile on launch | Which profile opens on bare launch (`--profile=` CLI overrides it) |
| Layout | Switch (one visible) / Tabs (one window, Chrome-like) / Windows (side by side). Applies on the next Open Tab |
| Esc on minimize | Press Esc when minimizing so the open chat is deselected |
| Close button | *Hide to tray* (keep running, default) or *Quit the app* |

Settings live in `~/.config/whatsuck/settings.json` and are deep-merged against defaults, so new options appear automatically without wiping your choices.

---

## 🔔 How notifications work

WhatsApp Web creates notifications through the browser Notifications API. Whatsuck intercepts them at the main-process level:

1. The renderer fires a `notification` event on the window's `webContents`.
2. The bridge calls `event.preventDefault()` so Electron does **not** show its own notification (which would ignore our settings and carry no click handler).
3. If notifications are enabled, we emit our own `Notification` with `silent: true` when sound is off, throttled by the cooldown.
4. The notification's click handler restores + raises the correct profile window (the window that produced the notification), even if it was hidden to tray.

This is why "Notifications enabled: off" actually stops them, and why clicking a notification reliably brings the right window to front instead of doing nothing.

---

## 🔒 Security & Privacy

### What's on disk

| Data | Encryption |
|---|---|
| Cookies (session token) | OS keyring when available |
| IndexedDB / LocalStorage | Plain text (LevelDB/SQLite) |
| App preferences (`profiles.json`, `settings.json`) | Plain text |

### Who can read it

| Access level | Risk |
|---|---|
| You (your user) | Full access |
| Other users on same machine | Protected by `0700`/`0600` Unix permissions |
| `sudo` / root | Can read everything |
| Stolen disk (no FDE) | Can read everything |
| Stolen disk (LUKS) | Protected by full-disk encryption |

**Recommended**: enable full-disk encryption. The OS keyring check warns you at first launch if `libsecret` / `gnome-keyring` is missing.

### Telemetry

**None.** Whatsuck collects no analytics, no usage data, no crash reports. The only network calls are:

- WhatsApp Web itself (the page you'd load in a browser anyway)
- The GitHub releases API, to check for updates (and `googlechromelabs.github.io`, once per launch, for the Chromium staleness check)

All session data stays local under `~/.config/whatsuck/`.

### Architecture (in brief)

Every main window is created with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webviewTag: false`. The profile dialog and Settings window use a preload script + `contextBridge` so their renderers cannot reach Node.js. Only the `notifications` permission is granted. Updates are HTTPS with SHA512 hash verification against `latest-linux.yml` published alongside each GitHub release. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module map and startup data flow.

### Reporting a vulnerability

Open a private security advisory on GitHub, or email `yucOx@users.noreply.github.com`. Please don't file public issues for security bugs.

---

## 🛠️ Developing

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
npm install        # Node 18+, npm
npm start          # dev mode (auto-update and keyring warnings skipped)
npm run build      # produces dist/whatsuck_1.0.5_amd64.deb
```

Build prerequisites: Node 18+, npm, and `dpkg` (electron-builder shells out to it for the `.deb`). On Debian/Ubuntu that's already present.

A few intentional constraints worth knowing before you patch:
- Electron is pinned to **35.7.5** exactly. Don't widen the range — a minor bump can change Chromium behavior and break the UA spoof / WhatsApp gate.
- `main.js` is the only module allowed to import across feature modules; feature modules stay independent to avoid circular imports.
- No test framework yet — manual testing against a real WhatsApp account catches regressions. Adding a framework should be its own PR.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module map and data flow, and [CLAUDE.md](CLAUDE.md) for the full contribution guide and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

---

## 🚀 Releasing

Releases are automated via GitHub Actions on `v*` tag push:

```bash
# 1. Bump version in package.json (e.g. 1.0.2 → 1.0.3)
# 2. Update the deb filename in README.md and README.tr.md to match
# 3. Commit, tag, push:
git commit -am "v1.0.3: description"
git tag v1.0.3
git push origin main
git push origin v1.0.3
```

Actions runs `npm ci` → `npm run build` → creates a GitHub Release with the `.deb` attached. Don't delete and recreate a tag with the same name — force-move it (`git tag -f`) if you must retrigger.

Users get the update via `electron-updater` (checks on launch, installs on quit) or by re-running `setup.sh`.

---

## 🖼️ Screenshots

<!-- Drop PNGs into a screenshots/ directory and uncomment:
![Main window](screenshots/main.png)
![Tray profile list](screenshots/tray.png)
![Settings window](screenshots/settings.png)
-->

Screenshots coming soon. The app window is WhatsApp Web; the notable UI surfaces are the **Profiles** menu (switch / new / rename / delete / pin), the **tray context menu** (per-profile list), and the **Settings** window.

---

## ❓ FAQ

**Notifications don't appear.** Make sure `libnotify-bin` is installed: `sudo apt install libnotify-bin`. On minimal Ubuntu Server, the notification daemon may not be running.

**The tray icon is missing.** You're likely on GNOME Wayland without AppIndicator. Install `sudo apt install libayatana-appindicator3-1` and enable the *AppIndicator* extension, then restart. Without a tray, closing the window minimizes to the taskbar instead of hiding.

**The X button doesn't quit.** By design it hides to tray (the app keeps running for notifications). To make X quit, open Settings and set *Close button → Quit the app*. Either way, **Ctrl+Q** or **File → Quit** quits immediately.

**How do I see two profiles at once?** Open Settings → Layout and pick **Tabs** (one window with a tab bar) or **Windows** (separate windows side by side). The default **Switch** shows one at a time. Changing layout applies to the next profile you open (open windows aren't migrated live).

**Switching profiles opens two windows.** It shouldn't — selecting a profile shows it and hides the rest. If you see two, you're on an older build; update to ≥ 1.0.2.

**I deleted a profile by accident.** Undelete isn't supported — the session data is gone. Re-create the profile and re-scan the QR code.

**WhatsApp shows "browser not supported".** The bundled Chromium may be too old. Wait for an app update, or open an issue.

**Multi-account doesn't work.** Each profile needs a unique phone number. WhatsApp Web enforces one number per browser session, which is exactly what partitions give us.

**Auto-update is broken.** Check `~/.config/whatsuck/Updater/` for the download log. If releases are missing, the GitHub release might not have a `.deb` attached.

**Can I install on a Mac or Windows?** Not yet — only the Ubuntu/Debian `.deb` is built. Cross-platform is on the roadmap.

---

## 🗺️ Roadmap

- [ ] macOS and Windows builds
- [ ] Tray icon with unread badge
- [ ] Per-profile notification rules
- [ ] Search across all profiles in one window
- [ ] Proper screenshot set

---

## 🤝 Contributing

PRs welcome. The codebase is small (~900 LOC across 18 files in `src/`); see [ARCHITECTURE.md](ARCHITECTURE.md) for the module map. Before opening a PR:

1. Run `npm run build` and verify the `.deb` still installs
2. Test your change in dev mode (`npm start`)
3. Open an issue first for non-trivial changes

Bug reports: open an issue with the output of `whatsuck --version`, your Ubuntu version, and how to reproduce.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

**Whatsuck is not affiliated with, endorsed by, or sponsored by WhatsApp or Meta Platforms, Inc.** "WhatsApp" is a trademark of Meta Platforms, Inc. This project is an independent Electron shell around the public `web.whatsapp.com` web app and collects no data.