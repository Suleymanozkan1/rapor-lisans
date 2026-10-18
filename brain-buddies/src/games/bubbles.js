// Beyin Testi · Görsel 2 — Baloncuklar
// Farklı büyüklükte baloncuklara küçükten büyüğe doğru tıkla.
// Boyutlar arasında seviyeye göre en az bir oran farkı bırakılır; sıralama tektir.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h } from '../ui/dom.js';

const COUNTS = [4, 4, 5, 5, 6, 6, 7, 7, 8, 9];
const MIN_STEP = [0.32, 0.28, 0.24, 0.2, 0.17, 0.15, 0.13, 0.11, 0.09, 0.08];

export const definition = {
  id: 'bubbles',
  name: 'Baloncuklar',
  category: 'visual',
  icon: '◯',
  description: 'Baloncuklara küçükten büyüğe doğru dokun.',
  howTo: [
    'Farklı büyüklükte baloncuklar belirir.',
    'En küçükten başlayarak büyüğe doğru sırayla dokun.',
    'Yanlış sıra turu bitirir. Seviye arttıkça boyutlar birbirine yaklaşır.',
  ],
  targetRtMs: 3500,
  gramsPerCorrect: 90,
};

export const levelConfig = (level) => {
  const l = Math.min(10, Math.max(1, level));
  return { count: COUNTS[l - 1], minStep: MIN_STEP[l - 1] };
};

export const createState = () => ({ guard: createRepeatGuard({ memory: 10 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      // Yarıçaplar: 100 birimlik alanda, ardışık oran en az minStep
      const radii = [];
      let r = 5 + rng.next() * 2;
      for (let i = 0; i < cfg.count; i++) {
        radii.push(Math.round(r * 10) / 10);
        r *= 1 + cfg.minStep + rng.next() * cfg.minStep * 0.6;
      }
      const scale = Math.min(1, 15 / radii[radii.length - 1]);
      const sizes = radii.map((x) => Math.round(x * scale * 10) / 10);
      const placed = [];
      for (const size of rng.shuffle(sizes)) {
        let pos = null;
        for (let t = 0; t < 400 && !pos; t++) {
          const x = size + rng.next() * (100 - 2 * size);
          const y = size + rng.next() * (70 - 2 * size);
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + size + 1.5)) pos = { x, y };
        }
        placed.push({ r: size, ...(pos || { x: 50, y: 35 }) });
      }
      const order = placed.map((_, i) => i).sort((a, b) => placed[a].r - placed[b].r);
      return { ...cfg, bubbles: placed, order, key: sizes.join(',') };
    },
    (r) => r.key,
  );
}

// 'continue' | 'correct' | 'wrong'
export function checkPicks(round, picks) {
  for (let i = 0; i < picks.length; i++) if (picks[i] !== round.order[i]) return 'wrong';
  return picks.length === round.order.length ? 'correct' : 'continue';
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  const status = checkPicks(round, input.picks || []);
  if (status === 'correct') return { outcome: OUTCOME.CORRECT, targetRtMs: 700 * round.count };
  if (status === 'continue') return { outcome: OUTCOME.SKIP };
  return { outcome: OUTCOME.WRONG, explanation: 'Sıra küçükten büyüğe olmalıydı.' };
}

export function render(ctx) {
  const { round } = ctx;
  const picks = [];
  let done = false;
  const field = h('div', { class: 'bb-field', role: 'group', 'aria-label': 'Baloncuklar' });
  const els = round.bubbles.map((b, i) => {
    const el = h('button', {
      type: 'button',
      class: 'bb-bubble',
      'aria-label': `Baloncuk, boyut ${round.order.indexOf(i) + 1}`,
      style: { left: `${b.x - b.r}%`, top: `${((b.y - b.r) / 70) * 100}%`, width: `${b.r * 2}%` },
      onclick: () => tap(i),
    });
    field.append(el);
    return el;
  });
  ctx.root.append(field);

  function tap(i) {
    if (done || picks.includes(i)) return;
    picks.push(i);
    const status = checkPicks(round, picks);
    els[i].classList.add(status === 'wrong' ? 'is-wrong' : 'is-popped');
    if (status === 'continue') return ctx.sound('tick');
    done = true;
    if (status === 'wrong') round.order.forEach((idx, n) => els[idx].setAttribute('data-n', String(n + 1)));
    ctx.answer({ picks: picks.slice() });
  }
  ctx.status('Küçükten büyüğe!');
  ctx.presented();
}
