#!/bin/bash
# Whatsuck uninstall script
#
# Removes the Whatsuck application. Asks the user whether to keep
# or delete session data (WhatsApp logins, profile settings, cache).
#
# Usage:
#   ./uninstall.sh
set -euo pipefail

APP_ID="com.whatsuck.app"
CONFIG_DIR="$HOME/.config/whatsuck"
CACHE_DIR="$HOME/.cache/whatsuck"
DESKTOP_DIR="$HOME/.local/share/applications"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "  \033[34m→\033[0m %s\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m⚠\033[0m %s\n" "$*"; }

bold "Whatsuck Uninstaller"
echo

# ---- Step 1: Remove the package ----
if dpkg -l "$APP_ID" 2>/dev/null | grep -q "^ii"; then
  info "Whatsuck is installed. Removing package…"
  sudo dpkg -r "$APP_ID" && ok "Package removed"
else
  info "Whatsuck package not found (already removed or not installed via dpkg)"
fi

# ---- Step 2: Ask about session data ----
if [[ -d "$CONFIG_DIR" ]] || [[ -d "$CACHE_DIR" ]]; then
  echo
  warn "WhatsApp session data found:"
  [[ -d "$CONFIG_DIR" ]] && info "  • $CONFIG_DIR  (profiles, cookies, WhatsApp logins)"
  [[ -d "$CACHE_DIR" ]]  && info "  • $CACHE_DIR   (temp files, shared memory)"
  echo
  echo "  Bu verileri silmek tüm WhatsApp oturumlarınızı sıfırlar."
  echo "  Silmezseniz Whatsuck'u tekrar kurduğunuzda oturumlarınız korunur."
  echo "  Deleting this data resets all WhatsApp sessions."
  echo "  Keeping it preserves your sessions if you reinstall."
  echo
  read -r -p "  Session verisi silinsin mi? / Delete session data? [y/N] " answer
  case "$answer" in
    [yY]|[yY][eE][sS])
      rm -rf "$CONFIG_DIR" && ok "Session data deleted (~/.config/whatsuck)"
      rm -rf "$CACHE_DIR"  && ok "Cache deleted (~/.cache/whatsuck)"
      ;;
    *)
      info "Session data preserved. Reinstall Whatsuck to reuse it."
      ;;
  esac
else
  info "No session data found"
fi

# ---- Step 3: Ask about pinned desktop files ----
pinned_files=()
if [[ -d "$DESKTOP_DIR" ]]; then
  while IFS= read -r -d '' f; do
    pinned_files+=("$f")
  done < <(find "$DESKTOP_DIR" -maxdepth 1 -name 'whatsuck-*.desktop' -print0 2>/dev/null)
fi

if [[ ${#pinned_files[@]} -gt 0 ]]; then
  echo
  warn "Pinned profile shortcuts found:"
  for f in "${pinned_files[@]}"; do
    info "  • $(basename "$f")"
  done
  echo
  read -r -p "  Pinlenmiş kısayollar silinsin mi? / Delete pinned shortcuts? [y/N] " answer
  case "$answer" in
    [yY]|[yY][eE][sS])
      rm -f "${pinned_files[@]}" && ok "Pinned shortcuts deleted"
      ;;
    *)
      info "Pinned shortcuts preserved"
      ;;
  esac
fi

# ---- Done ----
echo
bold "Whatsuck has been uninstalled."
if [[ -d "$CONFIG_DIR" ]] || [[ -d "$CACHE_DIR" ]] || [[ ${#pinned_files[@]} -gt 0 ]]; then
  info "Some data was kept. To fully remove later:"
  [[ -d "$CONFIG_DIR" ]] && echo "  rm -rf $CONFIG_DIR"
  [[ -d "$CACHE_DIR" ]]  && echo "  rm -rf $CACHE_DIR"
  [[ ${#pinned_files[@]} -gt 0 ]] && echo "  rm $DESKTOP_DIR/whatsuck-*.desktop"
fi
echo