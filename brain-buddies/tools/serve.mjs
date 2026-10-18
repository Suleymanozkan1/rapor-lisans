// Geliştirme için sıfır bağımlılıklı statik sunucu. Yalnızca 127.0.0.1'i dinler.
// Kullanım: npm start  (PORT ortam değişkeniyle bağlantı noktası değiştirilebilir)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(ROOT, `.${path}`);
    // Kök dışına çıkışı (../) engelle
    if (file !== ROOT && !file.startsWith(ROOT + sep)) throw Object.assign(new Error('yasak'), { code: 'EACCES' });
    if (!(await stat(file)).isFile()) throw Object.assign(new Error('yok'), { code: 'ENOENT' });
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch (err) {
    const code = err.code === 'EACCES' ? 403 : 404;
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(code === 403 ? 'Yasak' : 'Bulunamadı');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Zihin Molası: http://localhost:${PORT}/  (durdurmak için Ctrl+C)`);
});
