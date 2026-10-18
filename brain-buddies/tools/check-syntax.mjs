// Tüm kaynak, test ve araç dosyalarının sözdizimini `node --check` ile denetler.

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(name)) files.push(p);
  }
};
['src', 'tests', 'tools'].forEach((d) => walk(join(ROOT, d)));
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (err) {
    failed += 1;
    console.error(`✕ ${f}\n${err.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} dosya sözdizimi denetiminden geçti`);
process.exit(failed ? 1 : 0);
