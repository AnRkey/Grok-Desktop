# Version 1.3.0 validation and handoff

Current status: John Mitchell confirmed all four sign-in providers and Grok sign-out in his Windows VM, chose nine package/archive types, and explicitly resumed publication with "verify your work then release this version." Final release verification and publication are authorized. Release builds include the updated About contributor credits. Feature PRs #23, #27, #28 and #30 remain untouched. The chronological results below retain their original test/build context.

## Baseline security review

GitHub reported 58 open Dependabot alerts on 1 November 2026: 55 Electron, two extract-zip, one withdrawn sprintf-js (18 high, 28 medium, 12 low). CodeQL alert #6 is an unparsed URL substring check in rate-limit webview selection. Secret scanning returned no alerts. Dependency alerts track the default branch and may remain open after development is pushed.

Electron is locked to 45.2.1, electron-builder to 26.18.0 and Playwright to 1.64.1. Unused electron-tabs is removed. Patched minimatch 11.0.3, ASAR 4.3.1 with glob 14.0.3, and universal 3.0.6 overrides are checked through real packaging, avoiding incompatible callable-minimatch consumers. Upstream sprintf-js advisory GHSA-hp3w-g68c-fv3c was withdrawn on 22 October 2026; it is not dismissed here.

## Independent verification

1. Node regression suite: `npm test`. Parsed URL adversarial inputs and cross-platform GPU cases, independent of Electron and the UI. `npm audit` additionally reports zero vulnerabilities.
2. Real Electron runtime suite: `npm run test:electron`. Launches an isolated temporary profile and intercepts HTTPS with offline fixtures; checks sandbox/Node isolation, actual native AOT off/on/off, internal background popup tabs, unique IDs, Ctrl+T/close, rate-limit fetch/display, viewport geometry, unsafe external URLs, microphone denial/approval through actual getUserMedia with a fake device, real Inspect Element/DevTools, persistent OAuth popup session, About 1.3.0 and absence of renderer exceptions. It does not authenticate to Grok or claim to test server behavior.

The same suite passed against the packaged Windows executable. To reproduce: set `GROK_TEST_EXECUTABLE` to its absolute path and run `npm run test:electron`. All builds use `--publish never`. Runtime screenshot: `build/smoke-1.3.0.png`. The development workflow builds Windows and Linux test artifacts without publishing a GitHub Release.

## Recorded results (1 November 2026)

