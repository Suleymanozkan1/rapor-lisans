// Profesör Gram: oyunun sunucu karakteri (özgün çizim, SVG). Beyinleri gram cinsinden tartar.

import { s } from './svg.js';
import { h } from './dom.js';

// mood: 'happy' | 'think' | 'wow'
export function mascotSvg({ size = 150, mood = 'happy' } = {}) {
  const mouth = {
    happy: s('path', { d: 'M52 78 Q60 86 68 78', class: 'pg-line' }),
    think: s('path', { d: 'M53 80 L67 78', class: 'pg-line' }),
    wow: s('ellipse', { cx: 60, cy: 80, rx: 5, ry: 6, class: 'pg-mouth' }),
  }[mood];
  return s(
    'svg',
    { viewBox: '0 0 120 150', width: size, height: (size * 150) / 120, class: `mascot mood-${mood}`, role: 'img', focusable: 'false' },
    s('title', {}, document.createTextNode('Profesör Gram')),
    // önlük
    s('path', { d: 'M28 150 L34 104 Q60 94 86 104 L92 150 Z', class: 'pg-coat' }),
    s('path', { d: 'M60 100 L50 126 M60 100 L70 126', class: 'pg-lapel' }),
    s('rect', { x: 66, y: 114, width: 12, height: 3, rx: 1.5, class: 'pg-pen' }),
    // kollar ve deney tüpü
    s('path', { d: 'M34 112 Q18 118 22 98', class: 'pg-arm' }),
    s('path', { d: 'M86 112 Q102 116 98 96', class: 'pg-arm' }),
    s('rect', { x: 92, y: 70, width: 9, height: 26, rx: 4.5, class: 'pg-tube' }),
    s('rect', { x: 92, y: 82, width: 9, height: 14, rx: 4.5, class: 'pg-liquid' }),
    // beyin
    s(
      'g',
      { class: 'pg-brain' },
      s('circle', { cx: 40, cy: 44, r: 22 }),
      s('circle', { cx: 60, cy: 34, r: 24 }),
      s('circle', { cx: 80, cy: 44, r: 22 }),
      s('circle', { cx: 46, cy: 66, r: 22 }),
      s('circle', { cx: 74, cy: 66, r: 22 }),
    ),
    s('path', { d: 'M60 14 Q54 30 60 44 Q66 58 60 72', class: 'pg-fold' }),
    s('path', { d: 'M30 40 Q38 34 44 42 M78 28 Q86 30 88 38 M36 58 Q42 54 48 60', class: 'pg-fold' }),
    // gözlük ve gözler
    s('circle', { cx: 48, cy: 62, r: 10, class: 'pg-glass' }),
    s('circle', { cx: 72, cy: 62, r: 10, class: 'pg-glass' }),
    s('path', { d: 'M58 62 L62 62', class: 'pg-line' }),
    s('circle', { cx: mood === 'think' ? 50 : 48, cy: mood === 'think' ? 59 : 62, r: 3.6, class: 'pg-eye' }),
    s('circle', { cx: mood === 'think' ? 74 : 72, cy: mood === 'think' ? 59 : 62, r: 3.6, class: 'pg-eye' }),
    mouth,
  );
}

export function speech(text, { mood = 'happy', size = 120 } = {}) {
  return h('div', { class: 'speech-row' }, mascotSvg({ size, mood }), h('p', { class: 'speech' }, text));
}
