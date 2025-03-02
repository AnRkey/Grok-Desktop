const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Define the allowed URL patterns for internal handling
const allowedUrlPatterns = [
  /.*\.grok\.com.*/,
  /.*\.x\.ai.*/,
  /.*accounts\.google\.com.*/,
  /.*appleid\.apple\.com.*/
];

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation for this use case
      webviewTag: true // Enable webview tag for tabs
    },
    icon: path.join(__dirname, 'grok.png')
  });

  // Disable the menu bar
  Menu.setApplicationMenu(null);

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Open DevTools in development mode
  // mainWindow.webContents.openDevTools();

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up URL handling
  setupUrlHandling();

  // Set up IPC handlers
  setupIpcHandlers();
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle URL navigation and determine if URLs should be opened internally
function setupUrlHandling() {
  // Handle navigation events from webContents
  app.on('web-contents-created', (event, contents) => {
    // Handle new window creation
    contents.setWindowOpenHandler(({ url }) => {
      const shouldHandleInternally = allowedUrlPatterns.some(pattern => pattern.test(url));
      
      if (shouldHandleInternally) {
        // Allow creating a new tab/window within the app
        return { action: 'allow' };
      } else {
        // Open in external browser
        shell.openExternal(url);
        return { action: 'deny' };
      }
    });
  });
}

// Set up IPC handlers for renderer-to-main process communication
function setupIpcHandlers() {
  // Handle always-on-top toggle
  ipcMain.handle('toggle-always-on-top', () => {
    if (mainWindow) {
      const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
      return !isAlwaysOnTop;
    }
    return false;
  });
} 