const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isInternalUrl, isGrokUrl, isExternalUrl, shouldDisableGpu } = require('../src/url-policy');
const observedCookieHandoffs = require('./fixtures/google-cookie-handoffs.json');
const cookieSignout = require('./fixtures/grok-cookie-signout.json');
const githubAuth = require('./fixtures/github-auth-navigation.json');

test('the final Grokipedia logout handoff may finish but other paths stay blocked', () => {
  assert.equal(isInternalUrl('https://auth.grokipedia.com/delete-cookie?test=dummy'), true);
  for (const url of ['https://auth.grokipedia.com/delete-cookie',
    'https://auth.grokipedia.com/unrecognized?test=dummy']) assert.equal(isExternalUrl(url), false, url);
  for (const url of ['https://auth.grokipedia.com/set-cookie',
    'https://auth.grokipedia.com/delete-cookie/extra', 'https://auth.grokipedia.com/other',
    'https://auth.grokipedia.com.evil.org/delete-cookie', 'http://auth.grokipedia.com/delete-cookie',
    'https://auth.grokipedia.com:444/delete-cookie']) assert.equal(isInternalUrl(url), false, url);
});

test('GitHub authentication stays in app while repository links open externally', () => {
  for (const url of githubAuth) {
    assert.equal(isInternalUrl(url), true, url);
    if (new URL(url).hostname === 'github.com') assert.equal(isExternalUrl(url), false, url);
  }
  for (const url of ['https://github.com/AnRkey/Grok-Desktop', 'https://github.com/login-help',
    'https://github.com/sessions-other', 'https://github.com/session/extra']) {
    assert.equal(isInternalUrl(url), false, url);
    assert.equal(isExternalUrl(url), true, url);
  }
  for (const url of ['http://github.com/login', 'https://github.com:444/login',
    'https://github.com.evil.org/login', 'https://evil@github.com/login',
    'https://github.com/AnRkey/login/oauth/authorize']) {
    assert.equal(isInternalUrl(url), false, url);
  }
});

test('sign-out may finish through the trusted cookie services in the same tab', () => {
  for (const url of cookieSignout) {
    assert.equal(isInternalUrl(url), true, url);
    assert.equal(isExternalUrl(url), false, url);
  }
  for (const url of ['https://auth.grok.com/delete-cookie/extra',
    'https://auth.grok.com.evil.org/delete-cookie', 'https://auth.x.ai/other',
    'http://auth.grok.com/delete-cookie', 'https://auth.grok.com:444/delete-cookie']) {
    assert.equal(isInternalUrl(url), false, url);
  }
});

test('the complete cookie handoff sequence from the VM trace stays in its original tab', () => {
  for (const url of observedCookieHandoffs) assert.equal(isInternalUrl(url), true, url);
  for (const url of ['https://auth.x.ai/set-cookie/extra', 'https://auth.x.ai/other',
    'https://auth.x.ai.evil.org/set-cookie', 'http://auth.x.ai/set-cookie']) {
    assert.equal(isInternalUrl(url), false, url);
  }
  assert.equal(isExternalUrl('https://auth.x.ai/set-cookie?test=dummy'), false);
});

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

test('Google and Grok cookie handoffs stay internal with an exact host/path allowlist', () => {
  for (const url of [
    'https://accounts.youtube.com/accounts/SetSID?test=dummy',
    'https://accounts.youtube.com/accounts/CheckConnection',
    'https://accounts.google.co.za/accounts/SetSID?test=dummy',
    'https://accounts.google.co.uk/accounts/CheckConnection',
    'https://auth.grok.com/set-cookie?test=dummy',
    'https://auth.grokusercontent.com/set-cookie?test=dummy',
    'https://accounts.google.com/signin/oauth/legacy/consent?test=dummy'
  ]) assert.equal(isInternalUrl(url), true, url);
  for (const url of [
    'https://accounts.youtube.com/watch', 'https://auth.grok.com/untrusted',
    'https://auth.grok.com/set-cookie/extra', 'https://auth.grok.com.evil.org/set-cookie',
    'https://accounts.youtube.com.evil.org/accounts/SetSID',
    'https://auth.grokusercontent.com/other', 'https://auth.grokusercontent.com.evil.org/set-cookie',
    'https://accounts.google.co.za/other', 'https://accounts.google.fake/accounts/SetSID',
    'https://accounts.google.co.za.evil.org/accounts/SetSID',
    'http://auth.grok.com/set-cookie', 'https://auth.grok.com:444/set-cookie'
  ]) assert.equal(isInternalUrl(url), false, url);
});

test('authentication hosts cannot escape through any OS-browser request', () => {
  for (const url of [
    'https://accounts.youtube.com/accounts/SetSID?ssdc=1&sidt=dummy&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%3Ftest%3Ddummy',
    'https://accounts.youtube.com/unrecognized-path?test=dummy',
    'https://accounts.google.com/signin/oauth/legacy/consent?test=dummy',
    'https://accounts.google.co.za/accounts/SetSID?test=dummy',
    'https://auth.grok.com/set-cookie?test=dummy',
    'https://auth.grokusercontent.com/set-cookie?test=dummy',
    'https://accounts.x.ai/sign-in', 'https://appleid.apple.com/auth/authorize'
  ]) assert.equal(isExternalUrl(url), false, url);
  assert.equal(isExternalUrl('https://example.org/article'), true);
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
