# Whatsuck 🟢

> **WhatsApp Web as a native Ubuntu desktop app.**
> Multiple accounts at once, each fully isolated. Notifications, desktop shortcuts, auto-update — all included.

[![GitHub release](https://img.shields.io/github/v/release/yucOx/whatsuck)](https://github.com/yucOx/whatsuck/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Ubuntu](https://img.shields.io/badge/platform-Ubuntu%20%7C%20Debian-E95420?logo=ubuntu)](https://ubuntu.com)
[![Electron: 35](https://img.shields.io/badge/electron-35-47848F?logo=electron)](https://www.electronjs.org/)

**Whatsuck** wraps [WhatsApp Web](https://web.whatsapp.com) in an Electron shell, packages it as a `.deb`, and integrates deeply with the OS — real notifications for incoming messages, multiple WhatsApp accounts side by side, and desktop shortcuts for each profile.

**[🇹🇷 Türkçe dokümantasyon için tıklayın](README.tr.md)**

---

## Features

### 💬 Built for WhatsApp

- **Real notifications** — incoming messages hit the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon
- **Multiple profiles** — run two or more WhatsApp accounts side by side, each in its own isolated session
- **Pin to desktop** — any profile can appear in the GNOME/KDE application menu as "Whatsuck (Work)"
- **Default profile** — choose which profile opens on bare launch; `whatsuck --profile=work` for a specific one

### 🔐 Security

- **Auto-update** — checks GitHub for new releases, downloads in the background, installs on restart
- **OS keyring** — session cookies encrypted with GNOME Keyring / KWallet when available
- **Strict sandboxing** — `contextIsolation`, `sandbox`, `webSecurity=true`, no `nodeIntegration`, no `webviewTag`
- **Isolated dialogs** — profile input uses a preload script + `contextBridge`; renderer has zero Node.js access
- **SHA512-verified updates** — downloads are hash-checked against the release manifest
- **External links** — URLs open in your default browser, not inside the app

### ⚙️ Technical

- **Menu bar always visible** — toggle from View menu; Alt shows it when hidden
- **Keyboard shortcuts** — `Ctrl+R` reload, `Ctrl+N` new window, `F12` DevTools
- **Browser staleness warning** — alerts if bundled Chromium is 2+ major versions behind stable Chrome
- **~85 MB `.deb`** — self-contained, no external runtime needed

---

## Install

### One-command install (recommended)

No development tools required on your machine:

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
./setup.sh
```

The setup script:
- ✅ Checks for `git`, `node`, `npm`, `dpkg`
- ✅ Installs npm dependencies
- ✅ Builds the `.deb` (downloads Electron ~150 MB, one-time)
- ✅ Installs system-wide via `sudo dpkg -i`
- ✅ Whatsuck appears in your application menu

### Manual install

Download the latest `.deb` from [Releases](https://github.com/yucOx/whatsuck/releases), then:

```bash
sudo dpkg -i whatsuck_1.0.0_amd64.deb
sudo apt-get install -f   # resolve missing runtime deps
```

### Uninstall

```bash
./setup.sh --uninstall     # removes app + session data + pinned shortcuts
```

or manually:

```bash
sudo apt remove whatsuck
rm -rf ~/.config/whatsuck                              # session data
rm ~/.local/share/applications/whatsuck-*.desktop      # pinned shortcuts
```

---

## Multiple WhatsApp Accounts

Each profile is a fully isolated WhatsApp session — separate cookies, localStorage, IndexedDB, HTTP cache. Log into your personal number in one window, your work number in another.

### Profiles menu

Click **Profiles** in the menu bar:

- **New Profile…** — creates a new session and opens a fresh WhatsApp window
- **Rename…** — changes the display name of the current profile
- **Delete** — permanently erases the profile's session data (disabled if only one remains)
- **Set as Default** — which profile opens on bare launch
- **Pin to Desktop** — adds a `.desktop` entry so the profile appears in the application launcher

### CLI

```bash
whatsuck                       # Opens the default profile
whatsuck --profile=work        # Opens the "work" profile
```

### How it works

Each profile runs in its own Electron partition (`persist:<id>`), stored under `~/.config/whatsuck/Partitions/<id>/`. The `default` profile uses `session.defaultSession` for backward compatibility — existing users keep their session after upgrading.

```
~/.config/whatsuck/
├── profiles.json              # Profile metadata
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

## Security & Privacy

### What's on disk

| Data | Encryption |
| --- | --- |
| Cookies (session token) | OS keyring when available |
| IndexedDB / LocalStorage | Plain text (LevelDB/SQLite) |
| App preferences | Plain text |

### Who can read it

| Access level | Risk |
| --- | --- |
| You (your user) | Full access |
| Other users on same machine | Protected by `0700`/`0600` Unix permissions |
| `sudo` / root | Can read everything |
| Stolen disk (no FDE) | Can read everything |
| Stolen disk (LUKS) | Protected by full-disk encryption |

**Recommended**: enable full-disk encryption. The OS keyring check warns you at first launch if `libsecret` / `gnome-keyring` is missing.

### Architecture

- Every main window: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webviewTag: false`
- Profile dialog: preload + `contextBridge` — renderer cannot access Node.js
- Notifications: rate-limited to 1/second (prevents DoS)
- Updates: HTTPS + SHA512 hash verification
- Permissions: only `notifications` granted; all others denied
- External links: only `http`/`https` to non-WhatsApp hosts are forwarded to `shell.openExternal`

---

## Developing

```bash
npm install
npm start        # dev mode (auto-update and keyring warnings skipped)
npm run build    # produces dist/whatsuck_1.0.0_amd64.deb
```

### Module map

```
src/
├── main.js                  # Entry point, lifecycle, multi-window orchestration
├── window.js                 # BrowserWindow factory, partitions, UA spoofing, external links
├── profiles.js               # Profile metadata store
├── desktop.js                # Per-profile .desktop file management
├── profile-dialog.js         # Modal text input dialog
├── profile-dialog-preload.js # Preload for dialog — contextBridge, no nodeIntegration
├── menu.js                   # App menu (File, Profiles, Edit, View)
├── notifications.js          # In-page → OS notification bridge (rate-limited)
├── security.js               # OS keyring check + user warning
├── updater.js                # Auto-update via electron-updater (SHA512 verified)
├── browser-check.js          # Chromium staleness warning
└── constants.js              # Frozen config object
build/
└── afterPack.js              # electron-builder hook: wrapper script generator
```

---

## License

MIT — see [LICENSE](LICENSE).