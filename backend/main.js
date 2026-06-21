const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Nevark MSS",
    autoHideMenuBar: true,
  });

  win.loadURL("http://localhost:3000");
}

app.whenReady().then(createWindow);