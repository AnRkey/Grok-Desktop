# Grok-Desktop v.1.2.4

## Description
Grok-Desktop is an Electron-based desktop application for Windows 10/11 and Linux that wraps `grok.com`, allowing desktop-application-like access to Grok with support for xAI, Google, and Apple authentication.

## Screenshot
![Screenshot](screenshot.png)

## Features
- Desktop application wrapper for grok.com
- Tabs functionality for multiple Grok conversations
- Keyboard shortcuts: Ctrl+T (new tab), Ctrl+Tab / Ctrl+Shift+Tab (cycle tabs), Ctrl+R (reload active tab), Ctrl+I (info/about)
- Support for xAI, Google, and Apple authentication
- No menu bar for a cleaner interface
- Always-on-top function (cross-platform support)
- Better Dark/Light mode support **new**
- Grok speech mode supported **new**

## Download
[Download Grok-Desktop_Installer-v1.2.4.exe](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.2.4/Grok-Desktop_Installer-v1.2.4.exe)

## Prerequisites for use
- Windows 10/11 or Linux (Rocky Linux 9/10, Ubuntu, etc.)
- Internet connection
- Grok account required. You can sign up in app or use your Google or Apple account to login.
- **Linux AOT (Always-on-Top) requirement**: Install `wmctrl` for Always-on-Top functionality:
  - Rocky Linux/Fedora: `sudo dnf install wmctrl`
  - Ubuntu/Debian: `sudo apt install wmctrl`

## Prerequisites for building
- Windows 10/11 or Linux
- Internet connection
- Node.js (LTS version, e.g., 20.x)

## Project Structure
- `src/` - Contains the main Electron application code
  - `main.js` - Main Electron process
  - `preload.js` - Preload script for the renderer process
  - `renderer.js` - Renderer process code
  - `custom-tabs.js` - Custom tabs implementation
  - `grok.ico` and `grok.png` - Application icons
- `index.html` - Main application HTML
- `styles.css` - Application styles
- `build.bat` - Build script for Windows

## Build Grok-Desktop
1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Clone this repository or download the files.
3. Install dependencies if needed: `npm install`
4. Build using npm scripts:
   - Directory build (unpacked): `npm run build-dir`
   - Portable executable: `npm run build-portable`
   - Full installers (NSIS + MSI): `npm run build-installer`

Notes:
- These scripts use `npx electron-builder@latest` (no global install required).
- All build outputs are written to the `build` directory.

## Usage
- After building, install `Grok-Desktop` with `Grok-Desktop_Installer-v1.2.4.exe` from the `build` directory
- Launch `Grok-Desktop` from the Start Menu
- Log in via `grok.com`, using Google, Apple, or xAI authentication as needed.
- Use the + button in the top toolbar (or Ctrl+T) to add new tabs.
- Click the AOT button in the top right to toggle always-on-top functionality.
- Use keyboard shortcuts to work faster:
  - Ctrl+T: Open a new tab
  - Ctrl+Tab / Ctrl+Shift+Tab: Cycle through open tabs (next/previous)
  - Ctrl+R: Reload the currently active tab
  - Ctrl+I: Show information/about dialog

## Keyboard Shortcuts
- Ctrl+T: Open a new tab
- Ctrl+Tab: Switch to the next tab
- Ctrl+Shift+Tab: Switch to the previous tab
- Ctrl+R: Reload the active tab (does not reload the entire app window)
- Ctrl+I: Show information/about dialog

## Support
Need help? Found a bug? Have a feature request? Please submit an issue on GitHub:

[![Submit an Issue](https://img.shields.io/github/issues/AnRkey/Grok-Desktop?style=for-the-badge)](https://github.com/AnRkey/Grok-Desktop/issues/new/choose)

When submitting an issue, please include:
1. Your operating system version
2. Application version you're using
3. Detailed steps to reproduce the problem
4. Screenshots if applicable
5. Any error messages you received

This helps me address your problem more efficiently. You can also check if your issue has already been reported by browsing the [existing issues](https://github.com/AnRkey/Grok-Desktop/issues).

## Feedback
Your feedback is valuable and helps improve Grok-Desktop! Here are ways to provide feedback:

- **Feature Requests**: Have an idea to make Grok-Desktop better? [Submit a feature request](https://github.com/AnRkey/Grok-Desktop/issues/new?labels=enhancement&template=feature_request.md&title=%5BFEATURE%5D) on GitHub.
- **General Feedback**: For general comments, suggestions, or experiences using the application, you can:
  - Send an email to anrkey@gmail.com with the subject "Grok-Desktop Feedback"
  - Leave a comment on the [releases page](https://github.com/AnRkey/Grok-Desktop/releases)

All feedback is reviewed and considered for future updates. Thank you for helping make Grok-Desktop better!

## Technical Details

### Always-on-Top (AOT) Implementation
The application provides cross-platform Always-on-Top functionality:

- **Windows**: Uses Electron's built-in `setAlwaysOnTop()` method
- **Linux**: Uses the `wmctrl` command-line tool for better compatibility with GNOME and other window managers
- **Wayland Compatibility**: On systems running Wayland (default in Rocky Linux 10), the application automatically restarts with X11 forced to enable AOT functionality, as Wayland intentionally restricts programmatic window positioning for security reasons

### Linux Dependencies
- `wmctrl` package is required for AOT functionality on Linux
- Install with: `sudo dnf install wmctrl` (Rocky Linux/Fedora) or `sudo apt install wmctrl` (Ubuntu/Debian)

## License
This project is licensed under the GNU General Public License version 2.0 (GPL-2.0). See the [LICENSE](LICENSE) file for details.

## Contact
Contact an R key at anrkey@gmail.com

## Copyright Notice
I don't own the grok.ico file. I found it online and converted it to a .ico file.
If you are from X.ai or Grok.com and if my use of this artwork is a problem, please let me know and I'll remove it. If you are not using this application for private use then I would suggest using a different icon.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.
