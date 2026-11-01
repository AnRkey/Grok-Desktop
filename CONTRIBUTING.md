# Contributing

Use Node.js 24 and npm. Clone the repository, check out `development`, and run `npm ci`.

Run `npm test` for the policy regressions and `npm run test:electron` for an independent runtime check using isolated offline fixture pages and a temporary profile. Linux runtime tests need a graphical session or Xvfb and an X11 window manager. Run `npm audit` before committing dependency updates.

Start the real app with `npm start`. Build Windows installers with `npm run build`, the portable EXE with `npm run build-portable`, or unpacked files with `npm run build-dir`. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-archives.ps1` after packaging to create Windows ZIP/7z archives; install 7-Zip first. On Linux, use `npm run build-linux` for RPM and DEB packages, then `bash scripts/build-linux-archives.sh` for tar.gz/7z (requires `tar` and `7z`). All outputs go to `build/`; publication is disabled. `build.bat win` creates the five Windows types, `build.bat linux` creates DEB/RPM/7z/tar.gz in Docker, and `build.bat all` runs both. The development GitHub workflow validates both platforms and retains all nine package/archive types.

Keep remote pages sandboxed and free of Node access. Add privileged operations to the preload allowlist and validate the sender in main. Use parsed URL policies for navigation and external browser requests. Test changes against the reported behavior and include clear reproduction and validation notes in commits or PRs.

Version 1.3.0 is maintenance only. Feature PRs stay deferred for later versions. John confirmed Windows VM authentication/sign-out and approved publication. Preserve all nine agreed package types and build from the release source so About credits and metadata are included. Packaging never publishes automatically; public releases require the maintainer's approval. See `docs/validation-1.3.0.md` and `docs/releases/1.3.0.md`.

Deliver test installers directly in the root of `build/`. Before handing a build to John, clear out superseded deliverables and generated subdirectories so the current build is obvious. Preserve older outputs outside `build/` in ignored `.tmp/` when reversible cleanup is needed. Confirm installer hashes after moving files. Do not send John into nested build folders.
