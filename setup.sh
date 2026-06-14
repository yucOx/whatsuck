#!/bin/bash
# Whatsuck setup script
#
# Downloads the latest .deb from GitHub releases and installs it.
# No git, node, or npm needed — just curl/wget and dpkg.
#
# Usage:
#   ./setup.sh              # Download latest release and install
#   ./setup.sh --uninstall  # Remove Whatsuck (interactive)
#
# Requirements: curl or wget, dpkg, sudo.
set -euo pipefail

REPO="yucOx/whatsuck"
APP_ID="com.whatsuck.app"
RELEASES_API="https://api.github.com/repos/${REPO}/releases/latest"
TMPDIR_SETUP="/tmp/whatsuck-setup-$$"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "  \033[34m→\033[0m %s\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
err()  { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; }

cleanup() { rm -rf "$TMPDIR_SETUP" 2>/dev/null || true; }
trap cleanup EXIT

# ---- Uninstall path ----
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
need dpkg
need sudo

# Need curl or wget for downloading.
if command -v curl >/dev/null 2>&1; then
  DL="curl -sL"
elif command -v wget >/dev/null 2>&1; then
  DL="wget -qO-"
else
  err "Missing required tool: curl or wget"
  err "Install with: sudo apt install curl"
  exit 1
fi
ok "All prerequisites present"

# ---- Find latest release ----
info "Checking for the latest release"
mkdir -p "$TMPDIR_SETUP"

RELEASE_JSON="$TMPDIR_SETUP/release.json"
if ! $DL "$RELEASES_API" -o "$RELEASE_JSON" 2>/dev/null; then
  err "Could not reach GitHub releases API"
  err "Check your internet connection and try again"
  exit 1
fi

# Extract the .deb download URL from the release JSON.
# Works with basic grep/sed — no jq dependency.
DEB_URL=$(grep -o '"browser_download_url": *"[^"]*\.deb"' "$RELEASE_JSON" \
  | head -1 \
  | sed 's/.*"browser_download_url": *"\(.*\)"/\1/')

if [[ -z "$DEB_URL" ]]; then
  err "No .deb found in the latest release"
  err "Make sure a release with a .deb asset is published at:"
  err "  https://github.com/${REPO}/releases"
  exit 1
fi

DEB_NAME=$(basename "$DEB_URL")
DEB_PATH="$TMPDIR_SETUP/$DEB_NAME"
ok "Latest release found"

# ---- Download ----
info "Downloading $DEB_NAME"
if command -v curl >/dev/null 2>&1; then
  curl -L --progress-bar -o "$DEB_PATH" "$DEB_URL"
else
  wget -q --show-progress -O "$DEB_PATH" "$DEB_URL"
fi
ok "Download complete"

# ---- Install / upgrade ----
if dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
  info "Existing Whatsuck install detected — upgrading"
  info "(close any running Whatsuck window first)"
else
  info "Fresh install"
fi

info "Installing system-wide (sudo required)"
sudo dpkg -i "$DEB_PATH"
# dpkg may stop with missing runtime deps; finish with apt.
if ! dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
  info "Resolving runtime dependencies via apt"
  sudo apt-get install -f -y
fi
ok "Installed"

# ---- Done ----
bold ""
bold "Whatsuck is ready."
echo
echo "  Uygulama menüsünden çalıştırın (search 'Whatsuck'),"
echo "  veya terminalden:  whatsuck"
echo "  Belirli bir profil açın:  whatsuck --profile=work"
echo
echo "  Run from the application menu (search 'Whatsuck'),"
echo "  or from a terminal:  whatsuck"
echo "  Open a specific profile:  whatsuck --profile=work"
echo
echo "  Kaldırmak için:  ./uninstall.sh"
echo "  To uninstall:   ./uninstall.sh"
echo