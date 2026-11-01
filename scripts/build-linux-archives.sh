#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p "require('./package.json').version")
if [ ! -f build/linux-unpacked/resources/app.asar ]; then
  echo 'Package the Linux application first (npm run build-linux).' >&2
  exit 1
fi
tar -czf "build/Grok-Desktop_Linux-v${version}.tar.gz" -C build/linux-unpacked .
temporary_archive="$(pwd)/build/Grok-Desktop_Linux-v${version}.$$.7z"
(
  cd build/linux-unpacked
  7z a -t7z "$temporary_archive" ./* -mx=9 >/dev/null
  7z t "$temporary_archive" >/dev/null
)
mv -f "$temporary_archive" "build/Grok-Desktop_Linux-v${version}.7z"
echo "Created Linux tar.gz and 7z archives for $version. Publishing is disabled."
