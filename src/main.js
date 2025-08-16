const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, session } = require('electron');
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
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation for this use case
      webviewTag: true, // Enable webview tag for tabs
      spellcheck: true
    },
    icon: path.join(__dirname, 'grok.png')
  });

  // Disable the menu bar
  Menu.setApplicationMenu(null);

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Configure spellchecker languages for default session and webview partition
  try {
    const locale = (typeof app.getLocale === 'function' && app.getLocale()) || 'en-US';
    const languages = Array.isArray(locale) ? locale : [locale];

    const defaultSession = session.defaultSession;
    if (defaultSession) {
      if (typeof defaultSession.setSpellCheckerEnabled === 'function') {
        defaultSession.setSpellCheckerEnabled(true);
      }
      if (typeof defaultSession.setSpellCheckerLanguages === 'function') {
        defaultSession.setSpellCheckerLanguages(languages);
      }
    }

    const grokSession = session.fromPartition('persist:grok');
    if (grokSession) {
      if (typeof grokSession.setSpellCheckerEnabled === 'function') {
        grokSession.setSpellCheckerEnabled(true);
      }
      if (typeof grokSession.setSpellCheckerLanguages === 'function') {
        grokSession.setSpellCheckerLanguages(languages);
      }
    }
  } catch (_) {}

  // Send initial theme and listen for OS theme changes
  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  };
  sendTheme();
  nativeTheme.on('updated', sendTheme);

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

  // Enable right-click context menus
  setupContextMenus();
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

  // Provide app version to renderer
  ipcMain.handle('get-app-version', () => {
    try {
      return app.getVersion();
    } catch (_) {
      return '0.0.0';
    }
  });
} 

// Enable context menus across the app (window and webviews)
function setupContextMenus() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('context-menu', (event, params) => {
      const template = [];

      // Spell-check suggestions (when right-clicking a misspelled word)
      if (params.misspelledWord && params.misspelledWord.trim()) {
        const suggestions = Array.isArray(params.dictionarySuggestions)
          ? params.dictionarySuggestions.slice(0, 6)
          : [];

        if (suggestions.length > 0 && typeof contents.replaceMisspelling === 'function') {
          suggestions.forEach((suggestion) => {
            template.push({
              label: suggestion,
              click: () => contents.replaceMisspelling(suggestion)
            });
          });
        }

        // Allow adding the word to the custom dictionary for this session
        if (contents.session && typeof contents.session.addWordToSpellCheckerDictionary === 'function') {
          template.push({
            label: `Add to Dictionary: "${params.misspelledWord}"`,
            click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          });
        }

        if (template.length > 0) {
          template.push({ type: 'separator' });
        }
      }

      // Link options
      if (params.linkURL) {
        template.push({
          label: 'Open Link in Browser',
          click: () => shell.openExternal(params.linkURL)
        });
      }

      // Image options
      if (params.hasImageContents && params.srcURL) {
        template.push({
          label: 'Save Image As…',
          click: () => contents.downloadURL(params.srcURL)
        });
      }

      // Edit actions
      if (params.isEditable) {
        template.push(
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        );
      } else if (params.selectionText && params.selectionText.trim()) {
        template.push({ role: 'copy' }, { type: 'separator' });
      }

      // Navigation (for webviews/pages)
      const canGoBack = typeof contents.canGoBack === 'function' && contents.canGoBack();
      const canGoForward = typeof contents.canGoForward === 'function' && contents.canGoForward();
      template.push(
        { label: 'Back', enabled: canGoBack, click: () => contents.goBack && contents.goBack() },
        { label: 'Forward', enabled: canGoForward, click: () => contents.goForward && contents.goForward() },
        { label: 'Reload', click: () => contents.reload && contents.reload() }
      );

      // Inspect element for debugging
      template.push({ type: 'separator' }, {
        label: 'Inspect Element',
        click: () => contents.inspectElement(params.x, params.y)
      });

      const menu = Menu.buildFromTemplate(template);
      const win = BrowserWindow.fromWebContents(contents);
      if (win) menu.popup({ window: win });
    });
  });
}