const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// O app roda em app://gvitor/ (origem própria e estável → o login do Supabase persiste
// e o roteamento por caminho — /dashboard, /financeiro — funciona sem #hash).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const root = path.join(__dirname, 'app');

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    let file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) return new Response('Forbidden', { status: 403 });
    // Rotas do React (sem extensão ou arquivo inexistente) → index.html
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    return net.fetch(pathToFileURL(file).toString());
  });
}

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
  win.loadURL('app://gvitor/');

  // Links externos (WhatsApp, Behance etc.) abrem no navegador, não dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
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
    registerAppProtocol();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
