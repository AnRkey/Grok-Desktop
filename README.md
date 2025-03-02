# Grok Desktop

A desktop application for [Grok.com](https://grok.com) with tab support. This application wraps the Grok website in an Electron application, allowing you to use Grok as a desktop application with multiple tabs.

## Features

- Multiple tabs support with intuitive tab management
  - New tab button positioned after the last tab
  - Easy tab navigation and closing
- Authentication handling for Grok.com, X.ai, Google accounts, and Apple ID
- Persistent sessions across application restarts
- Clean, distraction-free interface with no menu bar
- Always-On-Top mode for keeping the app visible while working in other windows
- Modern UI with custom styling
- Portable application - no installation required

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- npm (comes with Node.js)

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/grok-desktop.git
   cd grok-desktop
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

### Building the Application

There are three ways to build the application:

#### Option 1: Manual Build (Recommended)

This creates a directory with all necessary files and a launcher script:

1. Run the manual build script:
   ```
   manual-build.bat
   ```
2. The application will be built in the `build\GrokDesktop` directory
3. A launcher batch file `start.bat` will be created in that directory
4. To run the application, double-click the `start.bat` file
5. To distribute, simply zip the `build\GrokDesktop` folder
6. Note: Users will need Node.js installed to run this version

#### Option 2: Simple Directory Build

This creates a directory with the application and a launcher batch file:

1. Run the simple build script:
   ```
   build-simple.bat
   ```
2. The application will be built in the `build\win-unpacked` directory
3. A launcher batch file `GrokDesktop.bat` will be created in the `build` directory
4. You can run the application by double-clicking the `GrokDesktop.bat` file
5. To distribute, simply zip the `build` folder

#### Option 3: Portable Executable Build

This creates a single portable executable file (requires administrator privileges):

```
npm run build-portable
```

The built portable executable will be available in the `build` directory.

### Quick Build (Windows)

For Windows users, batch files are included for easy building:

1. **Manual Build (Recommended)**: Double-click the `manual-build.bat` file
   - Creates a directory with all necessary files and a launcher script
   - No administrator privileges required
   - No symbolic link issues
   - Requires Node.js to be installed on the user's system

2. **Simple Build**: Double-click the `build-simple.bat` file
   - Creates a directory with the application and a launcher
   - No administrator privileges required
   - Easy to distribute by zipping the folder
   - May encounter symbolic link issues on some systems

3. **Portable Build**: Double-click the `build.bat` file
   - Creates a single portable executable
   - Requires administrator privileges
   - May encounter permission issues on some systems

## Usage

### Tab Management
- Click the "+" button (positioned after the last tab) to open a new tab
- Click on a tab to switch to it
- Click the "×" button on a tab to close it

### Application Controls
- Click the "AOT" button to toggle Always-On-Top mode (button turns green when active)

### Navigation
- Navigate to Grok.com and use it as you would in a browser
- Authentication for Grok.com, X.ai, Google accounts, and Apple ID will be handled within the application
- Other external links will open in your default browser

## URL Handling

The application handles the following URL patterns internally:
- `.*\.grok\.com.*`
- `.*\.x\.ai.*`
- `.*accounts\.google\.com.*`
- `.*appleid\.apple\.com.*`

All other URLs will be opened in your default browser.

## Implementation Details

This application uses:
- Electron for the desktop application framework
- Custom tab implementation for multi-tab support
  - Dynamic tab creation and management
  - Intuitive new tab button placement
- Webviews for rendering web content
- Persistent session storage for maintaining login state
- No menu bar for a distraction-free experience
- Always-On-Top functionality for improved workflow
- Portable executable format for easy distribution

## License

ISC

## Acknowledgements

- [Electron](https://www.electronjs.org/)
- [electron-tabs](https://github.com/brrd/electron-tabs)
- [electron-store](https://github.com/sindresorhus/electron-store) 