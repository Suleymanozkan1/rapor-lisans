// Sıfır bağımlılıklı paketleyici: index.html + styles.css + src/**/*.js → dist/zihin-molasi.html
// Çıktı tek dosyadır; çift tıklayıp (file://) çevrimdışı oynanabilir.
//
// Desteklenen modül biçimi (bu projenin kuralı; dışına çıkılırsa build hata verir):
//   import { a, b as c } from './x.js';      (tek satır, göreli yol)
//   import * as ns from './x.js';
//   export function f / export const x / export let x / export class C
// Varsayılan dışa aktarım (export default) ve yeniden dışa aktarım (export ... from) desteklenmez.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = resolve(ROOT, 'src/main.js');
const OUT = resolve(ROOT, 'dist/zihin-molasi.html');

const IMPORT_RE = /^import\s+(?:\{([^}]*)\}|\*\s+as\s+(\w+))\s+from\s+'(\.[^']+)';\s*$/;
const EXPORT_RE = /^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/;

function parseModule(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const deps = [];
  const exports = [];
  const body = [];
  lines.forEach((line, i) => {
    if (/^import\b/.test(line)) {
      const m = line.match(IMPORT_RE);
      if (!m) throw new Error(`${relative(ROOT, file)}:${i + 1}: desteklenmeyen import biçimi`);
      const dep = resolve(dirname(file), m[3]);
      deps.push(dep);
      if (m[2]) body.push(`const ${m[2]} = ${modVar(dep)};`);
      else {
        const names = m[1].split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/\s+as\s+/, ': '));
        body.push(`const { ${names.join(', ')} } = ${modVar(dep)};`);
      }
      return;
    }
    if (/^export\b/.test(line)) {
      const m = line.match(EXPORT_RE);
      if (!m) throw new Error(`${relative(ROOT, file)}:${i + 1}: desteklenmeyen export biçimi`);
      exports.push(m[2]);
      body.push(line.replace(/^export\s+/, ''));
      return;
    }
    if (/^\s+(import|export)\s/.test(line) && !/^\s*\/\//.test(line)) {
      throw new Error(`${relative(ROOT, file)}:${i + 1}: girintili import/export desteklenmez`);
    }
    body.push(line);
  });
  return { file, deps, exports, body: body.join('\n') };
}

const ids = new Map();
function modVar(file) {
  if (!ids.has(file)) ids.set(file, `__m${ids.size}`);
  return ids.get(file);
}

// Bağımlılık sırasına göre (önce bağımlılıklar) modülleri topla
function collect(entry) {
  const order = [];
  const state = new Map();
  const visit = (file, chain) => {
    if (state.get(file) === 'done') return;
    if (state.get(file) === 'visiting') throw new Error(`Döngüsel import: ${[...chain, file].map((f) => relative(ROOT, f)).join(' → ')}`);
    state.set(file, 'visiting');
    const mod = parseModule(file);
    mod.deps.forEach((d) => visit(d, [...chain, file]));
    state.set(file, 'done');
    order.push(mod);
  };
  visit(entry, []);
  return order;
}

export function bundle() {
  const modules = collect(ENTRY);
  const js = modules
    .map(
      (m) =>
        `// ---- ${relative(ROOT, m.file)} ----\nconst ${modVar(m.file)} = (() => {\n${m.body}\nreturn { ${m.exports.join(', ')} };\n})();`,
    )
    .join('\n\n');
  return { js: `(() => {\n'use strict';\n${js}\n})();\n`, modules };
}

export function build() {
  const { js, modules } = bundle();
  const css = readFileSync(resolve(ROOT, 'styles.css'), 'utf8');
  let html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  if (/<\/script/i.test(js)) throw new Error('Kod içinde </script geçiyor; satır içi gömülemez');
  if (/<\/style/i.test(css)) throw new Error('CSS içinde </style geçiyor');
  html = html.replace(/<!-- @inline-css -->[\s\S]*?<!-- @end-inline-css -->/, () => `<style>\n${css}</style>`);
  html = html.replace(/<!-- @inline-js -->[\s\S]*?<!-- @end-inline-js -->/, () => `<script>\n${js}</script>`);
  if (html.includes('@inline-')) throw new Error('index.html içindeki yer tutucular bulunamadı');
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  return { out: OUT, bytes: Buffer.byteLength(html), modules: modules.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = build();
  console.log(`✓ ${relative(ROOT, r.out)} (${(r.bytes / 1024).toFixed(1)} KB, ${r.modules} modül)`);
}
