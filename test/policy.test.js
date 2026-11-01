const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isInternalUrl, isGrokUrl, isExternalUrl, shouldDisableGpu } = require('../src/url-policy');

test('trusted URLs use parsed HTTPS hosts, not substrings', () => {
  for (const url of ['https://grok.com', 'https://grok.com/c/123', 'https://accounts.x.ai/sign-in', 'https://x.com/i/flow/login']) {
    assert.equal(isInternalUrl(url), true, url);
  }
  for (const url of ['http://grok.com', 'https://grok.com.evil.org', 'https://evil.org/grok.com',
    'https://grok.com@evil.org', 'https://evil@grok.com', 'https://grok.com:444',
    'file:///grok.com', 'javascript:alert(1)', '', null]) {
    assert.equal(isInternalUrl(url), false, String(url));
    assert.equal(isGrokUrl(url), false, String(url));
  }
  assert.equal(isGrokUrl('https://accounts.x.ai'), false);
});

test('OS browser routing rejects schemes, credentials, local names and numeric hosts', () => {
  assert.equal(isExternalUrl('https://github.com/AnRkey/Grok-Desktop'), true);
  for (const url of ['file:///C:/Windows/system32/calc.exe', 'javascript:alert(1)',
    'https://localhost', 'https://foo.localhost.', 'https://192.168.1.1',
    'https://127.1', 'https://0x7f000001', 'https://[::1]', 'https://[::ffff:192.168.1.1]',
    'https://printer.local', 'https://user:pass@example.com']) {
    assert.equal(isExternalUrl(url), false, url);
  }
});

test('GPU detection preserves Windows/macOS acceleration and explicit fallback', () => {
  for (const platform of ['win32', 'darwin']) {
    assert.equal(shouldDisableGpu(platform, {}, () => false), false);
    assert.equal(shouldDisableGpu(platform, { GROK_DISABLE_GPU: 'true' }, () => false), true);
  }
  assert.equal(shouldDisableGpu('linux', {}, () => false), true);
  assert.equal(shouldDisableGpu('linux', { DISPLAY: ':0' }, () => false), false);
  assert.equal(shouldDisableGpu('linux', { DISPLAY: ':0', container: 'docker' }, () => false), true);
  assert.equal(shouldDisableGpu('linux', { DISPLAY: ':0', container: 'docker' }, p => p === '/dev/dri/renderD128'), false);
});
