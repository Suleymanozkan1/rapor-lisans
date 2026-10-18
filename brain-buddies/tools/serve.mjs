// Geliştirme için sıfır bağımlılıklı statik sunucu. Yalnızca 127.0.0.1'i dinler.
// Kullanım: npm start  (PORT ortam değişkeniyle bağlantı noktası değiştirilebilir)

import { createServer } from 'node:http';
import { open, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// SERVE_ROOT yalnızca testler içindir; varsayılan proje klasörüdür.
const ROOT = await realpath(process.env.SERVE_ROOT || resolve(fileURLToPath(new URL('..', import.meta.url))));
const PORT = Number(process.env.PORT) || 8080;
// DNS rebinding'e karşı yalnızca yerel adlarla gelen istekler kabul edilir.
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const fail = (code, message) => Object.assign(new Error(message), { status: code });

const server = createServer(async (req, res) => {
  let handle = null;
  try {
    if (!ALLOWED_HOSTS.has(String(req.headers.host).toLowerCase())) throw fail(421, 'Bilinmeyen Host');
    if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'Yalnızca GET ve HEAD');
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(ROOT, `.${path}`);
    // Kök dışına çıkışı (../ ve kök dışını gösteren sembolik bağlar) engelle
    const inside = (p) => p === ROOT || p.startsWith(ROOT + sep);
    if (!inside(file)) throw fail(403, 'Yasak');
    const real = await realpath(file);
    if (!inside(real)) throw fail(403, 'Yasak');
    // Dosya bir kez açılır; tür denetimi ve okuma aynı tanıtıcıdan yapılır
    handle = await open(real, 'r');
    if (!(await handle.stat()).isFile()) throw fail(404, 'Bulunamadı');
    const body = await handle.readFile();
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    const code = err.status || 404;
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (code === 405) headers.Allow = 'GET, HEAD';
    res.writeHead(code, headers);
    res.end(err.status ? err.message : 'Bulunamadı');
  } finally {
    await handle?.close();
  }
});

server.on('error', (err) => {
  console.error(`Sunucu başlatılamadı: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Zihin Molası: http://localhost:${PORT}/  (durdurmak için Ctrl+C)`);
});
