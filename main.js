// Shell Electron arm64 pour Dofus Retro via Ruffle web.
// Lancement : npm install && npm start
'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');
const { WebSocketServer } = require('ws');

const RETROCLIENT_DIR = process.env.RETROCLIENT_DIR || path.join(__dirname, 'retroclient');
const WS_PORT = 8765; // pont WebSocket -> TCP utilise par Ruffle (socketProxy)

// ---------------------------------------------------------------------------
// Pont WS <-> TCP : Ruffle web ne peut pas ouvrir de TCP brut. Il se connecte
// en WebSocket a ws://localhost:8765/<host>/<port> et on relaie vers le TCP.
// ---------------------------------------------------------------------------
function startSocketBridge() {
  const wss = new WebSocketServer({ port: WS_PORT });
  wss.on('connection', (ws, req) => {
    const m = /^\/([^/]+)\/(\d+)$/.exec(req.url || '');
    if (!m) { ws.close(); return; }
    const [, host, port] = m;
    console.log(`[bridge] WS -> TCP ${host}:${port}`);
    const tcp = net.createConnection({ host, port: Number(port) });
    tcp.on('connect', () => console.log(`[bridge] connected ${host}:${port}`));
    tcp.on('data', (buf) => ws.readyState === ws.OPEN && ws.send(buf));
    tcp.on('close', () => ws.close());
    tcp.on('error', (e) => { console.error('[bridge] tcp error', e.message); ws.close(); });
    ws.on('message', (data) => tcp.write(Buffer.from(data)));
    ws.on('close', () => tcp.destroy());
  });
  console.log(`[bridge] listening ws://localhost:${WS_PORT}`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      // Ruffle web + nos stubs tournent dans la page ; pas besoin de Node ici.
      nodeIntegration: false,
      contextIsolation: true,
      // Le loader charge des SWF/XML depuis le CDN Ankama : on desactive
      // les restrictions CORS pour ce test.
      webSecurity: false,
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'), {
    query: { client: RETROCLIENT_DIR },
  });
  win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  startSocketBridge();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
