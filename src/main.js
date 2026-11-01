
const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, session, webContents, dialog } = require('electron');
const os = require('os');
const fs = require('fs');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { isInternalUrl, isGrokUrl, isExternalUrl, shouldDisableGpu } = require('./url-policy');

// GPU acceleration detection and graceful fallback
function configureGpuAcceleration() {
  if (shouldDisableGpu(process.platform, process.env, fs.existsSync)) {
    app.disableHardwareAcceleration();
    console.log('Grok Desktop: GPU acceleration disabled for compatibility');
  }

}

// Configure GPU acceleration before app initialization
configureGpuAcceleration();

// Global error handler for GPU/VAAPI issues
process.on('warning', (warning) => {
  // Handle VAAPI and GPU-related warnings gracefully
  if (warning.message && (
    warning.message.includes('vaInitialize failed') ||
    warning.message.includes('VAAPI') ||
    warning.message.includes('gpu') ||
    warning.message.includes('GPU')
  )) {
    console.log('Grok Desktop: GPU warning detected, continuing with software rendering:', warning.message);
    return;
  }
  // Log other warnings normally
  console.warn(warning.name, warning.message, warning.stack);
});

// Handle uncaught exceptions related to GPU
process.on('uncaughtException', (error) => {
  if (error.message && (
    error.message.includes('vaInitialize failed') ||
    error.message.includes('VAAPI') ||
    error.message.includes('gpu') ||
    error.message.includes('GPU')
  )) {
    console.log('Grok Desktop: GPU error caught, continuing with software rendering:', error.message);
    return; // Don't exit the process
  }
  // Re-throw non-GPU errors
  throw error;
});

// Track GPU acceleration state and restart attempts
let gpuDisabled = false;
let restartAttempted = false;

// Disable GPU acceleration if we detect initialization failures
function handleGpuAcceleration() {
  // Check if we're already in fallback mode
  if (process.argv.includes('--disable-gpu') || process.env.ELECTRON_DISABLE_GPU === '1') {
    gpuDisabled = true;
    console.log('GPU acceleration disabled by flag or environment variable');
    return;
  }

  // Listen for GPU process crashes or initialization errors
  app.on('child-process-gone', (_event, details) => {
    if (details.type === 'GPU' && details.reason !== 'clean-exit' && details.reason !== 'killed' && !gpuDisabled && !restartAttempted) {
      console.warn('GPU process crashed, attempting to restart with GPU acceleration disabled');
      restartWithGpuDisabled();
    }
  });

  // Monitor for VAAPI/GPU errors in stderr
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function(chunk, encoding, callback) {
    const data = chunk.toString();
    if (data.includes('vaapi') || data.includes('vaInitialize failed') ||
        data.includes('gpu_process_transport') || data.includes('gpu_init_failed')) {
      if (!gpuDisabled && !restartAttempted) {
        console.warn('GPU acceleration error detected, restarting with GPU disabled');
        restartWithGpuDisabled();
        return;
      }
    }
    return originalStderrWrite.call(this, chunk, encoding, callback);
  };
}

function restartWithGpuDisabled() {
  if (restartAttempted) return;
  restartAttempted = true;


  // Show a brief notification to user about fallback mode
  console.log('Restarting Grok Desktop with GPU acceleration disabled for compatibility...');

  // Restart the app
  app.relaunch({ args: [...process.argv.slice(1), '--disable-gpu'] });
  app.exit(0);
}

// Initialize GPU handling before app setup
handleGpuAcceleration();

// Only the local application shell may invoke privileged IPC.
function handleTrusted(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents ||
        event.senderFrame !== mainWindow.webContents.mainFrame ||
        event.senderFrame.url !== pathToFileURL(path.join(__dirname, '../index.html')).href) {
      throw new Error('Untrusted IPC sender');
    }
    return handler(event, ...args);
  });
}

async function openExternalUrl(url) {
  if (!isExternalUrl(url)) return false;
  try { await shell.openExternal(url); return true; }
  catch (_) { return false; }
}

handleTrusted('open-external-url', (_event, url) => openExternalUrl(url));
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Allow autoplay without user gesture (for seamless audio playback)
try { app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); } catch (_) {}

// Enforce single instance
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Track webContents that should always use light color scheme
const forcedLightWebContentsIds = new Set();
const guestHosts = new Map();

