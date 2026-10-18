// Erişilebilirlik: tema token'larının WCAG 2.1 AA kontrast oranları (açık ve koyu tema).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { COLORS } from '../src/core/shapes.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function tokens(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {'))));
const darkStart = css.indexOf(":root[data-theme='dark']");
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf('}', darkStart))) };
const mediaStart = css.indexOf(":root:not([data-theme='light'])");
const darkMedia = { ...light, ...tokens(css.slice(mediaStart, css.indexOf('}', mediaStart))) };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// [ön plan, arka plan, en düşük oran]
const PAIRS = [
  ['ink', 'paper', 4.5],
  ['ink', 'surface', 4.5],
  ['muted', 'paper', 4.5],
  ['muted', 'surface', 4.5],
  ['primary-ink', 'primary', 4.5],
  ['highlight-ink', 'highlight', 4.5],
  ['good', 'good-bg', 4.5],
  ['bad', 'bad-bg', 4.5],
  ['ink', 'cell', 4.5],
  ['primary', 'surface', 3], // odak halkası, çubuklar (metin dışı öğe: 3:1)
  ['line', 'surface', 1.2],
];

for (const [name, theme] of [['açık', light], ['koyu', dark]]) {
  test(`kontrast (${name} tema): metin AA 4.5:1, metin dışı öğeler 3:1`, () => {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(theme[fg] && theme[bg], `${fg}/${bg} token tanımlı`);
      const ratio = contrast(theme[fg], theme[bg]);
      assert.ok(ratio >= min, `${fg} (${theme[fg]}) / ${bg} (${theme[bg]}) = ${ratio.toFixed(2)} < ${min}`);
    }
  });
}

test('koyu tema: medya sorgusu ve data-theme bloğu aynı değerleri tanımlar', () => {
  assert.deepEqual(darkMedia, dark);
});

test('şekil renkleri iki temada da yüzeyden ayırt edilir (3:1) ve her rengin ayrı deseni var', () => {
  for (const c of COLORS) {
    assert.ok(contrast(c.hex, light.surface) >= 3, `${c.name} açık yüzeyde ${contrast(c.hex, light.surface).toFixed(2)}`);
    assert.ok(contrast(c.hex, dark.surface) >= 3, `${c.name} koyu yüzeyde ${contrast(c.hex, dark.surface).toFixed(2)}`);
  }
  assert.equal(new Set(COLORS.map((c) => c.pattern)).size, COLORS.length);
});
