<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Whatsuck icon">
</p>

<h1 align="center">Whatsuck</h1>

<p align="center">
  <strong>WhatsApp Web as a native Ubuntu desktop app.</strong><br>
  Multiple accounts at once. Real notifications. Auto-update. All in one ~85 MB package.
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

---

## Why Whatsuck?

A browser tab gets you most of the way to a WhatsApp desktop experience — until you try to actually live in it.

| Browser tab | Whatsuck |
|---|---|
| ❌ Close the tab, lose notifications | ✅ Background process, notifications always on |
| ❌ One WhatsApp number at a time | ✅ Multiple profiles, side by side |
| ❌ "Works with Chrome 85+" warning | ✅ Bundled Chromium 130+, no warnings |
| ❌ Cookies cleared on browser reset | ✅ Encrypted with OS keyring, persist across restarts |
| ❌ No app launcher entry | ✅ Real `.desktop` integration per profile |
| ❌ No auto-update | ✅ Downloads and installs in the background |

The headline feature is **multiple WhatsApp accounts at once**. Each profile is a fully isolated session (separate cookies, localStorage, IndexedDB, HTTP cache), so you can log into your personal number in one window and your work number in another — without incognito windows, without a second browser, without logging out.

---

## ✨ Features

### 💬 Built for WhatsApp

- **Multi-profile** — run two or more WhatsApp accounts side by side, each in its own isolated session
- **Pin to desktop** — pin any profile to your app menu as "Whatsuck (Work)"
- **Default profile** — choose which account opens on bare launch
- **Real notifications** — incoming messages hit the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon
- **Notification settings** — toggle notifications on/off, and sound on/off, from the Settings menu
- **External links** — URLs in chat open in your default browser, not inside the app

### 🖥️ System integration

- **System tray** — close the window to keep the app running in the background; click the tray icon to bring it back
- **Single instance** — clicking the app launcher again focuses the existing window instead of opening a duplicate
- **Minimize-to-dock** — on systems without a working tray (GNOME Wayland), closing the window minimizes to the taskbar instead of quitting
- **External links** — URLs open in your default browser, not inside the app

### 🔐 Security

- **Auto-update** — checks GitHub releases, downloads in background, SHA512-verified
- **OS keyring** — session cookies encrypted with GNOME Keyring / KWallet when available
- **Strict sandboxing** — `contextIsolation`, `sandbox`, `webSecurity=true`, no `nodeIntegration`, no `webviewTag`
- **Isolated dialogs** — profile input uses preload + `contextBridge`; renderer has zero Node.js access
- **External links** — only `http`/`https` to non-WhatsApp hosts leave the app
- **Rate-limited notifications** — 1/second max, prevents OS notification DoS

### ⚙️ Technical

- **Menu bar always visible** — toggle from View menu; Alt key brings it back when hidden
- **Keyboard shortcuts** — `Ctrl+R` reload, `Ctrl+N` new window, `F12` DevTools
- **CLI profiles** — `whatsuck --profile=work` opens a specific account
- **Browser staleness warning** — alerts if bundled Chromium is 2+ major versions behind
- **~85 MB `.deb`** — self-contained, no external runtime needed
- **Robust error handling** — corrupted profile files are auto-backed-up; bad CLI input falls back gracefully

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

The setup script:
- ✅ Checks for `curl`/`wget` and `dpkg`
- ✅ Downloads the latest `.deb` from GitHub releases
- ✅ Installs system-wide via `sudo dpkg -i`
- ✅ Whatsuck appears in your application menu

### Manual install

```bash
sudo dpkg -i whatsuck_1.0.0_amd64.deb
sudo apt-get install -f   # resolve missing runtime deps
```

### Uninstall

```bash
./uninstall.sh
```

The uninstaller asks interactively whether to keep or delete your WhatsApp session data (profiles, cookies, logins). Reinstalling later preserves your sessions if you keep the data.

---

## 👥 Multiple WhatsApp Accounts

Each profile is a fully isolated WhatsApp session. Open the menu bar and click **Profiles**:

| Menu item | What it does |
|---|---|
| New Profile… | Creates a new session and opens a fresh WhatsApp window |
| Rename… | Changes the display name of the current profile |
| Delete | Permanently erases the profile's session data |
| Set as Default | Which profile opens on bare launch |
| Pin to Desktop | Adds a `.desktop` entry so the profile appears in the app launcher |

### Command line

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

## 🔒 Security & Privacy

### What's on disk

| Data | Encryption |
|---|---|
| Cookies (session token) | OS keyring when available |
| IndexedDB / LocalStorage | Plain text (LevelDB/SQLite) |
| App preferences | Plain text |

### Who can read it

| Access level | Risk |
|---|---|
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

### Reporting a vulnerability

Open a private security advisory on GitHub, or email `yucOx@users.noreply.github.com`. Please don't file public issues for security bugs.

---

## 🛠️ Developing

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
npm install
npm start        # dev mode (auto-update and keyring warnings skipped)
npm run build    # produces dist/whatsuck_1.0.0_amd64.deb
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module map and data flow.

---

## ❓ FAQ

**Notifications don't appear.** Make sure `libnotify-bin` is installed: `sudo apt install libnotify-bin`. On minimal Ubuntu Server, the notification daemon may not be running.

**I deleted a profile by accident.** Undelete isn't supported — the session data is gone. Re-create the profile and re-scan the QR code.

**WhatsApp shows "browser not supported".** The bundled Chromium may be too old. Wait for an app update, or open an issue.

**Multi-account doesn't work.** Each profile needs a unique phone number. WhatsApp Web enforces one number per browser session, which is exactly what partitions give us.

**Auto-update is broken.** Check `~/.config/whatsuck/Updater/` for the download log. If releases are missing, the GitHub release might not have a `.deb` attached.

**Can I install on a Mac?** Not yet — only Ubuntu/Debian `.deb` is built. Windows support is on the roadmap.

---

## 🗺️ Roadmap

- [ ] macOS and Windows builds
- [ ] Per-profile notification sound
- [ ] Tray icon with unread badge
- [ ] Auto-quit when all windows closed (optional toggle)
- [ ] Search across all profiles in one window
- [ ] Theme customization

---

## 🤝 Contributing

PRs welcome. The codebase is small (~700 LOC across 12 files in `src/`); see [ARCHITECTURE.md](ARCHITECTURE.md) for the module map. Before opening a PR:

1. Run `npm run build` and verify the `.deb` still installs
2. Test your change in dev mode (`npm start`)
3. Open an issue first for non-trivial changes

Bug reports: open an issue with the output of `whatsuck --version`, your Ubuntu version, and how to reproduce.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

---

## 📄 License

MIT — see [LICENSE](LICENSE).