// Always On Top (AOT) functionality for cross-platform compatibility
// Windows: Uses Electron's built-in setAlwaysOnTop() method
// Linux: Uses wmctrl command-line tool for better GNOME/Wayland compatibility
// If running under Wayland on Linux, automatically restarts with X11 forced

let wmctrlAvailable = false;
let isWayland = false;
let x11Forced = false;

function checkWmctrlAvailability() {
  if (os.platform() !== 'linux') return;

  // Check if we're running under Wayland (Rocky Linux 10 defaults to Wayland)
  isWayland = !!process.env.WAYLAND_DISPLAY || !!process.env.XDG_SESSION_TYPE?.includes('wayland');
  x11Forced = process.argv.includes('--ozone-platform=x11');

  console.log(`Grok Desktop: Display server detection - Wayland: ${isWayland}, X11 forced: ${x11Forced}`);

  if (isWayland && !x11Forced) {
    console.log('Grok Desktop: Running under Wayland, forcing X11 for AOT compatibility');
    // GNOME on Wayland intentionally restricts programmatic AOT for security
    // We force X11 mode where wmctrl works reliably
    forceX11Mode();
    return;
  }

  // Check if wmctrl is available (install with: sudo dnf install wmctrl on Rocky Linux)
  execFile('which', ['wmctrl'], (error) => {
    wmctrlAvailable = !error;
    if (wmctrlAvailable) {
      console.log('Grok Desktop: wmctrl available for AOT fallback');
    } else {
      console.warn('Grok Desktop: wmctrl not available, AOT may not work on this system');
      console.warn('Grok Desktop: Install wmctrl with: sudo dnf install wmctrl');
    }
  });
}

function forceX11Mode() {
  console.log('Grok Desktop: Relaunching with X11 for AOT compatibility...');

  // Relaunch with X11 forced to enable wmctrl functionality
  const newArgs = [...process.argv.slice(1), '--ozone-platform=x11'];
  app.relaunch({
    args: newArgs,
    env: { ...process.env, OZONE_PLATFORM: 'x11', ELECTRON_USE_X11: '1' }
  });
  app.exit(0);
}

// Fallback AOT toggle using wmctrl on Linux
function toggleAlwaysOnTopLinux(window, enabled) {
  return new Promise((resolve) => {
    const handle = window.getNativeWindowHandle();
    const id = `0x${handle.readUInt32LE(0).toString(16)}`;
    execFile('wmctrl', ['-i', '-r', id, '-b', `${enabled ? 'add' : 'remove'},above`], (error) => {
      if (error) console.warn('Grok Desktop: wmctrl AOT fallback failed:', error.message);
      resolve(!error);
    });
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, // Enable webview tag for tabs
      spellcheck: true
    },
    icon: path.join(__dirname, 'grok.png')
  });

  // Never launch pinned above other apps (user can opt in via AOT)
  try { mainWindow.setAlwaysOnTop(false); } catch (_) {}

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
  // Apply color scheme to all web contents (main and webviews)
  const applyColorSchemeToAll = () => {
    const scheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    try {
      webContents.getAllWebContents().forEach((wc) => {
        if (typeof wc.setColorScheme === 'function') {
          if (forcedLightWebContentsIds.has(wc.id)) {
            wc.setColorScheme('light');
          } else {
            wc.setColorScheme(scheme);
          }
        }
      });
    } catch (_) {}
  };
  applyColorSchemeToAll();

  nativeTheme.on('updated', () => {
    sendTheme();
    applyColorSchemeToAll();
  });

  // Open DevTools in development mode
  // mainWindow.webContents.openDevTools();

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Ensure newly created webContents/webviews get correct color scheme
  app.on('web-contents-created', (_event, contents) => {
    const scheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    if (typeof contents.setColorScheme === 'function') {
      if (forcedLightWebContentsIds.has(contents.id)) {
        contents.setColorScheme('light');
      } else {
        contents.setColorScheme(scheme);
      }
    }
    contents.on('did-attach-webview', (_e, wc) => {
      if (wc && typeof wc.setColorScheme === 'function') {
        if (forcedLightWebContentsIds.has(wc.id)) {
          wc.setColorScheme('light');
        } else {
          wc.setColorScheme(scheme);
        }
      }
    });
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  setupUrlHandling();
  setupIpcHandlers();
  setupPermissions();
  setupContextMenus();
  setupKeyboardShortcuts();
  checkWmctrlAvailability();
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
  const aboutUrl = pathToFileURL(path.join(__dirname, '../about.html')).href;
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-attach-webview', (_event, guest) => {
      guestHosts.set(guest.id, contents);
      guest.once('destroyed', () => { guestHosts.delete(guest.id); forcedLightWebContentsIds.delete(guest.id); });
    });
    contents.on('will-attach-webview', (event, preferences, params) => {
      if (!isInternalUrl(params.src) && params.src.split('?')[0] !== aboutUrl) {
        event.preventDefault();
        return;
      }
      delete preferences.preload;
      preferences.nodeIntegration = false;
      preferences.nodeIntegrationInWorker = false;
      preferences.contextIsolation = true;
      preferences.sandbox = true;
      preferences.webSecurity = true;
    });
    const guardNavigation = (event, url) => {
      if (contents === mainWindow?.webContents || !isInternalUrl(url)) {
        event.preventDefault();
        if (contents !== mainWindow?.webContents) void openExternalUrl(url);
      }
    };
    contents.on('will-navigate', guardNavigation);
    contents.on('will-redirect', guardNavigation);
    contents.setWindowOpenHandler(({ url }) => {
      if (isGrokUrl(url)) {
        mainWindow?.webContents.send('open-internal-tab', url, true);
        return { action: 'deny' };
      }
      if (isInternalUrl(url)) {
        // OAuth providers can use window.opener; keep a real, isolated popup
        // in the same persistent session rather than discarding the request.
        return { action: 'allow', overrideBrowserWindowOptions: {
          parent: mainWindow, autoHideMenuBar: true, width: 700, height: 800,
          webPreferences: { session: contents.session, nodeIntegration: false,
            contextIsolation: true, sandbox: true, webviewTag: false }
        } };
      }
      void openExternalUrl(url);
      return { action: 'deny' };
    });
  });
}

