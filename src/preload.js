const { contextBridge, ipcRenderer } = require('electron');

const validSendChannels = [
  'tab-created',
  'tab-closed',
  'navigate-to-url',
  'renderer-error',
  'renderer-promise-rejection'
];

const validReceiveChannels = [
  'new-tab',
  'close-tab',
  'url-updated',
  'system-theme-updated',
  'shortcut-new-tab',
  'shortcut-next-tab',
  'shortcut-prev-tab',
  'shortcut-reload-tab',
  'shortcut-show-info',
  'open-about-tab'
];

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  receive: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },

  on: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },

  getVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  showAppInfo: () => ipcRenderer.invoke('show-app-info'),
  fetchGrokRateLimits: () => ipcRenderer.invoke('fetch-grok-rate-limits'),
  forceLightColorScheme: (wcId, shouldForceLight) =>
    ipcRenderer.invoke('force-light-color-scheme', wcId, shouldForceLight),

  // ===== Pasta e arquivos =====
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readFolderStructure: (folderPath) => ipcRenderer.invoke('read-folder-structure', folderPath),
  writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),

  // Novas funções
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  searchFiles: (folderPath, query) => ipcRenderer.invoke('search-files', folderPath, query)
});