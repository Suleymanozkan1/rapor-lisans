// Profesör Gram: oyunun sunucu karakteri (özgün çizim, SVG). Beyinleri gram cinsinden tartar.
// İfadeler: happy (mutlu), think (düşünceli), wow (şaşkın), proud (gururlu), sad (teselli eden).
// Canlılık: göz kırpma, hafif süzülme, konuşurken ağız hareketi, isteğe bağlı el sallama.
// Hepsi CSS animasyonudur; hareket azaltma ayarında durur.

import { s } from './svg.js';
import { h } from './dom.js';

export const MOODS = ['happy', 'think', 'wow', 'proud', 'sad'];

function face(mood) {
  // Kaşlar
  const brows = {
    happy: ['M41 49 Q48 45 55 49', 'M65 49 Q72 45 79 49'],
    think: ['M41 50 L55 47', 'M65 46 Q72 44 79 48'],
    wow: ['M41 45 Q48 40 55 45', 'M65 45 Q72 40 79 45'],
    proud: ['M41 48 Q48 45 55 48', 'M65 48 Q72 45 79 48'],
    sad: ['M41 47 L55 51', 'M65 51 L79 47'],
  }[mood];
  // Gözler: gururluyken kapalı yay, diğerlerinde göz bebeği
  const eyes =
    mood === 'proud'
      ? s('g', { class: 'pg-eyes' }, s('path', { d: 'M44 63 Q48 58 52 63', class: 'pg-line' }), s('path', { d: 'M68 63 Q72 58 76 63', class: 'pg-line' }))
      : s(
          'g',
          { class: 'pg-eyes' },
          s('circle', { cx: mood === 'think' ? 50 : 48, cy: mood === 'think' ? 59 : 62, r: mood === 'wow' ? 4.4 : 3.6, class: 'pg-eye' }),
          s('circle', { cx: mood === 'think' ? 74 : 72, cy: mood === 'think' ? 59 : 62, r: mood === 'wow' ? 4.4 : 3.6, class: 'pg-eye' }),
          s('circle', { cx: mood === 'think' ? 51 : 49, cy: mood === 'think' ? 58 : 61, r: 1.2, class: 'pg-glint' }),
          s('circle', { cx: mood === 'think' ? 75 : 73, cy: mood === 'think' ? 58 : 61, r: 1.2, class: 'pg-glint' }),
        );
  const mouth = {
    happy: s('path', { d: 'M52 78 Q60 86 68 78', class: 'pg-line pg-mouth-line' }),
    think: s('path', { d: 'M53 80 Q60 78 67 79', class: 'pg-line pg-mouth-line' }),
    wow: s('ellipse', { cx: 60, cy: 80, rx: 5, ry: 6, class: 'pg-mouth' }),
    proud: s('path', { d: 'M50 77 Q60 89 70 77 Z', class: 'pg-mouth' }),
    sad: s('path', { d: 'M53 82 Q60 77 67 82', class: 'pg-line pg-mouth-line' }),
  }[mood];
  const cheeks =
    mood === 'happy' || mood === 'proud'
      ? [s('ellipse', { cx: 40, cy: 72, rx: 4, ry: 2.5, class: 'pg-cheek' }), s('ellipse', { cx: 80, cy: 72, rx: 4, ry: 2.5, class: 'pg-cheek' })]
      : [];
  return [
    s('circle', { cx: 48, cy: 62, r: 10, class: 'pg-glass' }),
    s('circle', { cx: 72, cy: 62, r: 10, class: 'pg-glass' }),
    s('path', { d: 'M58 62 L62 62', class: 'pg-line' }),
    s('path', { d: brows[0], class: 'pg-brow' }),
    s('path', { d: brows[1], class: 'pg-brow' }),
    eyes,
    cheeks,
    s('g', { class: 'pg-mouth-g' }, mouth),
    mood === 'think' ? s('circle', { cx: 100, cy: 30, r: 3, class: 'pg-thought' }) : null,
    mood === 'think' ? s('circle', { cx: 108, cy: 20, r: 4.5, class: 'pg-thought' }) : null,
    mood === 'sad' ? s('path', { d: 'M82 66 q2 5 0 7 q-2 -2 0 -7', class: 'pg-drop' }) : null,
  ];
}

// mood: MOODS'tan biri · wave: sağ kol sallanır · talk: kısa süre konuşma animasyonu
export function mascotSvg({ size = 150, mood = 'happy', wave = false, talk = false } = {}) {
  const m = MOODS.includes(mood) ? mood : 'happy';
  const svg = s(
    'svg',
    {
      viewBox: '0 0 120 150',
      width: size,
      height: (size * 150) / 120,
      class: `mascot mood-${m}${wave ? ' is-waving' : ''}${talk ? ' is-talking' : ''}`,
      role: 'img',
      focusable: 'false',
    },
    s('title', {}, document.createTextNode(`Profesör Gram (${{ happy: 'mutlu', think: 'düşünceli', wow: 'şaşkın', proud: 'gururlu', sad: 'teselli ediyor' }[m]})`)),
    s(
      'g',
      { class: 'pg-float' },
      // önlük
      s('path', { d: 'M28 150 L34 104 Q60 94 86 104 L92 150 Z', class: 'pg-coat' }),
      s('path', { d: 'M60 100 L50 126 M60 100 L70 126', class: 'pg-lapel' }),
      s('rect', { x: 66, y: 114, width: 12, height: 3, rx: 1.5, class: 'pg-pen' }),
      // sol kol ve sağ kol (sağ kol deney tüpünü tutar ve el sallayabilir)
      s('path', { d: 'M34 112 Q18 118 22 98', class: 'pg-arm' }),
      s(
        'g',
        { class: 'pg-wave' },
        s('path', { d: 'M86 112 Q102 116 98 96', class: 'pg-arm' }),
        s('rect', { x: 92, y: 70, width: 9, height: 26, rx: 4.5, class: 'pg-tube' }),
        s('rect', { x: 92, y: 82, width: 9, height: 14, rx: 4.5, class: 'pg-liquid' }),
        s('circle', { cx: 96.5, cy: 88, r: 1.4, class: 'pg-fizz' }),
        s('circle', { cx: 95, cy: 92, r: 1, class: 'pg-fizz pg-fizz-2' }),
      ),
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
      face(m),
    ),
  );
  return svg;
}

// Konuşma balonu + karakter. Metin uzunluğuna göre kısa bir süre "konuşur".
export function speech(text, { mood = 'happy', size = 120 } = {}) {
  const svg = mascotSvg({ size, mood, talk: true });
  const ms = Math.min(3200, 600 + String(text).length * 45);
  setTimeout(() => svg.classList.remove('is-talking'), ms);
  return h('div', { class: 'speech-row' }, svg, h('p', { class: 'speech' }, text));
}

// Sonuca göre ifade seçimi
export const moodForGrams = (grams) => (grams >= 1000 ? 'wow' : grams >= 600 ? 'happy' : 'sad');
export const moodForTotal = (total) => (total >= 4000 ? 'proud' : total >= 2500 ? 'wow' : total >= 1500 ? 'happy' : 'sad');
