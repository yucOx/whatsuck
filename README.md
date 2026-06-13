# Whatsuck

A native Ubuntu desktop client for [WhatsApp Web](https://web.whatsapp.com). Wraps the web app in an Electron shell, packages it as a `.deb`, and integrates with the OS so it shows up in the application menu, in the dock/taskbar, and — for incoming messages — as a real notification with the app's own icon.

## Features

- **Native notifications** – Incoming messages appear in the OS notification center (libnotify / GNOME Shell / KDE) with the Whatsuck icon. Clicking a notification focuses the main window.
- **Real `.deb` package** – Install with `dpkg`, uninstall with `apt remove`. Registers a `.desktop` file so the app appears in your app menu.
- **Auto-hide menu bar** – The app menu is hidden by default; press `Alt` to reveal it. `F12` opens DevTools, `Ctrl+R` reloads.
- **Small surface** – No custom UI, no analytics, no telemetry. The wrapper does three things and stops: load URL, bridge notifications, install menu.

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

## Develop

```bash
npm install
npm start
```

This launches the app in dev mode with the same code path as the packaged build.

## Build

```bash
npm run build
```

Produces `dist/whatsuck_1.0.0_amd64.deb`.

## Architecture

```
src/
├── main.js           # Entry point: app lifecycle, CLI switches
├── window.js         # BrowserWindow factory for WhatsApp Web
├── notifications.js  # In-page Notification → OS notification bridge
├── menu.js           # App menu template (Reload, DevTools, etc.)
└── constants.js      # Frozen config object (URL, dimensions, paths)
```

Each module has a single responsibility and is the only file that imports its private concern. `main.js` orchestrates; it doesn't do work itself.

### How the notification bridge works

WhatsApp Web runs in a `BrowserWindow` like any other page. Its `new Notification(...)` calls don't reach the OS automatically. `src/notifications.js` does two things on the window's `webContents`:

1. **`setPermissionRequestHandler`** auto-grants the `notifications` permission, so the page can call `Notification.requestPermission()` without prompting the user through the in-page flow.
2. **`webContents.on('notification', ...)`** catches the in-page notification event and re-emits it as a native `Notification`, with the app icon, so the desktop shell (Unity, GNOME Shell, KDE) shows it as a real toast.

Click handlers focus the existing window rather than spawning a second one.

## License

MIT
