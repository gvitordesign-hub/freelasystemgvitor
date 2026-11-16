const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// O app abre o sistema publicado na VPS: atualizou o site (git pull + docker compose up),
// o app já abre a versão nova — não precisa gerar instalador de novo.
const SITE_URL = 'https://sistema.gvitor.com.br';
const SITE_ORIGIN = new URL(SITE_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#020617',
    title: 'GVITOR SYSTEM',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(SITE_URL);

  // Sem internet / site fora do ar: tela local com "Tentar de novo"
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(SITE_ORIGIN)) {
      win.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  // Só o próprio sistema abre dentro do app; links externos (WhatsApp, Behance...) vão para o navegador
  const external = (url) => { if (/^https?:/i.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SITE_ORIGIN)) external(url);
    return { action: url.startsWith(SITE_ORIGIN) ? 'allow' : 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(SITE_ORIGIN) && !url.startsWith('file://')) { e.preventDefault(); external(url); }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [w] = BrowserWindow.getAllWindows();
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
