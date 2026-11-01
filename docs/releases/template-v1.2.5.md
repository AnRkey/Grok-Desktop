## Description
Grok-Desktop is an Electron-based desktop application for Windows 10 and 11 that wraps `grok.com`, allowing desktop-application-like access to Grok with support for xAI, Google, and Apple authentication.

## Screenshot
![Screenshot](screenshot.png)

## Features
- **Desktop application wrapper** for grok.com
- **Multi-tab interface** for multiple concurrent Grok conversations
- **Real-time API Usage Monitoring** - Track your Grok usage limits:
  - **Low Effort**: Basic query limits and remaining tokens
  - **High Effort**: Advanced feature usage tracking
  - **Grok 4 Heavy**: Specialized model usage limits
  - **Refill Timer**: Shows when limits reset
  - **Visual indicators**: Green (normal), Orange (warning ≤25%), Red (critical ≤10%)
  - **Auto-refresh**: Updates every 5 seconds when active
  - **Toggle controls**: Show/hide stats via toolbar buttons (s and 👁)
- **Authentication support** for xAI, Google, and Apple accounts
  - OAuth flows handled in-app for seamless login
- **Clean interface** with no menu bar for distraction-free usage
- **Always-on-top function** (AOT button) with cross-platform support
  - Native support on Windows
  - Linux support via wmctrl (automatic fallback included)
- **Dark/Light theme support** with system theme detection
  - Auto-adapts to system preferences
  - Forces light mode for Apple ID auth for reliability
- **Grok speech mode** fully supported
  - Microphone and camera permissions enabled
  - Autoplay enabled for seamless voice interaction
- **Update checks** with in-app indicator and button
- **Enhanced security features**:
  - Domain validation to prevent malicious subdomain attacks
  - OAuth protection for secure authentication
  - External URL validation (blocks localhost/private IPs)
  - CSP (Content Security Policy) headers
  - Electron sandboxing enabled
- **Keyboard shortcuts**:
  - `Ctrl+T`: Open new tab
  - `Ctrl+Tab` / `Ctrl+Shift+Tab`: Cycle through tabs (next/previous)
  - `Mouse-wheel-scroll`: Scroll tabs when overflowing on tab bar
  - `Ctrl+Mouse-wheel-scroll`: Cycle through tabs (next/previous)
  - `Ctrl+R`: Reload active tab
  - `Ctrl+I`: Show About dialog
- **Toolbar buttons**:
  - **+**: Create new tab
  - **↻**: Reload current tab with loading animation
  - **AOT**: Toggle always-on-top mode
  - **s**: Toggle API usage statistics display
  - **👁**: Toggle Grok-4-Heavy stats visibility
  - **i**: Show About dialog
- **Context menu** with rich functionality:
  - Back/Forward/Reload navigation
  - Inspect Element for debugging
  - Spell-check suggestions
  - Add to Dictionary
- **Smart link handling**:
  - External links open in default browser
  - Grok/xAI/Google/Apple auth flows handled in-app
- **Single-instance application** (working on multi instance)
  - Subsequent launches focus the running window instead of creating duplicates
- **Cross-platform support**:
  - Windows 10/11 (full support)
  - Linux (Rocky Linux, RHEL, Ubuntu, Fedora, and more)

## Prerequisites for use
- Windows 10 or 11
- Internet connection
- Grok account required. You can sign up in app or use your Google or Apple account to login.
