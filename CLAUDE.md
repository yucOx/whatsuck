# CLAUDE.md

Project-specific guidance for Claude Code working in this repository.

## What this project is

Whatsuck — a native Ubuntu desktop wrapper for WhatsApp Web, written in
plain JavaScript with Electron 35.7.5. Multi-profile (multiple WhatsApp
accounts side by side), system tray, auto-update, OS keyring integration.

## Project layout

```
src/
├── main.js              # Entry point. App lifecycle, multi-window, single-instance.
├── window.js             # BrowserWindow factory. UA spoof, external links.
├── profiles.js           # Profile metadata store (profiles.json).
├── desktop.js            # Per-profile .desktop file management.
├── profile-dialog.js     # Modal text input.
├── profile-dialog-preload.js # Preload — contextBridge, no nodeIntegration.
├── menu.js               # Application menu (File, Profiles, Edit, View, Settings).
├── notifications.js      # In-page → OS notification event bridge.
├── permissions.js        # Session permission handlers (notifications + media), single owner per session.
├── media-prompt.js       # First-use Allow/Deny modal for mic/camera.
├── media-prompt-preload.js # Preload for the media prompt — contextBridge, no nodeIntegration.
├── settings.js           # User settings store (settings.json).
├── security.js           # OS keyring availability check.
├── updater.js            # Auto-update via electron-updater.
├── browser-check.js      # Chromium staleness warning.
├── tray.js               # System tray integration.
└── constants.js          # Frozen config — single source of truth.
build/
└── afterPack.js          # electron-builder hook: wrapper script generator.
.github/workflows/
└── release.yml           # Auto-build .deb on v* tag push.
setup.sh                  # One-command install (downloads from GitHub releases).
uninstall.sh              # Interactive uninstaller.
```

## Build / run

```bash
npm install        # install deps
npm start          # dev mode (auto-update and keyring warnings skipped)
npm run build      # produces dist/whatsuck_1.0.0_amd64.deb
```

## Code conventions

- 2-space indent, single quotes, semicolons (match existing code)
- `const`/`let` only, never `var`
- `function foo()` for top-level exports, not `const foo = () =>`
- JSDoc `@param`/`@returns` on every exported function
- Constants in `src/constants.js`, never hardcoded in feature modules
- No silent error swallowing — log and either show a dialog or rethrow with context
- One responsibility per file, no globals
- Profile data and settings in `app.getPath('userData')` (i.e. `~/.config/whatsuck/`)

## Release workflow

Releases are automated via GitHub Actions. The workflow triggers on
any `v*` tag push:

