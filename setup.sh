#!/bin/bash
# Whatsuck setup script
#
# Clones the repository, builds the .deb, and installs it on the
# current Ubuntu/Debian system. Designed for first-time users.
#
# Usage:
#   ./setup.sh
#   ./setup.sh --uninstall
#   ./setup.sh --rebuild
#
# Requirements: git, node 18+, npm, dpkg, sudo.
set -euo pipefail

REPO_URL="https://github.com/yucOx/whatsuck.git"
PROJECT_DIR="whatsuck"
APP_ID="com.whatsuck.app"
DEB_FILE="dist/whatsuck_1.0.0_amd64.deb"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "  \033[34m→\033[0m %s\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
err()  { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; }

# ---- Uninstall path ----
# Forwards to uninstall.sh which asks the user interactively
# whether to delete session data, pinned shortcuts, etc.
if [[ "${1:-}" == "--uninstall" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -x "$SCRIPT_DIR/uninstall.sh" ]]; then
    exec "$SCRIPT_DIR/uninstall.sh"
  fi
  err "uninstall.sh not found next to setup.sh"
  exit 1
fi

# ---- Pre-flight checks ----
bold "Whatsuck setup"
echo

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required tool: $1"
    err "Install with: sudo apt install ${2:-$1}"
    exit 1
  fi
}

info "Checking prerequisites"
need git
need node
need npm
need dpkg
ok "All prerequisites present"

# Check Node version (need 18+ for electron-builder 26).
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if (( NODE_MAJOR < 18 )); then
  err "Node 18+ required (found v$(node -v))"
  exit 1
fi
ok "Node $(node -v)"

# ---- Clone or refresh ----
if [[ -d "$PROJECT_DIR" ]]; then
  info "Found existing checkout"
  cd "$PROJECT_DIR"
  if [[ "${1:-}" == "--rebuild" ]] || [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    info "Pulling latest changes"
    git pull --rebase --autostash
    ok "Updated to latest"
  else
    info "Working tree clean and no --rebuild; keeping current code"
  fi
else
  info "Cloning $REPO_URL"
  git clone --depth 1 "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
  ok "Cloned"
fi

# ---- Install npm deps ----
if [[ ! -d node_modules ]]; then
  info "Installing npm dependencies"
  npm install --no-audit --no-fund
  ok "npm install"
else
  info "node_modules already present, skipping"
fi

# ---- Build ----
# On a fresh clone we have no .deb. On --rebuild we wipe the previous
# artifact so we actually get the new version. dpkg -i will then
# upgrade-in-place over the previously installed package (no need to
# uninstall first; it preserves /opt/Whatsuck and user data).
if [[ ! -f "$DEB_FILE" ]] || [[ "${1:-}" == "--rebuild" ]]; then
  if [[ -f "$DEB_FILE" ]] && [[ "${1:-}" == "--rebuild" ]]; then
    info "Removing previous build artifact (--rebuild)"
    rm -f "$DEB_FILE"
    rm -rf dist/linux-unpacked dist/latest-linux.yml
  fi
  info "Building .deb (this downloads Electron, ~150 MB; one-time)"
  npm run build
  ok "Build complete"
else
  info ".deb already built, reusing (use --rebuild to force)"
fi

# ---- Install / upgrade ----
# dpkg -i on an already-installed package performs an in-place
# upgrade: files in /opt/Whatsuck/ get replaced, session data in
# ~/.config/whatsuck/ is preserved. The running app must be
# closed first; we warn the user below.
if dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
  info "Existing Whatsuck install detected — this will upgrade it"
  info "(close any running Whatsuck window first)"
else
  info "Fresh install"
fi
sudo dpkg -i "$DEB_FILE"
# dpkg may stop with missing runtime deps; finish with apt.
if ! dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
  info "Resolving runtime dependencies via apt"
  sudo apt-get install -f -y
fi
ok "Installed"

bold ""
bold "Whatsuck is ready."
echo
echo "  Run from the application menu (search 'Whatsuck'),"
echo "  or from a terminal:  whatsuck"
echo "  Open a specific profile:  whatsuck --profile=work"
echo
echo "  Re-run this script with --uninstall to remove the app"
echo "  and wipe all session data."
echo
