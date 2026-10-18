// Laboratuvar sahnesi ve kategori önizleme çizimleri (özgün SVG). Ana ekran düzeni Brain Buddies'in
// menü yerleşimini izler (başlık, 2×2 kategori kartı, büyük başlat düğmesi, sağda sunucu, arkada
// gün batımı görünen pencereler); çizimlerin kendisi bu projeye aittir.

import { s } from './svg.js';

const txt = (x, y, content, attrs = {}) => s('text', { x, y, ...attrs }, document.createTextNode(content));

// Arka plan: duvar, gün batımı pencereleri, şehir silueti, zemin, sağ üstte yeşil sıvılı tüp.
export function labBackground() {
  const group = s('g', {});
  [40, 190, 340, 490].forEach((x, i) => {
    group.append(
      s('rect', { x, y: 30, width: 120, height: 220, rx: 6, class: 'lab-sky' }),
      s('ellipse', { cx: x + 40 + (i % 2) * 30, cy: 80 + (i % 3) * 18, rx: 34, ry: 11, class: 'lab-cloud' }),
      s('ellipse', { cx: x + 70 - (i % 2) * 20, cy: 120 + (i % 2) * 14, rx: 24, ry: 8, class: 'lab-cloud' }),
    );
    for (let k = 0; k < 5; k++) {
      const hgt = 60 + ((k * 37 + i * 13) % 50);
      group.append(s('rect', { x: x + 6 + k * 23, y: 250 - hgt, width: 18, height: hgt, class: 'lab-city' }));
    }
    group.append(s('rect', { x, y: 30, width: 120, height: 220, rx: 6, class: 'lab-frame' }), s('path', { d: `M${x + 60} 30 V250`, class: 'lab-frame-bar' }));
  });
  return s(
    'svg',
    { viewBox: '0 0 640 400', preserveAspectRatio: 'xMidYMid slice', class: 'lab-bg', 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { x: 0, y: 0, width: 640, height: 400, class: 'lab-wall' }),
    group,
    s('rect', { x: 0, y: 270, width: 640, height: 130, class: 'lab-floor' }),
    s('ellipse', { cx: 300, cy: 345, rx: 230, ry: 34, class: 'lab-rug' }),
    s('path', { d: 'M110 345 L150 330 L190 345 L230 330 L270 345 L310 330 L350 345 L390 330 L430 345 L470 330 L490 345', class: 'lab-rug-line' }),
    // sağ üst: tavandan inen boru ve yeşil sıvılı tüp
    s('rect', { x: 586, y: 0, width: 10, height: 40, class: 'lab-pipe' }),
    s('rect', { x: 566, y: 40, width: 50, height: 90, rx: 18, class: 'lab-glass' }),
    s('rect', { x: 570, y: 80, width: 42, height: 46, rx: 14, class: 'lab-liquid' }),
    s('circle', { cx: 584, cy: 98, r: 4, class: 'lab-bubble' }),
    s('circle', { cx: 598, cy: 110, r: 3, class: 'lab-bubble' }),
    // sol: lamba
    s('rect', { x: 14, y: 250, width: 40, height: 8, rx: 3, class: 'lab-pipe' }),
    s('circle', { cx: 34, cy: 236, r: 14, class: 'lab-lamp' }),
  );
}

// ---- Kategori önizlemeleri (160 × 100) ----
const frame = (cls, ...children) =>
  s('svg', { viewBox: '0 0 160 100', class: `pv ${cls}`, 'aria-hidden': 'true', focusable: 'false' }, ...children);

