# Grok-Desktop v.1.1.0

## Description
Grok-Desktop is an Electron-based desktop application for Windows 10 and 11 that wraps `grok.com`, allowing desktop-application-like access to Grok with support for xAI, Google, and Apple authentication.

## Features
- Desktop application wrapper for grok.com
- Tabs functionality for multiple Grok conversations
- Support for xAI, Google, and Apple authentication
- No menu bar for a cleaner interface
- Always-on-top function

## Download
[Download Grok-Desktop_Installer-v1.1.0.exe](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.1.0/Grok-Desktop_Installer-v1.1.0.exe)

## Screenshot
![Screenshot](screenshot.png)

## Prerequisites for use
- Windows 10 or 11
- Internet connection
- Grok account required. You can sign up in app or use your Google or Apple account to login.

## Prerequisites for building
- Windows 10 or 11
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
3. Run `build.bat` to build the application.

The build script will automatically:
- Clean previous build files
- Create the build directory
- Check for Node.js and npm installation
- Configure npm for optimal performance
- Install project dependencies if needed
- Install electron-builder globally
- Build the NSIS installer application

## Usage
- Launch `Grok-Desktop.exe` from the build directory after building.
- Log in via `grok.com`, using Google, Apple, or xAI authentication as needed.
- Use the + button in the top toolbar to add new tabs.
- Click the AOT button in the top right to toggle always-on-top functionality.

## Build Options
If you want more control over the build process, you can use these npm commands instead of the build script:
- NSIS Installer: `npm run build-installer` (creates a standard Windows installer)
- Full Build: `npm run build` (builds both installer and portable versions)
- Portable: `npm run build-portable` (creates a portable .exe that doesn't require installation)
- Directory: `npm run build-dir` or `npm run pack` (builds the app without packaging)

All build outputs will be placed in the `build` directory.

## Troubleshooting
- If the application fails to start, check that Node.js is properly installed and in your PATH.
- If the tabs or AOT button don't appear, check the browser console for errors.
- If you encounter build errors, try running the script again or check the error messages.
- For other issues, please open an issue on GitHub.

## License
This project is licensed under the GNU General Public License version 2.0 (GPL-2.0). See the LICENSE file for details.

## Contact
Contact an R key at anrkey@gmail.com

## Copyright Notice
I don't own the grok.ico file. I found it online and converted it to a .ico file.
If you are from X.ai or Grok.com and if my use of this artwork is a problem, please let me know and I'll remove it. If you are not using this application for private use then I would suggest using a different icon.

## Contributing
See CONTRIBUTING.md for details on how to contribute to this project.
