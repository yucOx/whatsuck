'use strict';

const fs = require('fs');
const path = require('path');

/**
 * electron-builder afterPack hook.
 *
 * Replaces the bare Electron binary in the output directory with a
 * wrapper shell script that sets TMPDIR before launch. This is needed
 * because Chromium child processes (renderer, GPU) do NOT inherit
 * process.env.TMPDIR set from Node.js — they read it from their own
 * environment at fork time, which is determined by the parent's env
 * at exec time, not at runtime.
 *
 * The wrapper:
 *   1. Creates ~/.cache/whatsuck/tmp if missing
 *   2. Sets TMPDIR to that directory
 *   3. exec's the real binary (renamed to whatsuck.bin)
 *
 * This guarantees ALL Chromium processes use the non-quota temp dir.
 */
exports.default = async function afterPack(context) {
  const appDir = context.appOutDir;
  const binaryPath = path.join(appDir, 'whatsuck');
  const renamedPath = path.join(appDir, 'whatsuck.bin');

  if (!fs.existsSync(binaryPath)) {
    return;
  }

  // Move the real binary aside.
  fs.renameSync(binaryPath, renamedPath);

  // Build the Chrome User-Agent. process.versions.chrome returns
  // the full version like "130.0.6723.69". Chrome UA format is
  // Chrome/Major.0.Build.Patch, but for the UA gate all that
  // matters is the major version being >= 85.
  const chromeVersion = process.versions.chrome || '130.0.0.0';
  const major = chromeVersion.split('.')[0];
  const chromeUA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;

  // Write the wrapper script in place of the original binary.
  // --no-sandbox is passed as a CLI arg because the SUID sandbox
  // check happens before app.commandLine.appendSwitch takes effect.
  // --disable-dev-shm-usage redirects /dev/shm to TMPDIR for the
  // same quota reason.
  // --user-agent is set as a Chromium CLI flag (not via JS) because
  // WhatsApp Web's UA gate runs before navigator.userAgent is
  // overridden by webContents.setUserAgent.
  //
  // We use readlink -f to resolve any symlinks (e.g. when launched
  // via /usr/bin/whatsuck which is a symlink to /opt/Whatsuck/whatsuck).
  // Without this, dirname "$0" would give /usr/bin and look for
  // /usr/bin/whatsuck.bin which doesn't exist.
  const wrapper = [
    '#!/bin/bash',
    'set -e',
    'WHATSUCK_HOME="${XDG_CACHE_HOME:-$HOME/.cache}/whatsuck"',
    'mkdir -p "$WHATSUCK_HOME/tmp"',
    'export TMPDIR="$WHATSUCK_HOME/tmp"',
    `SELF="$(readlink -f "$0")"`,
    `exec "$(dirname "$SELF")/whatsuck.bin" --no-sandbox --disable-dev-shm-usage --user-agent="${chromeUA}" "$@"`,
    '',
  ].join('\n');

  fs.writeFileSync(binaryPath, wrapper, { mode: 0o755 });
};