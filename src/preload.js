const { contextBridge, ipcRenderer } = require('electron');
const invokeChannels = new Set([
  'toggle-always-on-top', 'get-always-on-top', 'get-app-version',
  'show-app-info', 'fetch-grok-rate-limits', 'force-light-color-scheme', 'open-external-url'
]);
const receiveChannels = new Set([
  'system-theme-updated', 'open-about-tab', 'open-internal-tab',
  'shortcut-new-tab', 'shortcut-next-tab', 'shortcut-prev-tab',
  'shortcut-reload-tab', 'shortcut-show-info'
]);
contextBridge.exposeInMainWorld('desktop', {
  invoke(channel, ...args) {
    if (!invokeChannels.has(channel)) return Promise.reject(new Error('Unsupported request'));
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel, callback) {
    if (!receiveChannels.has(channel)) return;
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