// Set up IPC handlers for renderer-to-main process communication
function setupIpcHandlers() {
  // Handle always-on-top toggle
  // Read current always-on-top state
  handleTrusted('get-always-on-top', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try { return mainWindow.isAlwaysOnTop(); } catch (_) { return false; }
  });

  handleTrusted('toggle-always-on-top', async () => {
    if (!mainWindow) return false;

    const enabled = !mainWindow.isAlwaysOnTop();
    try {
      const window = mainWindow;
      await new Promise(resolve => {
        const done = () => { clearTimeout(timeout); window.removeListener('always-on-top-changed', done); resolve(); };
        const timeout = setTimeout(done, 500);
        window.once('always-on-top-changed', done);
        // Electron 45's default floating level does not pin Windows windows.
        window.setAlwaysOnTop(enabled, process.platform === 'win32' ? 'normal' : 'floating');
      });
      if (os.platform() === 'linux' && wmctrlAvailable) {
        await toggleAlwaysOnTopLinux(mainWindow, enabled);
      }
      return mainWindow.isAlwaysOnTop();
    } catch (error) {
      console.warn('Grok Desktop: AOT toggle failed:', error.message);
      return mainWindow.isAlwaysOnTop();
    }
  });

  // Provide app version to renderer
  handleTrusted('get-app-version', () => {
    try {
      return app.getVersion();
    } catch (_) {
      return '0.0.0';
    }
  });

  // Open About page in a new tab instead of a window
  handleTrusted('show-app-info', async () => {
    const name = typeof app.getName === 'function' ? app.getName() : 'Grok Desktop';
    const version = typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0';
    const repoUrl = 'https://github.com/AnRkey/Grok-Desktop';

    // Build the about page URL with parameters
    const urlObj = pathToFileURL(path.join(__dirname, '../about.html'));
    urlObj.searchParams.set('name', name);
    urlObj.searchParams.set('version', version);
    urlObj.searchParams.set('repo', repoUrl);

    // Derive developer/contact from the GitHub repo URL
    let developer = 'AnRkey';
    try {
      const m = repoUrl.match(/^https?:\/\/github\.com\/([^/]+)/i);
      if (m && m[1]) developer = m[1];
    } catch (_) {}
    const contactUrl = 'https://github.com/AnRkey/Grok-Desktop/discussions';
    urlObj.searchParams.set('developer', developer);
    urlObj.searchParams.set('contact', contactUrl);

    // Send the URL to the renderer to create a new tab
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('open-about-tab', urlObj.toString());
    }

    return { name, version };
  });

  // Fetch Grok usage rate limits
  // Usage stats feature inspired by Joshua Wang's Grok Usage Watch extension
  // https://github.com/JoshuaWang2211
  // Fixed: Execute fetch inside the webview's context (where user is logged in)
  // to avoid 403 errors from session.fetch() in main process
  // Thanks to Joshua for identifying the root cause and suggesting this solution!
  handleTrusted('fetch-grok-rate-limits', async (_event, activeId) => {
    try {
      // Find the active Grok webview's webContents
      const allContents = webContents.getAllWebContents();
      const grokWebview = allContents.find(wc => {
        try {
          const url = wc.getURL();
          return wc.id === activeId && wc.getType() === 'webview' && isGrokUrl(url);
        } catch (e) {
          return false;
        }
      });
      
      if (!grokWebview) {
        return { error: 'No Grok tab found' };
      }
      
      // Execute the fetch inside the webview's context where session cookies are available
      const result = await grokWebview.executeJavaScript(`
        (async () => {
          const fetchRateLimits = async (requestKind, modelName) => {
            try {
              const response = await fetch('https://grok.com/rest/rate-limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestKind, modelName })
              });
              
              if (response.status === 401 || response.status === 403) {
                return { error: 'UNAUTHORIZED' };
              }
              if (!response.ok) {
                return { error: \`HTTP \${response.status}\` };
              }
              return await response.json();
            } catch (e) {
              return { error: e.message };
            }
          };
          
          const [defaultLimits, grok4HeavyLimits] = await Promise.all([
            fetchRateLimits('DEFAULT', 'grok-3'),
            fetchRateLimits('DEFAULT', 'grok-4-heavy')
          ]);
          
          return {
            DEFAULT: defaultLimits,
            GROK4HEAVY: grok4HeavyLimits
          };
        })()
      `);
      
      return result;
    } catch (error) {
      return { error: error.message };
    }
  });

  // Force light/dynamic color scheme for specific webContents id
  handleTrusted('force-light-color-scheme', (_event, wcId, shouldForceLight) => {
    try {
      const wc = webContents.fromId(wcId);
      if (!wc || wc.getType() !== 'webview' || guestHosts.get(wc.id) !== mainWindow.webContents) return false;
      if (shouldForceLight) {
        forcedLightWebContentsIds.add(wcId);
        if (typeof wc.setColorScheme === 'function') wc.setColorScheme('light');
        // Stronger override via DevTools Protocol: emulate prefers-color-scheme: light
        try {
          if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
          wc.debugger.sendCommand('Emulation.setEmulatedMedia', {
            features: [{ name: 'prefers-color-scheme', value: 'light' }]
          });
        } catch (_) {}
      } else {
        forcedLightWebContentsIds.delete(wcId);
        const scheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        if (typeof wc.setColorScheme === 'function') wc.setColorScheme(scheme);
        // Remove emulation
        try {
          if (wc.debugger.isAttached()) {
            wc.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [] });
            wc.debugger.detach();
          }
        } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
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
          click: () => openExternalUrl(params.linkURL)
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
      const canGoBack = contents.navigationHistory && typeof contents.navigationHistory.canGoBack === 'function' && contents.navigationHistory.canGoBack();
      const canGoForward = contents.navigationHistory && typeof contents.navigationHistory.canGoForward === 'function' && contents.navigationHistory.canGoForward();
      template.push(
        { label: 'Back', enabled: canGoBack, click: () => contents.navigationHistory && contents.navigationHistory.goBack && contents.navigationHistory.goBack() },
        { label: 'Forward', enabled: canGoForward, click: () => contents.navigationHistory && contents.navigationHistory.goForward && contents.navigationHistory.goForward() },
        { label: 'Reload', click: () => contents.reload && contents.reload() }
      );


      const win = BrowserWindow.fromWebContents(contents);
      template.push({ label: 'Inspect Element', click: () => contents.inspectElement(params.x, params.y) });
      const inspectMenu = Menu.buildFromTemplate(template);
      inspectMenu.popup({ window: win || mainWindow });
    });
  });
}

