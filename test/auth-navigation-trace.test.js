const { test } = require('node:test');
const assert = require('node:assert/strict');
const { redactNavigationUrl } = require('../src/auth-navigation-trace');

test('authentication navigation logs omit query, fragment and credentials', () => {
  assert.equal(redactNavigationUrl('https://user:secret@accounts.google.com/signin/oauth/legacy/consent?code=secret&rapt=secret#secret'),
    'https://accounts.google.com/signin/oauth/legacy/consent');
  assert.equal(redactNavigationUrl('data:text/html,secret'), 'data:');
  assert.equal(redactNavigationUrl('javascript:secret'), 'javascript:');
  assert.equal(redactNavigationUrl('file:///C:/Users/private/file'), 'file:');
  assert.equal(redactNavigationUrl('not a URL'), 'invalid');
});
