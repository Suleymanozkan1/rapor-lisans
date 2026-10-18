// Beyin Testi · Mantık 1 — Dişli Çark
// Üç dişli döner. İkisi aynı dişlinin döndürülmüş hâlidir; biri tek bir dişte farklıdır.
// Farklı olanı bul. Tek bir dişin değişmesi uzun diş sayısını değiştirdiği için
// farklı dişli hiçbir döndürmeyle ötekilere eşitlenemez (cevap tektir).

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { s } from '../ui/svg.js';
import { h, choiceGrid } from '../ui/dom.js';

const TEETH = [8, 8, 10, 10, 12, 12, 14, 14, 16, 16];

export const definition = {
  id: 'gearWheel',
  name: 'Dişli Çark',
  category: 'logic',
  icon: '⚙',
  description: 'Üç dişliden farklı olanı bul.',
  howTo: [
    'Üç dişli döner. İkisi tıpatıp aynıdır, yalnızca farklı açıyla durur.',
    'Birinde tek bir diş farklıdır (uzun yerine kısa ya da tersi).',
    'Farklı dişliyi seç (1–3 tuşları).',
    'İpucu: bir dişliden başlayıp dişleri sırayla karşılaştır.',
  ],
  targetRtMs: 4000,
  gramsPerCorrect: 85,
};

export const levelConfig = (level) => {
  const l = Math.min(10, Math.max(1, level));
  return { teeth: TEETH[l - 1], spinSec: l <= 2 ? 0 : Math.max(6, 22 - l * 1.6), opposite: l >= 7 };
};

export const rotateBits = (bits, k) => bits.map((_, i) => bits[(i + k) % bits.length]);
// Döndürmeden bağımsız kanonik biçim (en küçük döndürme)
export const canonical = (bits) => {
  let best = null;
  for (let k = 0; k < bits.length; k++) {
    const s2 = rotateBits(bits, k).join('');
    if (best === null || s2 < best) best = s2;
  }
  return best;
};

export const createState = () => ({ guard: createRepeatGuard({ memory: 20 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      let base;
      do base = Array.from({ length: cfg.teeth }, () => rng.int(0, 1));
      while (base.filter(Boolean).length < 2 || base.filter((b) => !b).length < 2);
      const odd = base.slice();
      const flip = rng.int(0, cfg.teeth - 1);
      odd[flip] = 1 - odd[flip];
      const gears = rng.shuffle([
        { bits: rotateBits(base, rng.int(0, cfg.teeth - 1)), odd: false },
        { bits: rotateBits(base, rng.int(0, cfg.teeth - 1)), odd: false },
        { bits: rotateBits(odd, rng.int(0, cfg.teeth - 1)), odd: true },
      ]);
      return { ...cfg, gears, answer: gears.findIndex((g) => g.odd), key: canonical(base) };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return input.choice === round.answer
    ? { outcome: OUTCOME.CORRECT }
    : { outcome: OUTCOME.WRONG, explanation: `Farklı olan ${round.answer + 1}. dişliydi.` };
}

export function gearSvg(bits, { size = 96, spinSec = 0, reverse = false } = {}) {
  const n = bits.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const r = bits[i] ? 46 : 36;
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 0.55) / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    pts.push([50 + 30 * Math.cos(a0), 50 + 30 * Math.sin(a0)]);
    pts.push([50 + r * Math.cos(a0 + 0.04), 50 + r * Math.sin(a0 + 0.04)]);
    pts.push([50 + r * Math.cos(a1), 50 + r * Math.sin(a1)]);
    pts.push([50 + 30 * Math.cos(a1 + 0.04), 50 + 30 * Math.sin(a1 + 0.04)]);
    pts.push([50 + 30 * Math.cos(a2), 50 + 30 * Math.sin(a2)]);
  }
  const g = s(
    'g',
    { class: spinSec ? 'gw-spin' : null, style: spinSec ? `animation-duration:${spinSec}s;animation-direction:${reverse ? 'reverse' : 'normal'}` : null },
    s('polygon', { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '), class: 'gw-body' }),
    s('circle', { cx: 50, cy: 50, r: 11, class: 'gw-hub' }),
  );
  return s('svg', { viewBox: '0 0 100 100', width: size, height: size, class: 'gw-gear', 'aria-hidden': 'true', focusable: 'false' }, g);
}

export function render(ctx) {
  const { round } = ctx;
  const grid = choiceGrid(
    ctx,
    round.gears.map((g, i) => ({
      content: gearSvg(g.bits, { spinSec: round.spinSec, reverse: round.opposite && i === 1 }),
      label: `${i + 1}. dişli, ${g.bits.filter(Boolean).length} uzun diş`,
      value: i,
    })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: 3, className: 'gw-choices' },
  );
  ctx.root.append(h('div', { class: 'gw-machine' }, grid.el));
  ctx.status('Hangi dişli farklı?');
  ctx.presented();
}
