# Grok-Desktop v.1.0.0

## Description
Grok-Desktop is a Nativefier-based desktop application for Windows 11 that wraps `grok.com`, allowing local access to Grok with support for xAI, Google, and Apple authentication.

## Prerequisites for use
- Windows 10 or 11
- Internet connection.
- Grok account required. You can sign up in app or use your Google or Apple account to login.

## Prerequisites for building
- Windows 10 or 11
- Internet connection.
- Node.js (LTS version, e.g., 20.x)

## Build Grok-Desktop
1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open PowerShell and verify with `node -v` and `npm -v`.
3. Install Nativefier globally: `npm install -g nativefier`.
4. Clone this repository or download the files.
5. Edit `build_grok-desktop.bat` contents as needed or leave defaults as is.
6. Run the build script: `build_grok-desktop.bat` (or use the Nativefier command directly).

## Usage
- Launch `Grok-Desktop.exe` from the `Grok-Desktop-windows-64` directory inside the build directory.
- Log in via `grok.com`, using Google, Apple, or xAI authentication as needed.

## Build Installer
1. Install Inno Setup from [Inno Setup Website](https://www.jrsoftware.org/isdl.php).
2. Open grok-desktop_installer.iss from Inno Setup Compiler and click "Compile" to build the installer.
3. The installer will be located in the `Grok-Desktop_Installer` sub-directory when the build is completed.

## License
This project is licensed under the GNU General Public License version 2.0 (GPL-2.0). See the (LICENSE) file for details.

## Contact
Contact an R key at anrkey@gmail.com

## Copyright Notice
I don't own the grok.ico file. I found it online and converted it to a .ico file.
If you are from X.ai or Grok.com and me using this is a problem, please let me know and I'll remove it. If you are not using this application for private use then I would suggest using a different icon.

## Contributing
Details in CONTRIBUTING.md
