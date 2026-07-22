const { app, BrowserWindow, shell, Menu, ipcMain, nativeTheme, session, webContents, dialog, clipboard } = require('electron');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// GPU acceleration detection and graceful fallback
function configureGpuAcceleration() {
  const isHeadless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  const isContainer = fs.existsSync('/.dockerenv') || process.env.container === 'docker';

  let hasGpu = false;
  try {
    if (fs.existsSync('/dev/nvidia0') || process.env.NVIDIA_VISIBLE_DEVICES) {
      hasGpu = true;
    }
    if (fs.existsSync('/dev/dri/card0')) {
      hasGpu = true;
    }
  } catch (e) {}

  const shouldDisableGpu = isHeadless || (isContainer && !hasGpu) || !hasGpu || process.env.GROK_DISABLE_GPU === 'true';

  if (shouldDisableGpu) {
    console.log('Grok Desktop: Disabling GPU acceleration for compatibility');
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
    app.commandLine.appendSwitch('disable-accelerated-mjpeg-decode');

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

configureGpuAcceleration();

process.on('warning', (warning) => {
  if (warning.message && (
    warning.message.includes('vaInitialize failed') ||
    warning.message.includes('VAAPI') ||
    warning.message.includes('gpu') ||
    warning.message.includes('GPU')
  )) {
    console.log('Grok Desktop: GPU warning detected, continuing with software rendering:', warning.message);
    return;
  }
  console.warn(warning.name, warning.message, warning.stack);
});

process.on('uncaughtException', (error) => {
  if (error.message && (
    error.message.includes('vaInitialize failed') ||
    error.message.includes('VAAPI') ||
    error.message.includes('gpu') ||
    error.message.includes('GPU')
  )) {
    console.log('Grok Desktop: GPU error caught, continuing with software rendering:', error.message);
    return;
  }
  throw error;
});

let gpuDisabled = false;
let restartAttempted = false;

function handleGpuAcceleration() {
  if (process.argv.includes('--disable-gpu') || process.env.ELECTRON_DISABLE_GPU === '1') {
    gpuDisabled = true;
    console.log('GPU acceleration disabled by flag or environment variable');
    return;
  }

  app.on('gpu-process-crashed', (event, killed) => {
    if (!killed && !gpuDisabled && !restartAttempted) {
      console.warn('GPU process crashed, attempting to restart with GPU acceleration disabled');
      event.preventDefault();
      restartWithGpuDisabled();
    }
  });

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
  app.disableHardwareAcceleration();
  console.log('Restarting Grok Desktop with GPU acceleration disabled for compatibility...');
  app.relaunch({ args: [...process.argv.slice(1), '--disable-gpu'] });
  app.exit(0);
}

handleGpuAcceleration();

// Secure external URL handler
ipcMain.handle('open-external-url', async (_event, url) => {
  try {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    if (!urlObj.hostname || urlObj.hostname.length === 0 || urlObj.hostname.length > 253) return false;

    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return false;
    }

    await shell.openExternal(url);
    return true;
  } catch (error) {
    return false;
  }
});

let mainWindow;
let aboutWindow;

// Pasta atualmente selecionada (para segurança)
let currentWorkingFolder = null;

try { app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); } catch (_) {}

const allowedUrlPatterns = [
  /^https?:\/\/grok\.com(?:\/|$)/,
  /^https?:\/\/x\.ai(?:\/|$)/,
  /^https?:\/\/x\.com(?:\/|$)/,
  /^https?:\/\/accounts\.x\.ai(?:\/|$)/,
  /^https?:\/\/accounts\.google\.com(?:\/|$)/,
  /^https?:\/\/appleid\.apple\.com(?:\/|$)/
];

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

const forcedLightWebContentsIds = new Set();

let wmctrlAvailable = false;
let isWayland = false;
let x11Forced = false;

