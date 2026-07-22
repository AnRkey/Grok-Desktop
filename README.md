# Grok-Desktop v1.3.0

## Description
Grok-Desktop is an Electron-based desktop application for Windows 10/11 and Linux that wraps `grok.com`, providing desktop-application-like access to Grok with real-time API usage monitoring, multi-tab support, and seamless authentication for xAI, Google, and Apple accounts.

## Screenshot
![Screenshot](screenshot.png)

## Features
- **Desktop application wrapper** for grok.com
- **Tabs functionality** for multiple Grok conversations
- **Real-time Usage Monitoring** - Track your Grok usage limits:
  - **Low Effort**: Basic query limits and remaining tokens
  - **High Effort**: Advanced feature usage tracking
  - **Grok 4 Heavy**: Specialized model usage limits
  - **Refill Timer**: Shows when limits reset
- **Keyboard shortcuts**:
  - `Ctrl+T`: Open a new tab
  - `Ctrl+Tab` / `Ctrl+Shift+Tab`: Cycle through open tabs (next/previous)
  - `Mouse-wheel-scroll`: Scroll open tabs when they are overflowing on the tab bar
  - `Ctrl+Mouse-wheel-scroll`: Cycle through open tabs (next/previous)
  - `Ctrl+R`: Reload the active tab
  - `Ctrl+I`: Show information/about dialog
- **Authentication support** for xAI, Google, and Apple accounts
- **Clean interface** with no menu bar for distraction-free usage
- **Always-on-top function** with cross-platform support (Windows & Linux)
- **Dark/Light mode support** with system theme detection
- **Grok speech mode** support

## Security (v1.3.0)
- **Critical Electron hardening**:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
- Secure `preload.js` using `contextBridge` (no direct Node access from renderer)
- Origin-aware permission handlers (media / display-capture only allowed for trusted domains)
- Explicit security attributes on all `<webview>` elements
- Updated to **Electron 43.2.0**
- License correctly set to **GPL-2.0**
- Domain validation + external URL protection (blocks localhost / private IPs)
- Content Security Policy (CSP)

## Download

### Windows
- [Grok-Desktop_Installer-v1.3.0.exe](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.3.0/Grok-Desktop_Installer-v1.3.0.exe) - Windows installer (EXE)
- [Grok-Desktop_Installer-v1.3.0.msi](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.3.0/Grok-Desktop_Installer-v1.3.0.msi) - Windows installer (MSI)
- [Grok-Desktop_Portable-v1.3.0.exe](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.3.0/Grok-Desktop_Portable-v1.3.0.exe) - Portable Windows executable

### Linux
- [Grok-Desktop-v1.3.0.deb](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.3.0/Grok-Desktop-v1.3.0.deb) - Debian/Ubuntu package
- [Grok-Desktop-v1.3.0.rpm](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.3.0/Grok-Desktop-v1.3.0.rpm) - RPM package (RHEL/Rocky Linux/Fedora)

> **Note**: Release assets for v1.3.0 will be available after the official release.

## System Requirements

### For Using the Application
- **Operating System**: Windows 10/11 or Linux (Rocky Linux 9/10, RHEL 9, Ubuntu, Fedora, etc.)
- **Internet connection** for accessing grok.com
- **Grok account** (sign up in-app or use Google/Apple/xAI authentication)
- **Linux AOT (Always-on-Top) requirement**: Install `wmctrl` for Always-on-Top functionality:
  - Rocky Linux/RHEL/Fedora: `sudo dnf install wmctrl`
  - Ubuntu/Debian: `sudo apt install wmctrl`

### For Building from Source
- **Operating System**: Windows 10/11 or Linux
- **Node.js**: LTS version (20.x recommended)
- **Internet connection** for downloading dependencies

## Building from Source

### Prerequisites
1. Install Node.js LTS (20.x recommended) from [nodejs.org](https://nodejs.org/)
2. Clone this repository: `git clone https://github.com/AnRkey/Grok-Desktop.git`
3. Navigate to the project: `cd Grok-Desktop`
4. Install dependencies: `npm install`

### Build Commands

#### Windows
```bash
# Full installer (NSIS + MSI)
npm run build-installer

# Portable executable
npm run build-portable

# Directory build (unpacked)
npm run build-dir