const { app, BrowserWindow, globalShortcut } = require("electron");

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 360,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadURL("http://localhost:3000");

  // Verhindert kurzes "Aufblitzen" beim Start
  win.once("ready-to-show", () => {
    win.hide();
  });
}

app.whenReady().then(() => {
  createWindow();

  const ok = globalShortcut.register("Control+Shift+Space", () => {
    if (!win) return;

    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.restore?.();
      win.focus();
    }
  });

  console.log("Hotkey register ok:", ok);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