function checkWmctrlAvailability() {
  if (os.platform() !== 'linux') return;

  isWayland = !!process.env.WAYLAND_DISPLAY || !!process.env.XDG_SESSION_TYPE?.includes('wayland');
  x11Forced = process.argv.includes('--ozone-platform=x11');

  console.log(`Grok Desktop: Display server detection - Wayland: ${isWayland}, X11 forced: ${x11Forced}`);

  if (isWayland && !x11Forced) {
    console.log('Grok Desktop: Running under Wayland, forcing X11 for AOT compatibility');
    forceX11Mode();
    return;
  }

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
  const newArgs = [...process.argv.slice(1), '--ozone-platform=x11'];
  app.relaunch({
    args: newArgs,
    env: { ...process.env, OZONE_PLATFORM: 'x11', ELECTRON_USE_X11: '1' }
  });
  app.exit(0);
}

function toggleAlwaysOnTopLinux(mainWindow) {
  if (!wmctrlAvailable) return false;

  return new Promise((resolve) => {
    const windowTitle = mainWindow.getTitle() || 'Grok Desktop';
    const commands = [
      `wmctrl -a "${windowTitle}"`,
      `wmctrl -r "${windowTitle}" -b toggle,above`
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

// ===== Segurança de path =====
function isPathSafe(filePath) {
  if (!currentWorkingFolder || !filePath) return false;
  try {
    const resolved = path.resolve(filePath);
    const base = path.resolve(currentWorkingFolder);
    return resolved.startsWith(base + path.sep) || resolved === base;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'grok.png')
  });

  Menu.setApplicationMenu(null);

  try { attachShortcutHandlers(mainWindow.webContents); } catch (_) {}

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

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

  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-theme-updated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  };
  sendTheme();

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupUrlHandling();
  setupIpcHandlers();
  setupPermissions();
  setupContextMenus();
  setupKeyboardShortcuts();

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

app.whenReady().then(() => {
  checkWmctrlAvailability();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function setupUrlHandling() {
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      const isInternal = allowedUrlPatterns.some(pattern => pattern.test(url));
      if (!isInternal) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });
}

function setupIpcHandlers() {
  ipcMain.handle('toggle-always-on-top', async () => {
    if (!mainWindow) return false;

    if (os.platform() === 'linux') {
      if (wmctrlAvailable) {
        const result = await toggleAlwaysOnTopLinux(mainWindow);
        if (result) return true;
      } else {
        console.warn('Grok Desktop: wmctrl not available on Linux, AOT may not work');
      }
    }

    try {
      const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
      return !isAlwaysOnTop;
    } catch (error) {
      console.warn('Grok Desktop: Electron AOT toggle failed:', error.message);
      return false;
    }
  });

  ipcMain.handle('get-app-version', () => {
    try {
      return app.getVersion();
    } catch (_) {
      return '0.0.0';
    }
  });

  ipcMain.handle('show-app-info', async () => {
    const name = typeof app.getName === 'function' ? app.getName() : 'Grok Desktop';
    const version = typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0';
    const repoUrl = 'https://github.com/AnRkey/Grok-Desktop';

    const urlObj = new URL(`file://${path.join(__dirname, '../about.html')}`);
    urlObj.searchParams.set('name', name);
    urlObj.searchParams.set('version', version);
    urlObj.searchParams.set('repo', repoUrl);

    let developer = 'AnRkey';
    try {
      const m = repoUrl.match(/^https?:\/\/github\.com\/([^/]+)/i);
      if (m && m[1]) developer = m[1];
    } catch (_) {}
    const contactUrl = 'https://github.com/AnRkey/Grok-Desktop/discussions';
    urlObj.searchParams.set('developer', developer);
    urlObj.searchParams.set('contact', contactUrl);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('open-about-tab', urlObj.toString());
    }

    return { name, version };
  });

  ipcMain.handle('fetch-grok-rate-limits', async () => {
    try {
      const allContents = webContents.getAllWebContents();
      const grokWebview = allContents.find(wc => {
        try {
          const url = wc.getURL();
          return url.includes('grok.com') && !url.includes('about.html');
        } catch (e) {
          return false;
        }
      });

      if (!grokWebview) {
        return { error: 'No Grok tab found' };
      }

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

  ipcMain.handle('force-light-color-scheme', (_event, wcId, shouldForceLight) => {
    try {
      const wc = webContents.fromId(wcId);
      if (!wc) return false;
      if (shouldForceLight) {
        forcedLightWebContentsIds.add(wcId);
        if (typeof wc.setColorScheme === 'function') wc.setColorScheme('light');
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

  // ===== FOLDER ACCESS =====
  ipcMain.handle('select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Selecionar pasta para o Grok'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }

      currentWorkingFolder = result.filePaths[0];
      return currentWorkingFolder;
    } catch (error) {
      console.error('Error selecting folder:', error);
      return null;
    }
  });

  ipcMain.handle('read-folder-structure', async (_event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { error: 'Caminho inválido' };
      }

      currentWorkingFolder = folderPath;

      const MAX_DEPTH = 3;
      const MAX_FILES = 150;

      function walk(dir, depth = 0) {
        if (depth > MAX_DEPTH) return [];

        let entries;
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return [];
        }

        const result = [];
        let count = 0;

        for (const entry of entries) {
          if (count >= MAX_FILES) {
            result.push({ name: '...', type: 'truncated' });
            break;
          }

          if (['node_modules', '.git', '.next', 'dist', 'build', '.cache', '__pycache__', '.vscode', '.idea'].includes(entry.name)) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            result.push({
              name: entry.name,
              type: 'directory',
              children: walk(fullPath, depth + 1)
            });
          } else {
            result.push({
              name: entry.name,
              type: 'file'
            });
          }
          count++;
        }

        return result;
      }

      const structure = walk(folderPath);

      return {
        path: folderPath,
        structure
      };
    } catch (error) {
      console.error('Error reading folder:', error);
      return { error: error.message };
    }
  });

  // ===== CLIPBOARD =====
  ipcMain.handle('write-clipboard', (_event, text) => {
    try {
      clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error('Clipboard error:', e);
      return false;
    }
  });

  // ===== LER ARQUIVO =====
  ipcMain.handle('read-file', async (_event, filePath) => {
    try {
      if (!isPathSafe(filePath)) {
        return { error: 'Acesso negado: arquivo fora da pasta de trabalho' };
      }

      if (!fs.existsSync(filePath)) {
        return { error: 'Arquivo não encontrado' };
      }

      const stats = fs.statSync(filePath);
      if (stats.size > 500 * 1024) { // limite de 500KB
        return { error: 'Arquivo muito grande (máximo 500KB)' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return {
        path: filePath,
        content,
        size: stats.size
      };
    } catch (error) {
      return { error: error.message };
    }
  });

  // ===== ESCREVER ARQUIVO =====
  ipcMain.handle('write-file', async (_event, filePath, content) => {
    try {
      if (!isPathSafe(filePath)) {
        return { error: 'Acesso negado: arquivo fora da pasta de trabalho' };
      }

      // Criar pasta se não existir
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath };
    } catch (error) {
      return { error: error.message };
    }
  });

  // ===== BUSCAR ARQUIVOS =====
  ipcMain.handle('search-files', async (_event, folderPath, query) => {
    try {
      if (!folderPath || !query) {
        return { error: 'Pasta ou termo de busca inválido' };
      }

      const results = [];
      const MAX_RESULTS = 50;
      const q = query.toLowerCase();

      function search(dir, depth = 0) {
        if (depth > 4 || results.length >= MAX_RESULTS) return;

        let entries;
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (results.length >= MAX_RESULTS) break;

          if (['node_modules', '.git', '.next', 'dist', 'build', '.cache', '__pycache__'].includes(entry.name)) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (entry.name.toLowerCase().includes(q)) {
              results.push({ path: fullPath, type: 'directory', name: entry.name });
            }
            search(fullPath, depth + 1);
          } else {
            // Busca no nome do arquivo
            if (entry.name.toLowerCase().includes(q)) {
              results.push({ path: fullPath, type: 'file', name: entry.name });
            }
          }
        }
      }

      search(folderPath);
      return { results, query };
    } catch (error) {
      return { error: error.message };
    }
  });
}

