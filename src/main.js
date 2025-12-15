
const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, session, webContents, dialog } = require('electron');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

// GPU acceleration detection and graceful fallback
function configureGpuAcceleration() {
  // Check if we're in a headless environment or container
  const isHeadless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  const isContainer = fs.existsSync('/.dockerenv') || process.env.container === 'docker';

  // Check for NVIDIA/AMD GPU availability (basic detection)
  let hasGpu = false;
  try {
    // Check for NVIDIA GPU
    if (fs.existsSync('/dev/nvidia0') || process.env.NVIDIA_VISIBLE_DEVICES) {
      hasGpu = true;
    }
    // Check for AMD GPU
    if (fs.existsSync('/dev/dri/card0')) {
      hasGpu = true;
    }
  } catch (e) {
    // Ignore errors in GPU detection
  }

  // Disable GPU acceleration if:
  // 1. In headless environment
  // 2. In container without GPU passthrough
  // 3. No GPU detected
  // 4. Explicitly requested via environment variable
  const shouldDisableGpu = isHeadless || (isContainer && !hasGpu) || !hasGpu || process.env.GROK_DISABLE_GPU === 'true';

  if (shouldDisableGpu) {
    console.log('Grok Desktop: Disabling GPU acceleration for compatibility');
    app.disableHardwareAcceleration();

    // Additional GPU-related switches for better compatibility
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
    app.commandLine.appendSwitch('disable-accelerated-mjpeg-decode');

    // Log the reason for transparency
    const reasons = [];
    if (isHeadless) reasons.push('headless environment');
    if (isContainer && !hasGpu) reasons.push('container without GPU');
    if (!hasGpu) reasons.push('no GPU detected');
    if (process.env.GROK_DISABLE_GPU === 'true') reasons.push('explicitly disabled');

    console.log(`Grok Desktop: GPU acceleration disabled due to: ${reasons.join(', ')}`);
  } else {
    console.log('Grok Desktop: GPU acceleration enabled');
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
  app.on('gpu-process-crashed', (event, killed) => {
    if (!killed && !gpuDisabled && !restartAttempted) {
      console.warn('GPU process crashed, attempting to restart with GPU acceleration disabled');
      event.preventDefault();
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

  // Disable hardware acceleration for next start
  app.disableHardwareAcceleration();

  // Show a brief notification to user about fallback mode
  console.log('Restarting Grok Desktop with GPU acceleration disabled for compatibility...');

  // Restart the app
  app.relaunch({ args: [...process.argv.slice(1), '--disable-gpu'] });
  app.exit(0);
}

// Initialize GPU handling before app setup
handleGpuAcceleration();

// Handle open-external-url from renderer with enhanced validation
ipcMain.handle('open-external-url', async (_event, url) => {
  try {
    // Basic type and protocol validation
    if (typeof url !== 'string' || !url.startsWith('http')) {
      return false;
    }

    // Parse URL to validate format and prevent malicious schemes
    const urlObj = new URL(url);

    // Ensure it's HTTP or HTTPS (not javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Basic URL validation - ensure hostname exists and is reasonable
    if (!urlObj.hostname || urlObj.hostname.length === 0 || urlObj.hostname.length > 253) {
      return false;
    }

    // Prevent localhost/private IP access for external URLs
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return false;
    }

    await shell.openExternal(url);
    return true;
  } catch (error) {
    // Invalid URL format
    return false;
  }
});
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let aboutWindow;

// Allow autoplay without user gesture (for seamless audio playback)
try { app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); } catch (_) {}

// Define the allowed URL patterns for internal handling with secure domain validation
const allowedUrlPatterns = [
  // Allow grok.com domain and all its paths (for normal browsing), but not as subdomain
  /^https?:\/\/grok\.com(?:\/|$)/,
  // Allow x.ai domain and all its paths (for normal browsing), but not as subdomain
  /^https?:\/\/x\.ai(?:\/|$)/,
  // Allow x.com domain for OAuth flows (but not as subdomain)
  /^https?:\/\/x\.com(?:\/|$)/,
  // Allow accounts.x.ai domain and auth-related paths (but not as subdomain)
  /^https?:\/\/accounts\.x\.ai(?:\/|$)/,
  // Allow accounts.google.com domain and OAuth paths (but not as subdomain)
  /^https?:\/\/accounts\.google\.com(?:\/|$)/,
  // Allow appleid.apple.com domain and OAuth paths (but not as subdomain)
  /^https?:\/\/appleid\.apple\.com(?:\/|$)/
];

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
  exec('which wmctrl', (error) => {
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
function toggleAlwaysOnTopLinux(mainWindow) {
  if (!wmctrlAvailable) return false;

  return new Promise((resolve) => {
    // Get the window title to target it specifically
    const windowTitle = mainWindow.getTitle() || 'Grok Desktop';

    // First focus the window, then toggle always-on-top
    const commands = [
      `wmctrl -a "${windowTitle}"`,  // Focus/activate the window
      `wmctrl -r "${windowTitle}" -b toggle,above`  // Toggle always-on-top
    ];

    exec(commands.join(' && '), (error) => {
      if (error) {
        console.warn('Grok Desktop: wmctrl AOT toggle failed:', error.message);
        resolve(false);
      } else {
        console.log('Grok Desktop: AOT toggled via wmctrl');
        resolve(true);
      }
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
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation for this use case
      webviewTag: true, // Enable webview tag for tabs
      spellcheck: true
    },
    icon: path.join(__dirname, 'grok.png')
  });

  // Disable the menu bar
  Menu.setApplicationMenu(null);

  // Ensure shortcuts work when focus is on the main window UI
  try { attachShortcutHandlers(mainWindow.webContents); } catch (_) {}

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

  // Set up URL handling
  setupUrlHandling();

  // Set up IPC handlers
  setupIpcHandlers();

  // Set up WebRTC/media permissions (allow across all domains)
  setupPermissions();

  // Enable right-click context menus
  setupContextMenus();

  // Set up keyboard shortcuts (Ctrl+T, Ctrl+Tab, Ctrl+R)
  setupKeyboardShortcuts();

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
  // Handle navigation events from webContents
  app.on('web-contents-created', (event, contents) => {
    // Intercept new window requests; always deny BrowserWindow creation
    // Internal domains will be handled by the renderer's webview 'new-window' handler
    contents.setWindowOpenHandler(({ url }) => {
      const isInternal = allowedUrlPatterns.some(pattern => pattern.test(url));
      if (!isInternal) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });
}

// Set up IPC handlers for renderer-to-main process communication
function setupIpcHandlers() {
  // Handle always-on-top toggle
  ipcMain.handle('toggle-always-on-top', async () => {
    if (!mainWindow) return false;

    // On Linux, use wmctrl if available for better GNOME compatibility
    if (os.platform() === 'linux') {
      if (wmctrlAvailable) {
        const result = await toggleAlwaysOnTopLinux(mainWindow);
        if (result) return true;
      } else {
        console.warn('Grok Desktop: wmctrl not available on Linux, AOT may not work');
      }
      // Fall back to Electron method if wmctrl fails or isn't available
    }

    // Use Electron's built-in method (works on Windows/macOS, may not work reliably on Linux GNOME/Wayland)
    try {
      const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
      return !isAlwaysOnTop;
    } catch (error) {
      console.warn('Grok Desktop: Electron AOT toggle failed:', error.message);
      return false;
    }
  });

  // Provide app version to renderer
  ipcMain.handle('get-app-version', () => {
    try {
      return app.getVersion();
    } catch (_) {
      return '0.0.0';
    }
  });

  // Open About page in a new tab instead of a window
  ipcMain.handle('show-app-info', async () => {
    const name = typeof app.getName === 'function' ? app.getName() : 'Grok Desktop';
    const version = typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0';
    const repoUrl = 'https://github.com/AnRkey/Grok-Desktop';

    // Build the about page URL with parameters
    const urlObj = new URL(`file://${path.join(__dirname, '../about.html')}`);
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
  ipcMain.handle('fetch-grok-rate-limits', async () => {
    try {
      const grokSession = session.fromPartition('persist:grok');

      // Helper function to fetch rate limits for a specific model
      const fetchRateLimits = async (requestKind, modelName) => {
        try {
          // Use session.fetch which properly includes cookies
          const response = await grokSession.fetch('https://grok.com/rest/rate-limits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestKind, modelName })
          });

          if (response.status === 401 || response.status === 403) {
            return { error: 'UNAUTHORIZED' };
          }

          if (!response.ok) {
            return { error: `HTTP ${response.status}` };
          }

          return await response.json();
        } catch (e) {
          return { error: e.message };
        }
      };

      // Fetch both default and grok-4-heavy limits in parallel
      const [defaultLimits, grok4HeavyLimits] = await Promise.all([
        fetchRateLimits('DEFAULT', 'grok-3'),
        fetchRateLimits('DEFAULT', 'grok-4-heavy')
      ]);

      return {
        DEFAULT: defaultLimits,
        GROK4HEAVY: grok4HeavyLimits
      };
    } catch (error) {
      return { error: error.message };
    }
  });

  // Force light/dynamic color scheme for specific webContents id
  ipcMain.handle('force-light-color-scheme', (_event, wcId, shouldForceLight) => {
    try {
      const wc = webContents.fromId(wcId);
      if (!wc) return false;
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
      const canGoBack = contents.navigationHistory && typeof contents.navigationHistory.canGoBack === 'function' && contents.navigationHistory.canGoBack();
      const canGoForward = contents.navigationHistory && typeof contents.navigationHistory.canGoForward === 'function' && contents.navigationHistory.canGoForward();
      template.push(
        { label: 'Back', enabled: canGoBack, click: () => contents.navigationHistory && contents.navigationHistory.goBack && contents.navigationHistory.goBack() },
        { label: 'Forward', enabled: canGoForward, click: () => contents.navigationHistory && contents.navigationHistory.goForward && contents.navigationHistory.goForward() },
        { label: 'Reload', click: () => contents.reload && contents.reload() }
      );


      const menu = Menu.buildFromTemplate(template);
      const win = BrowserWindow.fromWebContents(contents);
      if (win) menu.popup({ window: win });
    });
  });
}

// Allow all media-related permissions for all domains (both default and persist:grok sessions)
function setupPermissions() {
  const enableForSession = (targetSession) => {
    if (!targetSession) return;
    try {
      // Always grant permission checks
      if (typeof targetSession.setPermissionCheckHandler === 'function') {
        targetSession.setPermissionCheckHandler(() => true);
      }
      // Always grant runtime permission requests
      if (typeof targetSession.setPermissionRequestHandler === 'function') {
        targetSession.setPermissionRequestHandler((_wc, _permission, callback, _details) => {
          try { callback(true); } catch (_) {}
        });
      }
      // Best-effort: allow device and display capture if supported by current Electron
      if (typeof targetSession.setDevicePermissionHandler === 'function') {
        targetSession.setDevicePermissionHandler(() => true);
      }
      if (typeof targetSession.setDisplayMediaRequestHandler === 'function') {
        targetSession.setDisplayMediaRequestHandler((_wc, request, callback) => {
          // Approve requested audio/video capture; defer exact source selection to default behavior
          try { callback({ video: !!request.video, audio: !!request.audio }); } catch (_) {}
        });
      }
    } catch (_) {}
  };

  try { enableForSession(session.defaultSession); } catch (_) {}
  try { enableForSession(session.fromPartition('persist:grok')); } catch (_) {}

  // Ensure any future sessions/webviews also have audio unmuted
  try {
    app.on('web-contents-created', (_event, contents) => {
      try { if (typeof contents.setAudioMuted === 'function') contents.setAudioMuted(false); } catch (_) {}
    });
  } catch (_) {}
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
        const host = contents.hostWebContents || contents;
        const win = BrowserWindow.fromWebContents(host);
        if (!win || win.isDestroyed()) return;

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