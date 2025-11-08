# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.


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

## [Unreleased]

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

 [Unreleased]: https://github.com/AnRkey/Grok-Desktop/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.3
[1.2.2]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.2
[1.2.1]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.1
[1.2.0]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.2.0
[1.1.0]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.1.0
[1.0.0-pre]: https://github.com/AnRkey/Grok-Desktop/releases/tag/v1.0.0-pre


