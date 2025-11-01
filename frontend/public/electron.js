const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  const isDevelopment = !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
      // ✅ REMOVED preload - we're not using it
    },
  });

  let loadPath;
  
  if (isDevelopment) {
    loadPath = 'http://localhost:3000';
    console.log('🔵 Development Mode');
  } else {
    // ✅ CORRECT: Use __dirname and add hash for routing
    loadPath = url.format({
      pathname: path.join(__dirname, '../build/index.html'),
      protocol: 'file:',
      slashes: true,
      hash: '/'  // Add hash to support client-side routing
    });
    console.log('🟢 Production Mode');
  }

  console.log('📂 Load Path:', loadPath);
  console.log('📂 __dirname:', __dirname);
  console.log('📂 app.getAppPath():', app.getAppPath());
  
  // Log when loading starts and completes
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 Started loading...');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Finished loading successfully');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  // Open DevTools for debugging (remove in final production)
  if (!isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadURL(loadPath)
    .catch(err => {
      console.error('❌ loadURL error:', err);
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 App is ready');
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});