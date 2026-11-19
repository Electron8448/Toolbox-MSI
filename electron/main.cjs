const { app, BrowserWindow, dialog, Menu, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const {createUpdater} = require('./updater.cjs');
const {contentSecurityPolicy, internalURL, externalURL} = require('./security.cjs');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');

const applicationId = 'io.github.electron8448.toolbox';
const home = 'toolbox://app/';
let server;
let mainWindow;
let quitting = false;

protocol.registerSchemesAsPrivileged([{
  scheme: 'toolbox',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);
app.setName('Toolbox');
if (app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', path.resolve(app.commandLine.getSwitchValue('user-data-dir')));
}
app.setAppUserModelId(applicationId);
const updates = createUpdater({app, dialog});

function openExternal(value) {
  if (externalURL(value)) shell.openExternal(value).catch(error => console.error(error.message));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 360, minHeight: 500,
    title: 'Toolbox', backgroundColor: '#f6f4eb',
    icon: path.join(__dirname, 'toolbox.ico'),
    show: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, partition: 'persist:toolbox'
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    openExternal(url);
    return {action:'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!internalURL(url)) { event.preventDefault(); openExternal(url); }
  });
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!internalURL(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.once('closed', () => { mainWindow = undefined; });
  await mainWindow.loadURL(home);
}

async function start() {
  const { createToolboxServer } = await import(pathToFileURL(path.join(__dirname, '../src/server.js')).href);
  server = createToolboxServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  const desktopSession = session.fromPartition('persist:toolbox');
  const clipboard = (contents, permission, details) =>
    ['clipboard-read', 'clipboard-sanitized-write'].includes(permission) &&
    internalURL(details?.requestingUrl || details?.securityOrigin || contents?.getURL() || '');
  desktopSession.setPermissionCheckHandler((contents, permission, origin, details) =>
    clipboard(contents, permission, {...details, requestingUrl: origin}));
  desktopSession.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(clipboard(contents, permission, details)));
  desktopSession.protocol.handle('toolbox', async request => {
    if (!internalURL(request.url)) return new Response('Not found', {status:404});
    const url = new URL(request.url);
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.from(await request.arrayBuffer());
    const response = await net.fetch(origin + url.pathname + url.search, {
      method: request.method, body,
      headers: {'Content-Type': request.headers.get('content-type') || 'application/octet-stream'}
    });
    const headers = new Headers(response.headers);
    if (headers.get('content-type')?.startsWith('text/html')) {
      headers.set('Content-Security-Policy', contentSecurityPolicy);
    }
    return new Response(response.body, {status:response.status, headers});
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'File', submenu:[{label:'Home', accelerator:'Alt+Home', click:()=>mainWindow?.loadURL(home)}, {role:'quit'}]},
    {label:'Edit', submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'View', submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
    {label:'Help', submenu:[
      {label:'Check for updates…', click:()=>void updates.check(true)},
      {label:'Version history', click:()=>openExternal('https://github.com/Electron8448/Toolbox-MSI/blob/main/versions/README.md')},
      {label:'About Toolbox', click:()=>dialog.showMessageBox({type:'info',title:'Toolbox',message:'Toolbox ' + app.getVersion(),buttons:['OK']})}
    ]}
  ]));
  await createWindow();
  void updates.start();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  app.whenReady().then(start).catch(error => {
    console.error(error);
    dialog.showErrorBox('Toolbox could not start', error.message);
    app.quit();
  });
  app.on('activate', () => {
    if (!mainWindow && server?.listening) createWindow().catch(error => console.error(error));
  });
  app.on('window-all-closed', () => app.quit());
  app.once('will-quit', () => updates.stop());
  app.on('before-quit', event => {
    if (!server?.listening || quitting) return;
    event.preventDefault();
    quitting = true;
    server.close(() => app.quit());
    server.closeAllConnections();
  });
}