// Grant voice/camera access only to Grok after the user agrees.
function setupPermissions() {
  const permissions = new Set(['media', 'fullscreen', 'clipboard-sanitized-write']);
  for (const target of [session.defaultSession, session.fromPartition('persist:grok')]) {
    target.setPermissionCheckHandler((_wc, permission, origin) =>
      isGrokUrl(origin) && permissions.has(permission));
    target.setPermissionRequestHandler(async (wc, permission, callback, details) => {
      if (!isGrokUrl(details.requestingUrl || wc.getURL()) || !permissions.has(permission)) {
        callback(false);
        return;
      }
      if (permission !== 'media') { callback(true); return; }
      try {
        const result = await dialog.showMessageBox(mainWindow, {
          type: 'question', buttons: ['Block', 'Allow'], defaultId: 0, cancelId: 0,
          message: 'Allow grok.com to use your microphone or camera?',
          detail: `Requested: ${(details.mediaTypes || ['media']).join(', ')}`
        });
        callback(result.response === 1);
      } catch (_) { callback(false); }
    });
    target.setDevicePermissionHandler(() => false);
    target.setDisplayMediaRequestHandler(async (request, callback) => {
      if (!isGrokUrl(request.frame?.url)) { callback({}); return; }
      try {
        const { desktopCapturer } = require('electron');
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        const result = await dialog.showMessageBox(mainWindow, {
          type: 'question', buttons: ['Cancel', ...sources.map(source => source.name)],
          defaultId: 0, cancelId: 0, message: 'Choose what to share with grok.com'
        });
        const source = sources[result.response - 1];
        callback(source ? { video: source } : {});
      } catch (_) { callback({}); }
    });
  }
}

