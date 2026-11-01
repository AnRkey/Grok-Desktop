# Security Policy

## Supported Versions

The following table shows which versions of Grok-Desktop are currently being maintained.

| Version | Supported          |
| ------- | ------------------ |
| 1.3.0   | :white_check_mark: Maintained |
| 1.2.5   | :x: Superseded by 1.3.0 |
| 1.2.4   | :x: |
| 1.2.3   | :x: |
| 1.2.2   | :x:                |
| 1.2.1   | :x:                |
| 1.2.0   | :x:                |
| 1.1.0   | :x:                |

## Reporting a Vulnerability

Please report vulnerabilities as bugs in the issues area of the project.

## Development security checks

Use Node.js 24 and `npm ci`, then run `npm audit`, `npm test` and `npm run test:electron`.
Production pages have no Node integration. The local shell uses a sandboxed preload bridge with allowlisted IPC; main validates its sender frame. Remote tabs and OAuth windows are sandboxed and share the existing persistent login session. OS browser links pass parsed HTTPS URL checks. Only grok.com can request supported media permissions, with explicit user consent.

Version 1.3.0 addresses the Electron/extract-zip advisories in the old dependency tree and CodeQL URL validation alert #6. GitHub's default-branch alerts remain open until the changes reach main and scanning runs; a development push does not close them. The old sprintf-js advisory was withdrawn upstream; no blanket alert dismissals are performed.

Build overrides pin patched `minimatch` 11.0.3, ASAR 4.3.1 (with glob 14.0.3), and universal 3.0.6. These remove the old callable-minimatch consumers while keeping electron-builder's ASAR stream interface. Recheck the overrides when electron-builder updates its own dependencies. All packaging uses `--publish never`; release publication is a separate, approved action.
