#!/bin/bash
# Wrapper script: sets TMPDIR to a non-quota filesystem before launching
# the Electron binary. Required on Ubuntu installs where /dev/shm and
# /tmp are mounted with usrquota, which makes Chromium's shm_open fail
# with ESRCH.
set -e
WHATSUCK_HOME="${XDG_CACHE_HOME:-$HOME/.cache}/whatsuck"
mkdir -p "$WHATSUCK_HOME/tmp"
export TMPDIR="$WHATSUCK_HOME/tmp"
exec "/opt/Whatsuck/whatsuck" "$@"
