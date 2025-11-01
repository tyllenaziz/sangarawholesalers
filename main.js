const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'trolley.ico'), // your icon path
    webPreferences: {
      nodeIntegration: false,
    },
  });

  // Load your hosted frontend (change this if needed)
  win.loadURL('https://sangara-wholesalers-frontend.onrender.com');

  // Uncomment below if you want developer tools
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
