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
if [[ "${1:-}" == "--uninstall" ]]; then
  bold "Uninstalling Whatsuck"
  if dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
    sudo dpkg -r "$APP_ID" && ok "Package removed"
  else
    info "Package not installed via dpkg"
  fi
  if [[ -d "$HOME/.config/whatsuck" ]]; then
    rm -rf "$HOME/.config/whatsuck" && ok "Session data wiped (~/.config/whatsuck)"
  fi
  if [[ -d "$HOME/.cache/whatsuck" ]]; then
    rm -rf "$HOME/.cache/whatsuck" && ok "Cache wiped (~/.cache/whatsuck)"
  fi
  rm -f "$HOME/.local/share/applications"/whatsuck-*.desktop 2>/dev/null && ok "Pinned .desktop files removed" || true
  bold "Done."
  exit 0
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
  if [[ "${1:-}" == "--rebuild" ]] || [[ -n "$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null)" ]]; then
    info "Reusing existing checkout"
  fi
else
  info "Cloning $REPO_URL"
  git clone --depth 1 "$REPO_URL" "$PROJECT_DIR"
  ok "Cloned"
fi
cd "$PROJECT_DIR"

# ---- Install npm deps ----
if [[ ! -d node_modules ]]; then
  info "Installing npm dependencies"
  npm install --no-audit --no-fund
  ok "npm install"
else
  info "node_modules already present, skipping"
fi

# ---- Build ----
if [[ ! -f "$DEB_FILE" ]]; then
  info "Building .deb (this downloads Electron, ~150 MB; one-time)"
  npm run build
  ok "Build complete"
else
  info ".deb already built, reusing (use --rebuild to force)"
fi

# ---- Install ----
info "Installing system-wide (sudo required)"
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
