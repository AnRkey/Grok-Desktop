#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LAUNCH=0
MAKE_DMG=0

usage() {
  cat <<'EOF'
Build the unsigned macOS Grok Desktop.app.

Usage: ./build-macos.sh [--launch] [--dmg]

  --launch   Open Grok Desktop.app when the build finishes
  --dmg      Also emit DMG + ZIP (slower)
  (default)  Directory build only → build/mac-*/Grok Desktop.app

Requires Node.js LTS. The app is unsigned; this script clears the
quarantine flag before --launch. Finder may still ask you to right-click
Open the first time.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --launch|-l) LAUNCH=1 ;;
    --dmg|--release) MAKE_DMG=1 ;;
    --dir) MAKE_DMG=0 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script builds a macOS app and must run on macOS." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not on PATH. Install Node.js LTS from https://nodejs.org/" >&2
  exit 1
fi

echo "==> Installing dependencies"
npm install

export CSC_IDENTITY_AUTO_DISCOVERY=false

if [[ "$MAKE_DMG" -eq 1 ]]; then
  echo "==> Building Grok Desktop.app + DMG + ZIP"
  npx --yes electron-builder@latest --mac dmg zip
else
  echo "==> Building Grok Desktop.app"
  npx --yes electron-builder@latest --mac dir
fi

APP=""
for candidate in \
  "$ROOT/build/mac-arm64/Grok Desktop.app" \
  "$ROOT/build/mac/Grok Desktop.app" \
  "$ROOT/build/mac-universal/Grok Desktop.app"
do
  if [[ -d "$candidate" ]]; then
    APP="$candidate"
    break
  fi
done

if [[ -z "$APP" ]]; then
  echo "Build finished but Grok Desktop.app was not found under build/mac*." >&2
  exit 1
fi

echo "==> Built $APP"

if [[ "$LAUNCH" -eq 1 ]]; then
  echo "==> Launching Grok Desktop"
  pkill -f "$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" 2>/dev/null || true
  osascript -e 'tell application "Grok Desktop" to quit' >/dev/null 2>&1 || true
  sleep 0.5
  xattr -cr "$APP" 2>/dev/null || true
  open "$APP"
fi