export function previewMemory() {
  const lines = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    lines.push(s('path', { d: `M${40 + t * 80} 22 L${12 + t * 136} 92`, class: 'pv-grid' }));
    const y = 22 + t * 70;
    const half = 40 + t * 28;
    lines.push(s('path', { d: `M${80 - half} ${y} L${80 + half} ${y}`, class: 'pv-grid' }));
  }
  return frame(
    'pv-memory',
    s('rect', { width: 160, height: 100, class: 'pv-bg' }),
    s('polygon', { points: '40,22 120,22 148,92 12,92', class: 'pv-plate' }),
    lines,
    txt(58, 44, '🐸', { class: 'pv-emoji' }),
    txt(92, 60, '🏆', { class: 'pv-emoji' }),
    txt(40, 80, '💎', { class: 'pv-emoji' }),
    txt(112, 84, '🪐', { class: 'pv-emoji' }),
  );
}

export function previewLogic() {
  const bars = [26, 48, 70].map((y, i) =>
    s(
      'g',
      {},
      s('rect', { x: 14, y, width: 96, height: 14, rx: 4, class: 'pv-bar' }),
      [0, 1, 2, 3, 4, 5].map((k) => s('rect', { x: 24 + k * 14, y: y - 4 + ((k + i) % 2) * 8, width: 8, height: 6, class: 'pv-notch' })),
      s('circle', { cx: 14, cy: y + 7, r: 6, class: 'pv-knob' }),
    ),
  );
  const teeth = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return s('rect', { x: 132 + Math.cos(a) * 18 - 3, y: 56 + Math.sin(a) * 18 - 3, width: 6, height: 6, class: 'pv-gear' });
  });
  return frame(
    'pv-logic',
    s('rect', { width: 160, height: 100, class: 'pv-bg' }),
    s('rect', { x: 118, y: 10, width: 30, height: 20, rx: 3, class: 'pv-meter' }),
    bars,
    teeth,
    s('circle', { cx: 132, cy: 56, r: 16, class: 'pv-gear' }),
    s('circle', { cx: 132, cy: 56, r: 6, class: 'pv-hub' }),
  );
}

export function previewCalc() {
  const keys = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) keys.push(s('rect', { x: 118 + c * 12, y: 36 + r * 12, width: 10, height: 10, rx: 2, class: 'pv-key' }));
  return frame(
    'pv-calc',
    s('rect', { width: 160, height: 100, class: 'pv-bg' }),
    s('ellipse', { cx: 60, cy: 100, rx: 70, ry: 22, class: 'pv-gold' }),
    s('circle', { cx: 34, cy: 30, r: 15, class: 'pv-ball' }),
    txt(34, 34, '2+4', { class: 'pv-ball-text' }),
    s('circle', { cx: 78, cy: 50, r: 15, class: 'pv-ball' }),
    txt(78, 54, '5+8', { class: 'pv-ball-text' }),
    s('rect', { x: 112, y: 14, width: 42, height: 74, rx: 6, class: 'pv-calcbody' }),
    s('rect', { x: 117, y: 19, width: 32, height: 12, rx: 2, class: 'pv-screen' }),
    keys,
  );
}

export function previewVisual() {
  const alien = (x, color, held) =>
    s(
      'g',
      {},
      s('ellipse', { cx: x, cy: 70, rx: 13, ry: 16, fill: color, class: 'pv-alien' }),
      s('circle', { cx: x - 5, cy: 64, r: 4, class: 'pv-eye' }),
      s('circle', { cx: x + 5, cy: 64, r: 4, class: 'pv-eye' }),
      txt(x, 46, held, { class: 'pv-emoji' }),
    );
  return frame(
    'pv-visual',
    s('rect', { width: 160, height: 100, class: 'pv-bg' }),
    s('circle', { cx: 128, cy: 24, r: 14, class: 'pv-moon' }),
    s('ellipse', { cx: 80, cy: 104, rx: 110, ry: 26, class: 'pv-ground' }),
    alien(50, '#7ac74f', '🦋'),
    alien(92, '#4fb3c7', '🍄'),
  );
}

export const PREVIEWS = { memory: previewMemory, logic: previewLogic, numeric: previewCalc, visual: previewVisual };
