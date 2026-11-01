const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const profile = path.resolve('.tmp', `smoke-profile-${Date.now()}`);
  fs.mkdirSync(profile, { recursive: true });
  const executablePath = process.env.GROK_TEST_EXECUTABLE || require('electron');
  const args = [`--user-data-dir=${profile}`, '--host-resolver-rules=MAP * ~NOTFOUND', '--use-fake-device-for-media-stream'];
  if (!process.env.GROK_TEST_EXECUTABLE) args.unshift('.');
  const app = await electron.launch({ executablePath, args, env, timeout: 30000 });
  const errors = [];
  try {
    const page = await app.firstWindow();
    page.on('pageerror', error => { errors.push(error.message); console.error('Renderer:', error.message); });
    await app.evaluate(async ({ session }) => {
      await session.fromPartition('persist:grok').protocol.handle('https', request => {
        if (request.url.endsWith('/rest/rate-limits')) {
          return new Response(JSON.stringify({ totalTokens: 100,
            lowEffortRateLimits: { remainingQueries: 50 },
            highEffortRateLimits: { remainingQueries: 10, cost: 5 },
            remainingQueries: 8, totalQueries: 10 }), {
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response('<!doctype html><title>Fixture Grok</title>' +
          '<h1>Offline Grok fixture</h1><a id="search-result" target="_blank" href="https://grok.com/c/result">New Tab</a>' +
          '<a id="auth" target="_blank" href="https://accounts.x.ai/sign-in">Sign in</a>' +
          '<textarea id="prompt"></textarea><div style="width:320px;aspect-ratio:16/9;background:green" id="video"></div>', {
          headers: { 'content-type': 'text/html' }
        });
      });
    });
    await page.waitForSelector('webview');
    await app.evaluate(async ({ webContents }) => {
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      if (guest.isLoading()) await new Promise(resolve => guest.once('did-stop-loading', resolve));
      await guest.loadURL('https://grok.com/fixture');
    });
    await page.waitForFunction(() => document.querySelector('.tab-title').textContent === 'Fixture Grok');
    assert.equal(await page.evaluate(() => typeof require), 'undefined');
    assert.equal(await page.evaluate(() => typeof window.desktop.invoke), 'function');
    const version = await page.evaluate(() => window.desktop.invoke('get-app-version'));
    assert.equal(version, '1.3.0');
    const prefs = await app.evaluate(({ BrowserWindow, webContents }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      return { aot: win.isAlwaysOnTop(), shell: win.webContents.getLastWebPreferences(),
        guest: guest.getLastWebPreferences() };
    });
    assert.equal(prefs.aot, false);
    for (const preferences of [prefs.shell, prefs.guest]) {
      assert.equal(preferences.nodeIntegration, false);
      assert.equal(preferences.contextIsolation, true);
      assert.equal(preferences.sandbox, true);
    }
    await page.locator('#aot-button').click();
    await page.waitForFunction(() => document.querySelector('#aot-button').classList.contains('active'));
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()), true);
    await page.locator('#aot-button').click();
    await page.waitForFunction(() => !document.querySelector('#aot-button').classList.contains('active'));

    const originalId = await page.locator('.tab.active').getAttribute('id');
    await app.evaluate(async ({ webContents }) => {
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      await guest.executeJavaScript("document.querySelector('#search-result').click()", true);
    });
    await page.waitForFunction(() => document.querySelectorAll('.tab').length === 2);
    assert.equal(await page.locator('.tab.active').getAttribute('id'), originalId);
    const ids = await page.locator('.tab').evaluateAll(tabs => tabs.map(tab => tab.id));
    assert.equal(new Set(ids).size, 2);

    await page.locator('#usage-btn').click();
    await page.waitForFunction(() => document.querySelector('#usage-low-effort').textContent === '50 / 100');
    const geometry = await page.evaluate(() => {
      const view = document.querySelector('.view.active webview').getBoundingClientRect();
      return { bottom: view.bottom, height: innerHeight };
    });
    assert.ok(geometry.bottom <= geometry.height, 'content fits above the status bar');

    await app.evaluate(({ webContents }) => {
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      guest.sendInputEvent({ type: 'keyDown', keyCode: 'T', modifiers: ['control'] });
      guest.sendInputEvent({ type: 'keyUp', keyCode: 'T', modifiers: ['control'] });
    });
    await page.waitForFunction(() => document.querySelectorAll('.tab').length === 3 && document.querySelector('.tab.active .tab-title').textContent === 'Fixture Grok');
    await page.locator('.tab.active .tab-close').click();
    await page.waitForFunction(() => document.querySelectorAll('.tab').length === 2);
    await page.locator('.tab').first().click();

    const guestSecurity = await app.evaluate(async ({ webContents }) => {
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      return guest.executeJavaScript('({require: typeof require, bridge: typeof window.desktop})');
    });
    assert.deepEqual(guestSecurity, { require: 'undefined', bridge: 'undefined' });
    assert.equal(await page.evaluate(() => window.desktop.invoke('open-external-url', 'file:///C:/Windows/System32/calc.exe')), false);
    assert.equal(await page.evaluate(() => window.desktop.invoke('open-external-url', 'https://127.0.0.1')), false);
    const media = await app.evaluate(async ({ dialog, webContents }) => {
      const original = dialog.showMessageBox;
      let prompts = 0;
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      const result = [];
      try {
        for (const response of [0, 1]) {
          dialog.showMessageBox = async () => { prompts++; return { response }; };
          result.push(await guest.executeJavaScript(`navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {stream.getTracks().forEach(track => track.stop()); return 'allowed';}).catch(() => 'blocked')`));
        }
      } finally { dialog.showMessageBox = original; }
      return { result, prompts };
    });
    assert.deepEqual(media, { result: ['blocked', 'allowed'], prompts: 2 });

    const inspect = await app.evaluate(async ({ Menu, webContents }) => {
      const original = Menu.buildFromTemplate;
      let template;
      Menu.buildFromTemplate = items => { template = items; return { popup() {} }; };
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      guest.emit('context-menu', {}, { x: 10, y: 10 });
      Menu.buildFromTemplate = original;
      const item = template.find(entry => entry.label === 'Inspect Element');
      const opened = new Promise(resolve => guest.once('devtools-opened', resolve));
      item.click();
      await opened;
      return !!item && guest.isDevToolsOpened();
    });
    assert.equal(inspect, true);
    await app.evaluate(({ webContents }) => {
      webContents.getAllWebContents().filter(wc => wc.getType() === 'webview').forEach(wc => wc.closeDevTools());
    });

    for (const provider of ['https://accounts.x.ai/sign-in', 'https://github.com/login/oauth/authorize?state=dummy']) {
      const authWindow = app.waitForEvent('window');
      await app.evaluate(async ({ webContents }, url) => {
        const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
        await guest.executeJavaScript(`document.querySelector('#auth').href = ${JSON.stringify(url)}; document.querySelector('#auth').click()`, true);
      }, provider);
      const popupPage = await authWindow;
      await popupPage.waitForURL(provider);
      const auth = await app.evaluate(({ BrowserWindow, session }, url) => {
        const popup = BrowserWindow.getAllWindows().find(win => win.webContents.getURL() === url);
        return { sameSession: popup.webContents.session === session.fromPartition('persist:grok'),
          node: popup.webContents.getLastWebPreferences().nodeIntegration,
          sandbox: popup.webContents.getLastWebPreferences().sandbox };
      }, provider);
      assert.equal(auth.sameSession, true);
      assert.equal(auth.node, false);
      assert.equal(auth.sandbox, true);
      await popupPage.close();
    }

    // Replay the redacted manual navigation sequence into the installed main
    // handlers. Keep all real-account traffic out of this offline test.
    const observedCookieHandoffs = require('./fixtures/google-cookie-handoffs.json');
    const navigation = await app.evaluate(({ shell, webContents }, chainFromTrace) => {
      global.observedCookieHandoffs = chainFromTrace;
      const original = shell.openExternal;
      const external = [];
      shell.openExternal = async url => { external.push(url); };
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      const emit = (kind, url, mainFrame = true, legacy = false) => {
        let prevented = false;
        const event = { preventDefault() { prevented = true; } };
        if (!legacy) Object.assign(event, { url, isMainFrame: mainFrame });
        guest.emit(kind, event, url, false, mainFrame);
        return prevented;
      };
      try {
        const chain = global.observedCookieHandoffs;
        const modern = chain.map(url => emit('will-redirect', url));
        const legacy = chain.map(url => emit('will-redirect', url, true, true));
        const frame = emit('will-redirect', 'https://example.org/frame-redirect', false);
        const unknown = emit('will-redirect', 'https://unknown.example.org/blocked?test=dummy');
        const noEscapedRedirect = external.length === 0;
        const direct = emit('will-navigate', 'https://example.org/article');
        return { modern, legacy, frame, unknown, noEscapedRedirect, direct, external };
      } finally { shell.openExternal = original; }
    }, observedCookieHandoffs);
    assert.deepEqual(navigation.modern, Array(observedCookieHandoffs.length).fill(false));
    assert.deepEqual(navigation.legacy, Array(observedCookieHandoffs.length).fill(false));
    assert.equal(navigation.frame, false);
    assert.equal(navigation.unknown, true);
    assert.equal(navigation.noEscapedRedirect, true);
    assert.equal(navigation.direct, true);
    assert.deepEqual(navigation.external, ['https://example.org/article']);
    const authRoutes = [...require('./fixtures/grok-cookie-signout.json'),
      ...require('./fixtures/github-auth-navigation.json')];
    const authNavigation = await app.evaluate(({ shell, webContents }, routes) => {
      const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
      const original = shell.openExternal;
      const external = [];
      shell.openExternal = async url => { external.push(url); };
      try {
        const cancellations = [];
        for (const url of routes) {
          for (const kind of ['will-navigate', 'will-redirect']) {
            for (const legacy of [false, true]) {
              let prevented = false;
              const event = { preventDefault() { prevented = true; } };
              if (!legacy) Object.assign(event, { url, isMainFrame: true });
              guest.emit(kind, event, url, false, true);
              cancellations.push(prevented);
            }
          }
        }
        return { cancellations, external };
      } finally { shell.openExternal = original; }
    }, authRoutes);
    assert.deepEqual(authNavigation.cancellations, Array(authRoutes.length * 4).fill(false));
    assert.deepEqual(authNavigation.external, []);

    const finalGuard = await app.evaluate(async ({ shell, webContents, Menu, ipcMain }) => {
      const originalShell = shell.openExternal;
      const originalMenu = Menu.buildFromTemplate;
      const external = [];
      shell.openExternal = async url => { external.push(url); };
      try {
        const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
        let template;
        Menu.buildFromTemplate = items => { template = items; return { popup() {} }; };
        for (const url of ['https://accounts.youtube.com/accounts/SetSID?test=dummy',
          'https://github.com/login/oauth/authorize?state=dummy']) {
          guest.emit('context-menu', {}, { x: 10, y: 10, linkURL: url });
          await template.find(item => item.label === 'Open Link in Browser').click();
        }
        return external;
      } finally { shell.openExternal = originalShell; Menu.buildFromTemplate = originalMenu; }
    });
    assert.deepEqual(finalGuard, []);
    assert.equal(await page.evaluate(() => window.desktop.invoke('open-external-url',
      'https://accounts.youtube.com/accounts/SetSID?test=dummy')), false);
    assert.equal(await page.evaluate(() => window.desktop.invoke('open-external-url',
      'https://github.com/login/oauth/authorize?state=dummy')), false);


    await page.locator('#info-btn').click();
    await page.waitForFunction(() => document.querySelectorAll('.tab').length === 3 && document.querySelector('.tab.active .tab-title').textContent === 'About');
    await app.evaluate(async ({ webContents }) => {
      const about = webContents.getAllWebContents().find(wc => wc.getURL().includes('/about.html'));
      const text = await about.executeJavaScript('document.body.textContent');
      if (!text.includes('1.3.0')) throw new Error('About page version missing');
    });
    fs.mkdirSync('build', { recursive: true });
    await page.screenshot({ path: path.resolve('build', 'smoke-1.3.0.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', executablePath, version,
      checks: ['sandbox/isolation', 'AOT off/on/off', 'background search tab', 'unique tabs', 'Ctrl+T and close',
        'authenticated stats', 'viewport fit', 'unsafe URL blocking', 'media consent denial/allow', 'Inspect Element',
        'OAuth popup session', 'Google cookie handoffs', 'GitHub login and verification navigation', 'same-tab sign-out cookie handoffs', 'subframe redirect stays embedded', 'unknown redirect never escapes', 'About version', 'no renderer errors'] }, null, 2));
  } finally {
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
