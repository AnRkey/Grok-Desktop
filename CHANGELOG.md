# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.


## [1.3.0] - Unreleased (VM verified; publication paused)

### Fixed
- Finish Grok sign-out through the final Grokipedia cookie-deletion handoff so the tab can return to the signed-out page.
- Keep GitHub OAuth login and verification routes inside the app session while repository links continue to open in the browser.
- Allow trusted cookie-deletion handoffs during sign-out so the active Grok page can show the signed-out state without restarting the app.
- Complete the xAI cookie handoff after Google verification so the original login tab can finish instead of remaining blank on Redirecting.
- Keep Google, YouTube and regional Google cookie handoffs and Grok auth cookies inside the app session; prevent automatic redirects opening external browser sessions.
- Windows hardware acceleration no longer uses Linux-only GPU probes (PR #33; report #26).
- Search results requesting a new window open as background Grok tabs (#14).
- Restore Inspect Element to context menus, including webviews (#13).
- Preserve OAuth popup openers and the persistent login session (#25, #26); Google, Apple, X and GitHub sign-in and Grok sign-out verified in the maintainer's Windows VM.
- Start AOT off and synchronize its button with real window state (PR #35); fix Linux toggling off.
- Fix Windows About file URLs, duplicate tab IDs, and content clipping below the toolbar.
- Show unavailable usage services separately from authentication errors and clear stale warning colors.
- Remove README merge markers and references to deleted build guides.

### Security
- Upgrade Electron from 39.1.2 to 45.2.1, including Chromium/Node and upstream security fixes.
- Replace URL substring matching with exact parsed HTTPS host checks (CodeQL alert #6).
- Centralize OS browser URL validation; block unsafe schemes, credentials and local/numeric hosts.
- Enable sandboxing/context isolation and disable Node in the shell, webviews and OAuth popups.
- Expose only allowlisted IPC through preload and validate the sending frame in main.
- Restrict media to Grok with user consent; deny unrelated/device permissions and select screen-share sources explicitly.
- Use execFile and native window IDs for Linux wmctrl; remote page titles never enter shell commands.
- Lock build tools and patched ASAR, universal, minimatch and glob dependencies; remove unused electron-tabs and stale overrides.

### Changed
- Credit contributors by their GitHub handles on the in-app About page.
- Source version 1.3.0; VM verification completed and publication paused at the maintainer's request.
- Require Node.js 24 for development; correct package license metadata to GPL-2.0-only.
- Build scripts use local electron-builder 26.18.0 with publication disabled.
- Add independent policy and Electron runtime regression checks and development build artifacts.
- Preserve nine package/archive types, including Windows ZIP/7z and Linux DEB/RPM/7z/tar.gz.
- Imagine report #22 still needs verification; #31 has no reproduction details.

## [1.2.5] - 2025-12-17

### Fixed
- **Usage Stats 403 Error** - Fixed "Login required" error on Windows 11 by executing API fetch in webview context instead of main process
  - Thanks to Joshua Wang (@JoshuaWang2211) for identifying the root cause and suggesting the solution
  - API calls now run in the authenticated Grok tab context with proper session cookies and headers
  - Resolves GitHub Issue #11

### Changed
- Bump version to 1.2.5

## [1.2.4] - 2025-12-14

### Security
- **Domain Bypass Protection** - Prevents malicious subdomain attacks on trusted domains
- **Enhanced External URL Validation** - Validates protocols, hostnames, and blocks localhost/private IPs
- **Secure Update URL Validation** - Ensures GitHub release URLs are legitimate before storage
- **OAuth Domain Support** - Allows Google, Apple, and X OAuth flows to remain in-app instead of opening external browsers
- **Shortcut keys and mouse** - Added more shortcut key and mouse scroll support to tab functionality.
- **Live stats** - Added live status stats bar.

### Changed
- Bump version to 1.2.4
## [1.2.3] - 2025-11-08

### Added
- Reload button functionality and styles in the application UI
- MSI installer option added to the build script

### Changed
- Enhanced build process and artifact naming conventions; improved error handling in build script
- Added explicit compression setting to builds
- Bump version to 1.2.3

## [1.2.2] - 2025-09-20

### Security
- Updated Electron to 35.7.5 to address ASAR integrity bypass vulnerability (CVE-2025-55305, GHSA-vmxy-hx4q-j7mg)

### Changed
- Bump version to 1.2.2

## [1.2.1] - 2025-08-16

### Changed
- Bump version to 1.2.1
- Security: updated dev-only dependencies via overrides (form-data, brace-expansion, tmp)
- Docs: add CHANGELOG and update README
- Better dark/light mode support added
- Added support for Grok voice mode

## [1.2.0] - 2025-08-16

### Added
- Enable WebRTC/audio/recording across domains; allow autoplay without gesture
- Broadened CSP and added `webview` allow attributes (microphone, camera, autoplay, display-capture)
- Developer documentation for testing capture/recording

### Changed
- Build process refinements and UI enhancements

## [1.1.0] - 2025-03-02

### Added
- New Version 1.1.0

### Fixed
- README and documentation corrections

## [1.0.0-pre] - 2025-03-01

### Added
- Initial pre-release of Grok Desktop

 [Unreleased]: https://github.com/AnRkey/Grok-Desktop/compare/v1.2.5...development
[1.3.0]: https://github.com/AnRkey/Grok-Desktop/compare/v1.2.5...development
[1.2.5]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.5
[1.2.4]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.4
[1.2.3]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.3
[1.2.2]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.2
[1.2.1]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.1
[1.2.0]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.0
[1.1.0]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.1.0
[1.0.0-pre]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.0.0-pre


