// This file is required by the index.html file and will
// be executed in the renderer process for that window.

// Handle errors in the renderer process
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  
  // You could send this to the main process for logging
  if (window.api) {
    window.api.send('renderer-error', {
      message: event.error.message,
      stack: event.error.stack
    });
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // You could send this to the main process for logging
  if (window.api) {
    window.api.send('renderer-promise-rejection', {
      message: event.reason.message,
      stack: event.reason.stack
    });
  }
});

// Listen for messages from the main process
if (window.api) {
  window.api.receive('new-tab', (url) => {
    // This would be handled by the tab creation logic in index.html
    console.log('Received request to open new tab with URL:', url);
  });
} 