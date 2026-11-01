'use strict';

const INTERNAL_HOSTS = new Set([
  'grok.com', 'x.ai', 'accounts.x.ai', 'x.com', 'www.x.com',
  'twitter.com', 'api.x.com', 'api.twitter.com',
  'accounts.google.com', 'appleid.apple.com'
]);

function parseWebUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') ? url : null;
  } catch (_) { return null; }
}

function isInternalUrl(value) {
  const url = parseWebUrl(value);
  return !!url && INTERNAL_HOSTS.has(url.hostname);
}

function isGrokUrl(value) {
  const url = parseWebUrl(value);
  return !!url && url.hostname === 'grok.com';
}

function isExternalUrl(value) {
  const url = parseWebUrl(value);
  if (!url) return false;
  const host = url.hostname.replace(/\.$/, '');
  // Do not hand local-network, numeric, or IPv6 addresses to the OS browser.
  return host.includes('.') && !/^[\d.]+$/.test(host) && !host.includes(':') &&
    !['localhost', 'local', 'internal', 'lan', 'home', 'test', 'invalid'].some(
      suffix => host === suffix || host.endsWith(`.${suffix}`));
}

function shouldDisableGpu(platform, env, exists) {
  if (env.GROK_DISABLE_GPU === 'true') return true;
  if (platform !== 'linux') return false;
  const headless = !env.DISPLAY && !env.WAYLAND_DISPLAY;
  const container = exists('/.dockerenv') || env.container === 'docker';
  const gpu = exists('/dev/dri/card0') || exists('/dev/dri/renderD128') ||
    exists('/dev/nvidia0') || (!!env.NVIDIA_VISIBLE_DEVICES &&
      !['none', 'void'].includes(env.NVIDIA_VISIBLE_DEVICES));
  return headless || (container && !gpu);
}

module.exports = { isInternalUrl, isGrokUrl, isExternalUrl, shouldDisableGpu };
