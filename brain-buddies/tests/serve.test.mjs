// Geliştirme sunucusu: yol sınırlama, sembolik bağ, Host izin listesi ve yöntem kontrolü.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('../tools/serve.mjs', import.meta.url));
const PORT = 20000 + Math.floor(Math.random() * 20000);
let dir;
let proc;

function get(path, { host = `127.0.0.1:${PORT}`, method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: PORT, path, method, headers: { Host: host } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'zm-serve-'));
  const root = join(dir, 'root');
  mkdirSync(root);
  writeFileSync(join(root, 'index.html'), 'merhaba');
  writeFileSync(join(dir, 'gizli.txt'), 'kök dışı');
  symlinkSync(join(dir, 'gizli.txt'), join(root, 'bag.txt'));
  // Sunucu "PATH" dışında boş bir ortamla başlatılır
  proc = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, PORT: String(PORT), SERVE_ROOT: root }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    proc.stdout.on('data', resolve);
    proc.on('exit', (code) => reject(new Error(`sunucu kapandı: ${code}`)));
  });
});

after(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

test('sunucu: kökteki dosyayı verir', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.equal(r.body, 'merhaba');
  assert.equal((await get('/', { host: `localhost:${PORT}` })).status, 200);
});

test('sunucu: ../ ve kodlanmış ../ kök dışına çıkamaz', async () => {
  for (const p of ['/../gizli.txt', '/%2e%2e/gizli.txt', '/..%2fgizli.txt']) {
    const r = await get(p);
    assert.notEqual(r.status, 200, p);
    assert.ok(!r.body.includes('kök dışı'), p);
  }
});

test('sunucu: kök dışını gösteren sembolik bağ reddedilir', async () => {
  const r = await get('/bag.txt');
  assert.equal(r.status, 403);
  assert.ok(!r.body.includes('kök dışı'));
});

test('sunucu: bilinmeyen Host (DNS rebinding) reddedilir', async () => {
  assert.equal((await get('/', { host: 'saldirgan.example:80' })).status, 421);
  assert.equal((await get('/', { host: `evil.example:${PORT}` })).status, 421);
});

test('sunucu: yalnızca GET ve HEAD kabul edilir', async () => {
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  assert.equal((await get('/', { method: 'DELETE' })).status, 405);
  const head = await get('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('sunucu: olmayan dosya ve klasör 404', async () => {
  assert.equal((await get('/yok.txt')).status, 404);
  assert.equal((await get('/%E0%A4%A')).status, 404);
});
