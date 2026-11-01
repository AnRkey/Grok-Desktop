# Contributing

Use Node.js 24 and npm. Clone the repository, check out `development`, and run `npm ci`.

Run `npm test` for the policy regressions and `npm run test:electron` for an independent runtime check using isolated offline fixture pages and a temporary profile. Linux runtime tests need a graphical session or Xvfb and an X11 window manager. Run `npm audit` before committing dependency updates.

Start the real app with `npm start`. Build Windows installers with `npm run build`, the portable EXE with `npm run build-portable`, or unpacked files with `npm run build-dir`. On Linux, use `npm run build-linux` for RPM and DEB packages. All outputs go to `build/`; publication is disabled. `build.bat` wraps Windows builds and can build Linux packages in Docker. The development GitHub workflow validates both platforms and retains test artifacts.

Keep remote pages sandboxed and free of Node access. Add privileged operations to the preload allowlist and validate the sender in main. Use parsed URL policies for navigation and external browser requests. Test changes against the reported behavior and include clear reproduction and validation notes in commits or PRs.

Version 1.3.0 is maintenance only. Feature PRs stay deferred. Do not tag, merge for release, or publish until John approves his VM test. See `docs/validation-1.3.0.md` and `docs/releases/1.3.0.md`.

Deliver test installers directly in the root of `build/`. Before handing a build to John, clear out superseded deliverables and generated subdirectories so the current build is obvious. Preserve older outputs outside `build/` in ignored `.tmp/` when reversible cleanup is needed. Confirm installer hashes after moving files. Do not send John into nested build folders.