```bash
# 1. Bump version in package.json (e.g. 1.0.0 → 1.0.1)
# 2. Commit: git commit -am "v1.0.1: description of changes"
# 3. Tag and push:
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

Actions runs `npm ci` → `npm run build` → creates a GitHub Release
with the `.deb` attached. Users get the update via `electron-updater`
or by re-running `setup.sh`.

**Important**: do NOT delete and recreate a tag with the same name to
re-trigger the workflow — use `git tag -f v1.0.1 && git push -f origin v1.0.1`.

## Things Claude must NOT do

- Do not modify `package-lock.json` manually. Run `npm install` instead.
- Do not pin npm dependencies to caret ranges that pull breaking changes.
  We use `electron: "35.7.5"` (exact pin) on purpose.
- Do not commit build output (`dist/`, `*.deb`, `node_modules/`).
- Do not add a `gh-pages` or auto-deploy workflow. The `.deb` is
  released via the `release.yml` workflow on tag push.
- Do not add tests without a test framework — the project doesn't
  have one and adding one should be its own PR.
- Do not change the default notification behavior. Users with `enabled: true,
  sound: true` should get a sound by default.
- Do not introduce a circular dependency between modules. `main.js`
  is the only place allowed to import from multiple feature modules.
- Do not remove the Chromium version check feed URL or staleness threshold
  from `constants.js` — they are there so we can adjust without hunting.
- Do not commit secrets. `.gitignore` already excludes `.env*`, `*.pem`,
  `*.key`, `credentials*`, `secrets.json`.
- Do not change the auto-update flow. The `autoInstallOnAppQuit` flag
  in `updater.js` is required for the update on next quit flow to work.

## Things to keep in sync

- **`package.json` version** must match the latest git tag (e.g. `v1.0.0`).
- **README badges** should reflect the current release. When bumping
  versions, check that the GitHub release link still resolves.
- **README module map** must list every file in `src/`. If you add
  a new file, add it to the tree in `README.md` (and `README.tr.md`).
- **`ARCHITECTURE.md` startup data flow** should reference the
  actual order of calls in `bootstrap()` in `main.js`.
- **Constants in `src/constants.js`** should not duplicate values
  already in other modules. Grep for the value if you're not sure.
- **`CHANGELOG.md`** is generated from GitHub releases — don't
  maintain it manually. The release workflow generates release notes
  from commit messages.
- **Turkish translation in `README.tr.md`** must mirror `README.md`
  section by section. If you add a section, add the Turkish version too.

## Pre-commit checklist for Claude

Before declaring a task done:

1. `npm run build` succeeds and produces a `.deb`
2. No new `console.log` in production code (use `console.error` for
   errors that are always logged, `console.log` only in diagnostic
   paths like tray availability)
3. No new hardcoded strings/numbers in `src/*.js` that belong in
   `src/constants.js`
4. JSDoc added to any new exported function
5. The README module map updated if a new file was added
6. The README/Turkish sections still mirror each other

## Pre-release checklist (version bumps)

1. Bump `version` in `package.json`
2. `git tag vX.Y.Z` matching the version
3. `git push origin main` then `git push origin vX.Y.Z`
4. Watch [github.com/yucOx/whatsuck/actions](https://github.com/yucOx/whatsuck/actions)
   for the release workflow to complete
5. Verify the release page shows the `.deb` attached:
   [github.com/yucOx/whatsuck/releases](https://github.com/yucOx/whatsuck/releases)
6. Spot-check: download the `.deb` and run
   `sudo dpkg -i whatsuck_X.Y.Z_amd64.deb` on a clean Ubuntu

## Security notes

- Cookies are encrypted by Chromium when a keyring (libsecret/GNOME
  Keyring) is available. The `src/security.js` warning is informational.
- `safeStorage` returns a backend identifier, not a flag. The check
  `safeStorage.isEncryptionAvailable()` is what we use.
- All update downloads go through `electron-updater` which verifies
  SHA512 hashes from `latest-linux.yml` published alongside the
  GitHub release. Don't replace this with a custom update mechanism.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
  are intentional defaults in `src/window.js`. Don't remove them.
- The profile dialog uses a preload script (`profile-dialog-preload.js`)
  with `contextBridge.exposeInMainWorld` exposing only a single
  `submit()` function. Don't add `nodeIntegration` to that window.

## Common pitfalls

- **`createTray` returns `null`** on Linux without AppIndicator. Always
  check `getTray()` before relying on tray behavior. The close handler
  in `main.js` uses `getTray()` to decide between hide-to-tray and
  minimize-to-dock.
- **`BrowserWindow.getFocusedWindow()`** returns `null` if no window
  has focus. In focus handlers, check for `null` first.
- **`win.show()`** on a minimized window also restores it. Don't call
  `restore()` after `show()` in the same handler — pick one.
- **`win.focus()`** on a hidden window does nothing. Always call
  `show()` first.
- **Linux notification sound** is controlled by the desktop environment,
  not by Electron. `silent: true` is best-effort.

## Testing

There are no automated tests. The repo is small enough that manual
testing (`npm start` against a real WhatsApp account) catches most
regressions. The defensive code paths (corrupted JSON, invalid CLI
input, unparseable URLs) are documented inline. If you add tests,
the easiest entry point is `src/profiles.js` — pure filesystem logic
with no Electron dependencies beyond `app.getPath`.

## Debugging

- `npm start` runs in dev mode (no auto-update, no keyring warning).
- For packaged-build debugging, build and install, then launch from a
  terminal: `whatsuck`. stderr is captured by the wrapper script.
- For tray behavior, check `~/.cache/whatsuck/Updater/` for the
  electron-updater log.
- For notification issues, set `notifications.enabled` to `true` in
  `~/.config/whatsuck/settings.json`. If still nothing, the desktop
  notification daemon may not be running (`pgrep -fa notification`).

<!-- cce-block-version: 4 -->
## Context Engine (CCE)

This project uses Code Context Engine for intelligent code retrieval and
cross-session memory.

### Searching the codebase

**You MUST use `context_search` instead of reading files directly** when
exploring the codebase, answering questions about code, or understanding how
things work. This is a hard requirement, not a suggestion. `context_search`
returns the most relevant code chunks with confidence scores instead of whole
files, and tracks token savings automatically.

When to use `context_search`:
- Answering questions about the codebase ("how does X work?", "where is Y?")
- Exploring structure or architecture
- Finding related code, functions, or patterns
- Any time you would otherwise read a file just to understand it

When to use `Read` instead:
- You need to edit a specific file (read before editing)
- You need the exact, complete content of a known file path

Other search tools:
- `expand_chunk` — get full source for a compressed result
- `related_context` — find what calls/imports a function

### Cross-session memory — use it actively

This project has persistent memory across Claude Code sessions. **You must
use it both ways: recall before answering, record after deciding.** Memory
that is not recorded is lost; memory that is not recalled does nothing.

**Before answering a non-trivial question, call `session_recall`.**
Especially when:
- The question touches architecture, design, or naming choices
- The user asks "what / why / how did we ..."
- You are about to recommend an approach the team may have already chosen
  or already rejected

Pass a topic phrase, not a single word — e.g. `session_recall("auth flow")`,
not `session_recall("auth")`. Recall is vector-similarity-based, so paraphrases
match. If recall returns relevant entries, lead with them ("Per a prior
decision: ...") instead of re-deriving the answer.

**After making a non-obvious decision, call `record_decision`.** Especially:
- Choosing one library / pattern / approach over another
- Resolving an ambiguity in the spec or requirements
- Establishing a convention the project should follow going forward
- Anything you would not want to re-litigate next session

Format: `record_decision(decision="...", reason="...")`. Keep both fields
short and specific — they are surfaced verbatim at the start of future
sessions.

**After meaningful work in a file, call `record_code_area`.** Especially when:
- You added or substantially modified a function/class
- You traced through a non-obvious flow and want future-you to find it fast

Format: `record_code_area(file_path="...", description="...")`.

Skip recording for trivial reads, formatting changes, or one-off lookups —
the goal is durable signal, not an event log.

### Drilling deeper from a recall hit

`session_recall` results are tagged with the source session id, e.g.
`[turn sid:abc123|n:5]`. To drill in:

- `session_timeline(session_id="abc123")` — walk the per-turn summaries of
  that session in order. Use this when the user asks "what was the
  reasoning?" or "how did we get there?".
- `session_event(event_id=N)` — fetch a specific tool event's raw input
  and output (capped at 4 KB at read time). Use this when a turn summary
  references a tool result you actually need to inspect.

Both are read-only and cheap. Prefer them over re-running tool calls or
asking the user to re-paste context.

### Output style

Respond in compressed style. Drop articles (a, an, the) in prose. Use
sentence fragments over full sentences. Use short synonyms (fix not resolve,
check not investigate). Pattern: [thing] [action] [reason]. [next step].
No filler, hedging, pleasantries, trailing summaries, or restating what
the user said. One sentence if one sentence is enough.

When suggesting code changes, show only the changed lines with 3 lines of
context. Never rewrite entire files. Multiple changes in one file: show each
change separately. Never echo back unchanged code the user already has.

Code blocks, file paths, commands, error messages: always written in full.
Security warnings and destructive action confirmations: use full clarity.
<!-- /cce-block -->
