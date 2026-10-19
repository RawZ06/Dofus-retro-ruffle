// Serveur HTTP statique pour le dossier du client (lecture seule).
//
// Remplace `python3 -m http.server`, dont la file d'attente de connexions est
// limitée à 5 et qui répond en HTTP/1.0 (une connexion par fichier). En jeu,
// un inventaire ou un changement de carte déclenche des dizaines de chargements
// simultanés : les connexions en trop sont refusées et Ruffle affiche des cases
// vides, différentes à chaque fois. Node garde les connexions ouvertes
// (keep-alive) et accepte une file de 511 connexions.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.swf': 'application/x-shockwave-flash',
  '.xml': 'text/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
};

function startStaticServer(rootDir, port, onReady) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400).end();
      return;
    }
    const file = path.join(root, rel);
    // Ne jamais servir en dehors du dossier du client.
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        console.warn(`[http] 404 ${rel}`);
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(file).pipe(res);
    });
  });
  server.listen(port, '127.0.0.1', 511, () => {
    console.log(`[http] ${root} -> http://localhost:${port}/`);
    if (onReady) onReady(server);
  });
  return server;
}

module.exports = { startStaticServer };