- Implementation: b03da63; validation/code tested by CI: e9c8e43, on development.
- Node policy regressions: 3/3 passing, including adversarial URL and platform/GPU inputs.
- npm audit: zero vulnerabilities in the complete development dependency tree.
- Real Electron runtime: all checks passing from source and from `build/win-unpacked/Grok Desktop.exe`.
- A real unsigned-in test profile loaded `https://grok.com/`, title Grok, with its Sign in link and no Node access; this is not an authenticated login test.
- Windows EXE installer, MSI, portable EXE and ZIP built successfully. ASAR inspected: runtime files present and development/test files excluded (16 entries).
- GitHub Windows/Linux audit, policy and Electron runtime steps passed in [development validation run 41314311880](https://github.com/AnRkey/Grok-Desktop/actions/runs/41314311880). Both platform jobs completed successfully, including EXE/MSI/portable/Windows ZIP and Linux DEB/RPM/tar.gz/7z packaging. The run retains `grok-1.3.0-Windows-test-builds` and `grok-1.3.0-Linux-test-builds` for 30 days.

The Windows AOT diagnostic found that Electron 45.2.1's default/floating level did not pin this host's window; explicit normal works and passes off/on/off. Keyboard input inside guest webviews required explicit guest-host mapping after did-attach-webview.

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

## Local VM artifact checksums (SHA-256)

- `Grok-Desktop_Installer-v1.3.0.exe`: `f4026f77319cd0e17c1c2783c368ac1d2c4f4c0294502ee3177e662956f92cb6`
- `Grok-Desktop_Installer-v1.3.0.msi`: `eb8d610e0c7f328fc0a22c665a6754218d1955177da6d0455ed9f37b1c4871ff`
- `Grok-Desktop_Portable-v1.3.0.exe`: `fe5d2ba138472f45e229f01aaee40fcba45dc1bc2001b059cc846eafee301ce3`
- `Grok-Desktop_Windows-v1.3.0.zip`: `30f795f2135ae165d1300831c83d58b6417a796d529c6f28ff3456943ba2f9f5`

These checksums identify the local Windows build; CI rebuilds may have different hashes because installer timestamps differ.


## Google login follow-up installer (1 November 2026)

The earlier 1.3.0 artifacts above predate this Google login fix. Manual packaged testing identified escaped cookie handoffs at `accounts.youtube.com/accounts/SetSID` and `auth.grok.com/set-cookie`. The first fixed package then stopped after verification at the regional `accounts.google.co.za/accounts/SetSID` endpoint. Only redacted host/path observations are retained; actual session URLs and verification codes are excluded.

The current policy permits exact cookie handoff endpoints on YouTube and Grok, plus `/accounts/SetSID` and `/accounts/CheckConnection` on exact `accounts.<domain>` hosts from Google's official [supported domain list](https://www.google.com/supported_domains), snapshotted on 1 November 2026 (187 domains). It does not trust arbitrary Google regional pages, unrelated YouTube pages or lookalike domains. Main-frame redirects that leave the allowed routes are blocked in place instead of exporting session-bearing URLs to the OS browser; embedded-frame redirects stay embedded. Both current and legacy Electron event arguments are handled.

Opt-in `--trace-auth-navigation` writes `auth-navigation.jsonl` inside that app profile, recording only navigation event metadata and URLs stripped of credentials, query strings and fragments. It records no response bodies or request headers. It is off by default.

For manual sign-in, use a freshly packaged EXE launched normally, without automation/inspect/remote-debugging flags. John reports Google rejects source/automation sign-in while normal builds reach verification. Keep automated fixture windows separate from manual account testing. John requested a fresh EXE/MSI installer for his test VM because this workstation contains his cookies; installer creation must not alter, clear, migrate or bundle those cookies. Fresh follow-up installers are built under `build/google-login-installer/` and are not published. Authenticated success on the VM remains pending.

Follow-up regression methods: Node URL/redaction tests, and replay of the observed redacted redirect sequence against the actual main-process handlers in the Electron integration suite. The sequence includes regional Google and Grok cookie handoffs, unknown redirects, embedded frames and direct external links. Earlier experimental synthetic HTTP redirect fixtures did not complete reliably and were replaced by explicit event replay; do not describe that replay as a completed real-account login.


### Google login test 2

John confirmed the fresh EXE installer still escaped to YouTube SetSID in his VM after deleting the AppData profile to start over. Do not attribute that report to workstation cookies or an old test window. Extracting the actual NSIS EXE's embedded app-64.7z and app.asar confirmed the delivered installer contained the intended policy and matched the unpacked ASAR byte-for-byte (SHA-256 3a4fc2baa382a578a6403511fb3c6faf8c18bec2bb43333942573033aacf0694). The precise VM launch trigger still needs its redacted trace; the main-handler replay is not proof of real-account success.

A later workstation trace reached `auth.grokusercontent.com/set-cookie`; add only that exact host/path to the existing Grok cookie handoffs. A final external-browser policy now rejects all requests to known authentication hosts, including recognized regional Google hosts, regardless of whether they originate in navigation, popup, context menu or shell IPC. The regression suite exercises the captured redirect chain and the context-menu/IPC escape paths with dummy query values.

The next diagnostic installers live in `build/`, named `Grok-Desktop_Installer-v1.3.0-google-login-test-2.exe` and `.msi`. They retain source version 1.3.0, use Windows build version 1.3.0.2, and show **Grok Desktop - Google login test 2** in the window title. Test-only packaged metadata enables redacted navigation logs by default; normal release builds remain opt-in. Session-start logs identify the test build, and external-browser attempts identify navigation/popup/context-menu origin using sanitized source paths.

No workstation cookie profile is changed or bundled. Ask for the VM's `auth-navigation.jsonl` from the app's AppData profile if login still fails; never request full session URLs or verification-code screenshots. Public release remains held until authenticated VM approval.


### Test 2 delivery location (superseded)

John explained that putting the latest installers in nested build directories caused him to miss them and select the older root installer. Current Google login test 2 EXE, MSI, blockmap, latest.yml and SHA256SUMS.txt are now directly in `build/`; no subdirectories remain there. Their SHA-256 values are unchanged: EXE `9d35b416e58bf12fc24a70a2d7d8258dae8c1f3d3d3ab08332339d49cb25e2c6`, MSI `1e25c8c6118f5cce1f9437c1154fb3acb1d3c7ccb336b0a51f6c19c3fdc6194a`.

Automatic approval review rejected broad deletion because it classified some generated outputs as potentially unrelated. The approved reversible alternative moved the explicitly inventoried older root files and build subdirectories to ignored `.tmp/retired-build-output-20261101/`, retaining all prior artifacts outside the delivery folder. No cookie/profile locations were included. Future test handoffs must use the root of `build/` and remove obsolete delivery choices from it.


### Google login test 3: finish the original login tab

John supplied the redacted `auth-navigation.jsonl` from the correctly labeled test 2 VM. It confirms Google password/2FA, the regional cookie handoff, Grok's OAuth callback, `auth.grok.com/set-cookie` and `auth.grokusercontent.com/set-cookie` all stayed inside the app. The next redirect, `https://auth.x.ai/set-cookie`, was blocked at 17:54:51 UTC, leaving the original tab titled Redirecting with a blank page. Opening a new Grok tab at 17:55:53 UTC used the authenticated session successfully, as John confirmed with screenshots. This is now an incomplete final cookie handoff, rather than the earlier external-browser escape.

Test 3 permits only the exact HTTPS host/path `auth.x.ai/set-cookie` and also keeps that authentication host out of every OS-browser route. A regression fixture contains the full nine-hop redacted sequence from the user's log. The new Node test failed specifically on auth.x.ai before the policy change and passes after it; current and legacy Electron navigation handlers replay that same fixture. The fixture contains no real query values, credentials or 2FA codes.

Build version 1.3.0.3 uses test-only metadata Google login test 3 with redacted diagnostics on. Fresh EXE/MSI names contain `google-login-test-3` and are delivered directly in `build/`; superseded test 2 outputs and transient packaging directories are archived outside build. Version 1.3.0 remains unpublished. The VM must verify that the original login tab returns to signed-in Grok without opening another tab.


### Test 3 delivery (superseded)

The actual NSIS EXE payload was extracted and verified to match the fixed source URL policy exactly, including auth.x.ai/set-cookie, with Google login test 3 metadata and diagnostics enabled. It contains no profiles, cookies or trace files. Both EXE and MSI completed successfully; all temporary packaging folders and superseded test 2 artifacts were archived outside build, leaving only current files directly in build root.

- EXE: `build/Grok-Desktop_Installer-v1.3.0-google-login-test-3.exe`; SHA-256 `d3d7bc45a913320987986394c09626675c0111221482598c542c46d20cffb18a`.
- MSI: `build/Grok-Desktop_Installer-v1.3.0-google-login-test-3.msi`; SHA-256 `3456a47dfdf5ad5ba12ac40016b4daf0c5e56054b23e45ceb33e057de6ab1ba9`.

Implementation commit b24d13c is pushed on development. Node tests pass 7/7 and npm audit has zero findings. Windows Electron runtime checks passed. The first Linux run lost the native browser during popup/virtual-display setup; CI-only commit 615daa4 uses an isolated D-Bus session and explicit software rendering for Xvfb. Both Windows and Linux Node/Electron runtime checks then passed in [run 41334593920](https://github.com/AnRkey/Grok-Desktop/actions/runs/41334593920); remote package creation may still be in progress at handoff. Authenticated original-tab completion remains for John's test VM. Nothing is publicly released or tagged.


### Google login test 4: complete sign-out without restarting

The new user-supplied test 3 VM trace proves the full Google login now returns the original tab to grok.com after `auth.x.ai/set-cookie`. When John selects Sign out, the page attempts `https://auth.grok.com/delete-cookie` at 18:13:17 UTC. The navigation policy blocks it, followed by the external-browser backstop, leaving stale signed-in UI. John reports restarting the app reveals the signed-out state.

Allow the matching `/delete-cookie` endpoint alongside `/set-cookie` on the same three trusted Grok/xAI cookie services. The first route is directly evidenced by the VM trace; the peer service routes are covered as the corresponding logout endpoints rather than claimed as observed redirects. Keep unrelated paths, protocols, ports, lookalike hosts and all authentication-to-OS-browser requests blocked. Let the site's logout navigation finish naturally; do not clear the workstation profile or add a forced client-side login-state workaround.

The new Node sign-out regression fails on the exact observed auth.grok.com/delete-cookie URL before the policy change, then passes afterward. Electron handler replay covers direct and redirect sign-out navigation with current/legacy event arguments for all three cookie services, alongside the prior full login fixture. Test 4 installers have source version 1.3.0, Windows build 1.3.0.4, title Google login test 4 and redacted diagnostics. Deliver them directly in build root and archive old files and transient packaging directories outside build. The VM must confirm sign-in and visible sign-out in the same tab without closing the app. No public release is approved yet.

### Test 4 delivery

Implementation commit 5582f9d is pushed to development. Independent verification passed: all eight Node policy/redaction regressions and real Electron runtime checks on Windows and Linux in [run 41335920975](https://github.com/AnRkey/Grok-Desktop/actions/runs/41335920975). Local npm audit reports zero vulnerabilities. At handoff the remote packaging jobs may still be finishing; local EXE and MSI builds completed successfully with publishing disabled.

The completed NSIS EXE's embedded ASAR was extracted and verified against the current source URL policy byte-for-byte, with test 4 metadata and diagnostics enabled. It excludes profiles, cookies and navigation traces. Temporary packaging folders were moved outside build, leaving only the current deliverables directly in its root.

- EXE: `build/Grok-Desktop_Installer-v1.3.0-google-login-test-4.exe`; SHA-256 `ab775dd163578cca5102363d2b32273e64b9a4c122048cc98f15db26ee496524`.
- MSI: `build/Grok-Desktop_Installer-v1.3.0-google-login-test-4.msi`; SHA-256 `f78397bedfab4cc186b0addf1a68ccc9331367d1031e5820c72c0779ca0ec2b4`.

Authenticated sign-out behavior still requires John's VM confirmation; automated handler replay does not establish real-service success. No workstation application was launched, installed or given a changed cookie profile for this build.

### Authentication test 5: GitHub OAuth stays in app

John confirms Apple and X authentication work in his VM. His supplied test 3 trace shows Apple returning through the Grok callback and all three cookie services to the original Grok tab. It also identifies the GitHub escape at 18:19:40 UTC: direct navigation to `https://github.com/login/oauth/authorize` was blocked internally and handed to the OS browser. This report is independent of test 4's still-pending sign-out verification.

Allow only the exact github.com HTTPS host and its `/login`, `/login/…`, `/session`, `/sessions` and `/sessions/…` authentication paths inside the app, and reject those same paths at the OS-browser boundary. Repository and other ordinary GitHub links retain external-browser routing. `/login/oauth/authorize` is observed in the VM trace and documented in [GitHub's OAuth flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps); login/session verification paths are covered for subsequent authentication, not claimed as observed in this failed VM attempt. Queries in fixtures contain dummy values only.

The Node regression first failed on the observed authorization URL, then passed after the fix (9/9 tests). Independent Electron coverage exercises a real same-session sandboxed GitHub popup with offline fixture content, direct/redirect navigation with modern/legacy event arguments, and context-menu/IPC escape prevention. These checks do not authenticate a real GitHub account.

Fresh test 5 EXE/MSI packages retain 1.3.0 with Windows build 1.3.0.5, visible title Authentication test 5 and redacted diagnostics. Deliver directly in build root after archiving old artifacts outside it. Test 5 includes test 4's sign-out fix. VM verification should cover GitHub login through password/verification/consent to the original Grok tab, then sign out and back in without restarting. Publication remains on hold.

### Test 5 delivery

Implementation e7a8b89 is pushed to development. Nine Node regressions and real Electron runtime checks passed independently on Windows and Linux in [run 41336509807](https://github.com/AnRkey/Grok-Desktop/actions/runs/41336509807); npm audit reports zero findings. Remote packaging may still be finishing at handoff. Local EXE/MSI packaging completed with publishing disabled. The completed EXE's embedded ASAR was extracted and verified byte-for-byte against source main, URL policy and trace code, with test 5 metadata and no profiles/cookies/traces. Build contains no subdirectories or older installers.

- EXE: `build/Grok-Desktop_Installer-v1.3.0-auth-test-5.exe`; SHA-256 `3db8609fdc76a300b45fa31367114988f729eee799017532147db873c78e88a9`.
- MSI: `build/Grok-Desktop_Installer-v1.3.0-auth-test-5.msi`; SHA-256 `dbf5bfca4051b57812306f1b712d400de4392f73955be8d2795b0b98d9372411`.

The next authenticated VM results are still required for GitHub and sign-out; no production-code changes were made after the tested implementation.

### Authentication test 6: finish Grok sign-out after GitHub login

John confirms the authentication flows now work, clarifying that the remaining sign-out button is in Grok, not GitHub. His test 5 VM trace shows GitHub password, WebAuthn/app verification, consent and the Grok callback completing in the original tab at 18:33:19 UTC. Sign-out then passes through all three previously covered cookie-deletion services and stops at an additional redirect to `https://auth.grokipedia.com/delete-cookie` at 18:33:28 UTC, logged as blocked-redirect. Returning manually to grok.com shows the signed-out state. No forced refresh or profile deletion is required to explain the stale display.

Permit only that exact HTTPS host/path internally and prevent that auth host escaping through any OS-browser route. Other Grokipedia paths, including set-cookie, are not granted internal access. The four-hop sign-out fixture now matches the observed VM chain. Both Node regressions failed on the new endpoint before the fix and pass afterward (10/10 tests); Electron replay covers all four routes through direct/redirect modern/legacy handlers plus context-menu/IPC escape prevention.

Fresh test 6 packages use version 1.3.0, Windows file version 1.3.0.6, title Authentication test 6 and redacted diagnostics. Deliver EXE/MSI directly in build root with old artifacts archived outside it. The VM must confirm Grok's Sign out visibly reaches the signed-out page in the same tab, then sign-in still works. All providers' sign-in is now confirmed by John, but the new final sign-out handoff and public release still await his verification/approval.

### Test 6 delivery

Implementation e7cd4b3 is pushed on development. Ten Node regressions and real Electron checks passed on Windows and Linux in [run 41337471351](https://github.com/AnRkey/Grok-Desktop/actions/runs/41337471351); npm audit has zero findings. Remote packaging may still be finishing. Local EXE/MSI builds completed with publishing disabled. Extracting the completed NSIS EXE confirmed byte-for-byte agreement with source main, URL policy and trace code, Authentication test 6 metadata and no profile/cookie/trace files. Temporary packaging folders and superseded test 5 outputs are archived outside build; no build subdirectories remain.

- EXE: `build/Grok-Desktop_Installer-v1.3.0-auth-test-6.exe`; SHA-256 `9ecef2eb58cfe068a69786e6093d0cd0d429a7f60799970fdd0ed8603aeb575a`.
- MSI: `build/Grok-Desktop_Installer-v1.3.0-auth-test-6.msi`; SHA-256 `43586205dbd7e3ece5bdac028b7ade1393ef6b1668371e2ab11e34f7b960af46`.

No production code changed after the tested implementation. Real-service completion of the final logout route remains for the VM test; no release/tag/main merge is approved yet.

### VM approval, release pause and About-page contributor credits

John confirmed test 6 fixes Grok sign-out and authorized release preparation. He chose all nine historical package formats: Windows NSIS EXE, MSI, portable EXE, ZIP and 7z; Linux DEB, RPM, 7z and tar.gz. He then explicitly paused publication before any release or tag was created, and requested contributor GitHub aliases in About. Keep publication paused until he resumes it.

About now credits @realvathy (GPU fix, PR #33; git display name yuunagi), @VectorJay666 (AOT fix, PR #35 co-author), and @JoshuaWang2211 (usage-statistics fix, issue #11 and prior release credits). Existing developer credit stays in place. Handles were verified through GitHub commit/PR/issue metadata rather than inferred from email addresses; only included contributions are credited, with feature PRs still deferred. John requested removal of the separate code assistance note; it is removed from About and the release notes.

The Electron About check verifies each displayed handle and profile URL. A separate offline render checks the About page in light/dark themes and at a narrow viewport. Any final 1.3.0 packages must be rebuilt from this About-page change; earlier test 6/CI packages predate the credits.

Verification completed: all ten Node regressions and the full local Electron integration suite pass, including the About handle/URL assertions. Independent headless Chrome rendering passes offline in light/dark themes at 1100x720 and light mode at 360x640, with no horizontal overflow or clipped credits; screenshots were visually inspected. No account login or normal user profile was used. Publication remains paused.

### Release reference and packaging consistency review

README, contributing/security policies, current changelog entry, release notes and AppStream metadata now agree on version 1.3.0, completed Windows VM authentication/sign-out checks and the explicit publication pause. README/release notes list the same nine versioned filenames, including Windows 7z; their future download links are clearly marked unavailable until publication, with a working link to the still-public 1.2.5 release. Install examples use the actual RPM/DEB artifact names. GitHub authentication and About contributor credits are documented. Historical changelog versions and the saved 1.2.5 template remain intact.

Shared archive helpers now create Windows ZIP/7z and Linux tar.gz/7z; both the development workflow and build.bat call them. This restores Windows 7z to the build output and removes nested Linux shell quoting from build.bat. Shell files use LF through .gitattributes. Remaining .gitignore merge markers were removed while retaining all ignore patterns.

Local verification passed: metadata/lockfile versions and dependencies agree; README and release notes contain exactly the same nine 1.3.0 asset URLs; relative document links resolve; AppStream parses with matching version/license. Windows fixture archives passed independent integrity tests and byte-for-byte extraction round trips with the expected root layout. The Linux helper ran under Git Bash against a separate fixture and produced valid tar.gz/7z archives; native Linux production packaging is checked by CI. All ten Node regressions still pass. None of these checks publishes assets or changes a user profile.

Native CI verification is complete: both Windows and Linux jobs passed fully for 38eb486 in [run 41339002580](https://github.com/AnRkey/Grok-Desktop/actions/runs/41339002580), including npm audit, Node/Electron tests, all nine production package/archive types and artifact uploads. These production builds include the three About contributor handles and omit diagnostic test-build metadata. Only this validation note changed afterward. Release publication, tagging and merging main remain paused.
