const { ipcRenderer } = require('electron');

// Since we're using nodeIntegration: true and contextIsolation: false,
// we don't need to use contextBridge. Instead, we can expose our API
// directly to the window object.

window.api = {
  // Send a message to the main process
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['tab-created', 'tab-closed', 'navigate-to-url', 'renderer-error', 'renderer-promise-rejection'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Receive a message from the main process
  receive: (channel, func) => {
    const validChannels = ['new-tab', 'close-tab', 'url-updated'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Get the version of the application
  getVersion: () => {
    return process.env.npm_package_version;
  }
}; 