function setupContextMenus() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('context-menu', (event, params) => {
      const template = [];

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

      if (params.linkURL) {
        template.push({
          label: 'Open Link in Browser',
          click: () => shell.openExternal(params.linkURL)
        });
      }

      if (params.hasImageContents && params.srcURL) {
        template.push({
          label: 'Save Image As…',
          click: () => contents.downloadURL(params.srcURL)
        });
      }

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

function setupPermissions() {
  const isAllowedOrigin = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      return allowedUrlPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  };

  const enableForSession = (targetSession) => {
    if (!targetSession) return;
    try {
      if (typeof targetSession.setPermissionCheckHandler === 'function') {
        targetSession.setPermissionCheckHandler((wc, permission, requestingOrigin) => {
          return isAllowedOrigin(requestingOrigin);
        });
      }

      if (typeof targetSession.setPermissionRequestHandler === 'function') {
        targetSession.setPermissionRequestHandler((wc, permission, callback, details) => {
          const url = details?.requestingUrl || (wc && typeof wc.getURL === 'function' ? wc.getURL() : '');
          if (isAllowedOrigin(url) &&
              ['media', 'mediaKeySystem', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write'].includes(permission)) {
            callback(true);
          } else {
            callback(false);
          }
        });
      }

      if (typeof targetSession.setDevicePermissionHandler === 'function') {
        targetSession.setDevicePermissionHandler((details) => {
          return isAllowedOrigin(details.origin || details.securityOrigin || '');
        });
      }

      if (typeof targetSession.setDisplayMediaRequestHandler === 'function') {
        targetSession.setDisplayMediaRequestHandler((wc, request, callback) => {
          const url = wc.getURL();
          if (isAllowedOrigin(url)) {
            callback({ video: !!request.video, audio: !!request.audio });
          } else {
            callback({});
          }
        });
      }
    } catch (e) {
      console.error('Permission setup error:', e);
    }
  };

  try { enableForSession(session.defaultSession); } catch (_) {}
  try { enableForSession(session.fromPartition('persist:grok')); } catch (_) {}

  try {
    app.on('web-contents-created', (_event, contents) => {
      try {
        if (typeof contents.setAudioMuted === 'function') contents.setAudioMuted(false);
      } catch (_) {}
    });
  } catch (_) {}
}

function setupKeyboardShortcuts() {
  try {
    app.on('web-contents-created', (_event, contents) => attachShortcutHandlers(contents));
  } catch (_) {}
}

function attachShortcutHandlers(contents) {
  try {
    contents.on('before-input-event', (event, input) => {
      try {
        if (input.type !== 'keyDown' || !input.control) return;

        const key = input.key;
        const host = contents.hostWebContents || contents;
        const win = BrowserWindow.fromWebContents(host);
        if (!win || win.isDestroyed()) return;

        if ((key === 'k' || key === 'K') && !input.shift) {
          event.preventDefault();
          contents.sendInputEvent({
            type: 'keyDown',
            keyCode: 'K',
            modifiers: ['control', 'shift']
          });
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

        if (key === 't' || key === 'T') {
          event.preventDefault();
          win.webContents.send('shortcut-new-tab');
          return;
        }

        if (key === 'Tab') {
          event.preventDefault();
          if (input.shift) {
            win.webContents.send('shortcut-prev-tab');
          } else {
            win.webContents.send('shortcut-next-tab');
          }
          return;
        }

        if (key === 'r' || key === 'R') {
          event.preventDefault();
          win.webContents.send('shortcut-reload-tab');
          return;
        }

        if (key === 'i' || key === 'I') {
          event.preventDefault();
          win.webContents.send('shortcut-show-info');
          return;
        }
      } catch (_) {}
    });
  } catch (_) {}
}