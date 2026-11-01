const fs = require('node:fs');

function redactNavigationUrl(value) {
  try {
    const url = new URL(value);
    // Never record queries, fragments, credentials, or embedded data/scripts.
    return ['https:', 'http:'].includes(url.protocol)
      ? `${url.origin}${url.pathname}` : url.protocol;
  } catch (_) { return 'invalid'; }
}

function startAuthNavigationTrace(app, filename, buildLabel = 'development') {
  const record = ({ url, ...entry }) => {
    try {
      fs.appendFileSync(filename, JSON.stringify({
        time: new Date().toISOString(), ...entry,
        ...(url === undefined ? {} : { url: redactNavigationUrl(url) })
      }) + '\n', { mode: 0o600 });
    } catch (_) { console.warn('Could not write authentication navigation trace'); }
  };
  record({ kind: 'session-start', packaged: app.isPackaged, build: buildLabel });
  app.on('web-contents-created', (_event, contents) => {
    for (const kind of ['will-navigate', 'will-redirect', 'did-start-navigation']) {
      contents.on(kind, (event, legacyUrl, _sameDocument, legacyMainFrame) => record({
        kind, contents: contents.id, url: event.url || legacyUrl,
        mainFrame: event.isMainFrame ?? legacyMainFrame
      }));
    }
    contents.on('did-finish-load', () => record({ kind: 'loaded', contents: contents.id, url: contents.getURL() }));
    contents.on('did-fail-load', (_event, code, _description, url, mainFrame) =>
      record({ kind: 'load-failed', contents: contents.id, code, url, mainFrame }));
  });
  return record;
}

module.exports = { redactNavigationUrl, startAuthNavigationTrace };