// Keyboard shortcuts wired at the webContents level so they work in webviews too
function setupKeyboardShortcuts() {
  try {
    app.on('web-contents-created', (_event, contents) => attachShortcutHandlers(contents));
  } catch (_) {}
}

function attachShortcutHandlers(contents) {
  try {
    contents.on('before-input-event', (event, input) => {
      try {
        // Only handle keyDown with Control on Windows/Linux
        if (input.type !== 'keyDown' || !input.control) return;

        const key = input.key;
        // Deliver to the hosting window (handles webviews as well)
        const host = guestHosts.get(contents.id) || contents;
        const win = BrowserWindow.fromWebContents(host);
        if (!win || win.isDestroyed()) return;

        // Ctrl+K -> Remap to Ctrl+Shift+K for grok.com search
        // grok.com responds to Ctrl+Shift+K, not Ctrl+K (which Chromium intercepts for omnibox)
        if ((key === 'k' || key === 'K') && !input.shift) {
          event.preventDefault();
          // Send Ctrl+Shift+K to the webContents using sendInputEvent (creates trusted OS-level events)
          contents.sendInputEvent({
            type: 'keyDown',
            keyCode: 'K',
            modifiers: ['control', 'shift']
          });
          // Send keyUp after a short delay
          setTimeout(() => {
            try {
              contents.sendInputEvent({
                type: 'keyUp',
                keyCode: 'K',
                modifiers: ['control', 'shift']
              });
            } catch (_) {}
          }, 10);
          return;
        }
        // Don't intercept Ctrl+Shift+K - let it pass through naturally (it already works)

        // Ctrl+T -> new tab
        if (key === 't' || key === 'T') {
          event.preventDefault();
          win.webContents.send('shortcut-new-tab');
          return;
        }
        // Ctrl+Tab -> next tab, Ctrl+Shift+Tab -> previous tab
        if (key === 'Tab') {
          event.preventDefault();
          if (input.shift) {
            win.webContents.send('shortcut-prev-tab');
          } else {
            win.webContents.send('shortcut-next-tab');
          }
          return;
        }
        // Ctrl+R -> reload active tab (override default window reload)
        if (key === 'r' || key === 'R') {
          event.preventDefault();
          win.webContents.send('shortcut-reload-tab');
          return;
        }
        // Ctrl+I -> show information/about dialog
        if (key === 'i' || key === 'I') {
          event.preventDefault();
          win.webContents.send('shortcut-show-info');
          return;
        }
      } catch (_) {}
    });
  } catch (_) {}
}