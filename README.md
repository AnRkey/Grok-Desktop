# Grok-Desktop v.1.2.2

## Description
Grok-Desktop is an Electron-based desktop application for Windows 10 and 11 that wraps `grok.com`, allowing desktop-application-like access to Grok with support for xAI, Google, and Apple authentication.

## Screenshot
![Screenshot](screenshot.png)

## Features
- Desktop application wrapper for grok.com
- Tabs functionality for multiple Grok conversations
- Support for xAI, Google, and Apple authentication
- No menu bar for a cleaner interface
- Always-on-top function
- Better Dark/Light mode support **new**
- Grok speech mode supported **new**

## Download
[Download Grok-Desktop_Installer-v1.2.2.exe](https://github.com/AnRkey/Grok-Desktop/releases/download/v1.2.2/Grok-Desktop_Installer-v1.2.2.exe)

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
- All build outputs will be placed in the `build` directory.

## Usage
- Run the build.bat file to build Grok-Desktop and its installer.
- Install `Grok-Desktop` with the Grok-Desktop_Installer_v1.2.2.exe from the build directory
- Launch `Grok-Desktop` from the Start Menu
- Log in via `grok.com`, using Google, Apple, or xAI authentication as needed.
- Use the + button in the top toolbar to add new tabs.
- Click the AOT button in the top right to toggle always-on-top functionality.

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

## License
This project is licensed under the GNU General Public License version 2.0 (GPL-2.0). See the [LICENSE](LICENSE) file for details.

## Contact
Contact an R key at anrkey@gmail.com

## Copyright Notice
I don't own the grok.ico file. I found it online and converted it to a .ico file.
If you are from X.ai or Grok.com and if my use of this artwork is a problem, please let me know and I'll remove it. If you are not using this application for private use then I would suggest using a different icon.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.
