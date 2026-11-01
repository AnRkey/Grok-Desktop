# Version 1.3.0 validation and handoff

Status: development candidate, awaiting John Mitchell's VM approval. No release tag, public release, main merge or public asset publication is authorized yet. Feature PRs #23, #27, #28 and #30 remain untouched.

## Baseline security review

GitHub reported 58 open Dependabot alerts on 1 November 2026: 55 Electron, two extract-zip, one withdrawn sprintf-js (18 high, 28 medium, 12 low). CodeQL alert #6 is an unparsed URL substring check in rate-limit webview selection. Secret scanning returned no alerts. Dependency alerts track the default branch and may remain open after development is pushed.

Electron is locked to 45.2.1, electron-builder to 26.18.0 and Playwright to 1.64.1. Unused electron-tabs is removed. Patched minimatch 11.0.3, ASAR 4.3.1 with glob 14.0.3, and universal 3.0.6 overrides are checked through real packaging, avoiding incompatible callable-minimatch consumers. Upstream sprintf-js advisory GHSA-hp3w-g68c-fv3c was withdrawn on 22 October 2026; it is not dismissed here.

## Independent verification

1. Node regression suite: `npm test`. Parsed URL adversarial inputs and cross-platform GPU cases, independent of Electron and the UI. `npm audit` additionally reports zero vulnerabilities.
2. Real Electron runtime suite: `npm run test:electron`. Launches an isolated temporary profile and intercepts HTTPS with offline fixtures; checks sandbox/Node isolation, actual native AOT off/on/off, internal background popup tabs, unique IDs, Ctrl+T/close, rate-limit fetch/display, viewport geometry, unsafe external URLs, real Inspect Element/DevTools, persistent OAuth popup session, About 1.3.0 and absence of renderer exceptions. It does not authenticate to Grok or claim to test server behavior.

The same suite can run on the packaged executable: set `GROK_TEST_EXECUTABLE` to its absolute path and run `npm run test:electron`. All builds use `--publish never`. Runtime screenshot: `build/smoke-1.3.0.png`. The development workflow builds Windows and Linux test artifacts without publishing a GitHub Release.

## Bug disposition

| Report | Change / remaining verification |
| --- | --- |
| #13 Inspect Element missing | Restored in all context menus; real DevTools invocation tested. |
| #14 Search-result new tab does nothing | Main-process popup handler opens background Grok tabs and keeps search context; fixture verified. |
| #25 X login spinner | Preserve secure OAuth popups, opener and persistent session; expanded exact X/Twitter host allowlist. Real X account login still required. |
| #26 Human-verification loop | PR #33 GPU fix incorporated; updated browser engine and fixed popup/session handling. Challenge acceptance remains controlled by Grok/Cloudflare; test in VM. |
| #22 Imagine video aspect ratio | Engine/GPU update and viewport clipping fixed. No local video transformation exists; authenticate and reproduce the full image-edit/Make Video workflow before calling this fixed. |
| #31 bugs | Unfilled bug template; no behavior or reproduction details supplied. |
| PR #35 AOT default/state | Cherry-picked with original author; Windows Electron 45 needs an explicit native window level. Linux wmctrl now adds/removes rather than always reporting on, and uses execFile with a native ID. |

Feature requests #8, #9, #19 and #29 are deferred, alongside feature PRs.

## VM checklist before release approval

- Test the portable EXE and one installer; confirm About says 1.3.0 and a relaunch retains login.
- Start without a prior profile, then with an existing 1.2.5 profile. Never delete the user's profile as a login workaround.
- Complete xAI, X, Google and Apple sign-in, including human verification. Reproduce #25/#26 and report any remaining challenge loop or account limits.
- Open multiple search results via New Tab; confirm each appears in the background and the search overlay remains available.
- Right-click Inspect Element; exercise Ctrl+T, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+R and Ctrl+I.
- Confirm AOT starts off, toggles on then off, and agrees with the green button while switching apps.
- Exercise voice/camera consent, denial, retry and screen-share source selection. Unrelated sites must not receive media access.
- Toggle usage stats and switch tabs, including About; confirm unavailable services do not falsely claim a login failure.
- Reproduce #22 with the same source image, chosen aspect ratio, edit and Make Video, and compare to a regular browser.
- Test Linux packages on a supported distro, including X11/wmctrl AOT and themes, before claiming Linux release validation.

## Publication later

After John explicitly approves, use the exact previous release template saved at `docs/releases/template-v1.2.5.md`, with the prepared version text in `docs/releases/1.3.0.md`. Recheck the final commit and audit, approve the release date, merge the tested development revision into main, tag v1.3.0, and publish the same eight artifact types as v1.2.5: EXE installer, MSI, portable EXE, Windows ZIP, Linux DEB, RPM, tar.gz and 7z. Update public download links only when those assets exist.
