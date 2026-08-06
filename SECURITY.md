# Security Policy

## Reporting a vulnerability

**Do not file a public issue for security bugs.** Instead, either:

- open a **private security advisory** on
  [github.com/yucOx/whatsuck/security/advisories/new](https://github.com/yucOx/whatsuck/security/advisories/new), or
- email `yucox@yuxor.ltd`.

Please include a description of the issue, steps to reproduce, and the impact.
We'll acknowledge the report **within 72 hours** and work with you on a fix and
disclosure timeline.

## Scope

In scope: the Whatsuck Electron shell — anything in `src/`, `build/`, or the
install/update flow. This includes the permission model, the auto-update
verification, sandbox/renderer isolation, and the `setup.sh` / `uninstall.sh`
scripts.

Out of scope:

- **WhatsApp Web itself** (`web.whatsapp.com`) — that is Meta's product; report
  issues there. Whatsuck is a thin shell that loads the same page a browser would.
- Vulnerabilities in **Electron or Chromium** upstream — report them to their
  respective projects. Whatsuck pins Electron to a specific version; an upstream
  Chromium CVE is fixed by bumping that pin in a release.
- Issues requiring physical access to an unlocked machine, or root — the app
  cannot protect session data against `sudo` or a stolen unencrypted disk (see
  the "Who can read it" table in the README).

## Supported versions

Only the **latest release** receives security fixes. Whatsuck ships as a single
`.deb` and auto-updates by default — keep auto-update on, or re-run `setup.sh`.

| Version | Supported |
|---|---|
| Latest `v*` release | ✅ |
| Anything older | ❌ — update |

## Update integrity

Updates are delivered over HTTPS from GitHub Releases. `electron-updater`
verifies the **SHA512** hash of each downloaded `.deb` against `latest-linux.yml`
published alongside the release before installing. A network attacker cannot
substitute a different binary.

## Data and telemetry

Whatsuck collects **no analytics, no usage data, no crash reports**. The only
network calls are WhatsApp Web itself and the GitHub releases API (update check).
All session data stays local under `~/.config/whatsuck/`. Cookies are encrypted
with the OS keyring (GNOME Keyring / KWallet) when `libsecret` is available; the
app warns at first launch if it is missing.
