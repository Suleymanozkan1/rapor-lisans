// Beyin Testi · Hafıza 1 — Deseni Vur
// Izgaradaki bazı karelerde nesneler belirir; kaybolunca aynı karelere tıkla.
// Ezberlediğin anda tıklamaya başlayabilirsin; ilk tıklama nesneleri gizler (süre kazanırsın).

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { OBJECT_IDS, objectInfo } from '../core/icons.js';
import { h } from '../ui/dom.js';

// [kenar, nesne sayısı] — seviye 1..10
export const LEVELS = [[4, 3], [4, 4], [4, 5], [5, 5], [5, 6], [5, 7], [6, 7], [6, 8], [6, 9], [6, 10]];

export const definition = {
  id: 'patternShoot',
  name: 'Deseni Vur',
  category: 'memory',
  icon: '▦',
  description: 'Nesnelerin yerini ezberle, kaybolunca aynı karelere tıkla.',
  howTo: [
    'Izgarada birkaç nesne belirir.',
    'Nesneler kaybolunca onların olduğu karelere tıkla.',
    'Ezberlediysen beklemeden tıklamaya başla; böylece süre kazanırsın.',
    'Yanlış kare turu bitirir.',
  ],
  targetRtMs: 3500,
  gramsPerCorrect: 110,
};

export const levelConfig = (level) => {
  const [size, count] = LEVELS[Math.min(10, Math.max(1, level)) - 1];
  return { size, count, showMs: 900 + 260 * count };
};

export const createState = () => ({ guard: createRepeatGuard({ memory: 20 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      const cells = rng.sample([...Array(cfg.size * cfg.size).keys()], cfg.count).sort((a, b) => a - b);
      const objects = rng.sample(OBJECT_IDS, cfg.count);
      return { ...cfg, cells, objects, key: `${cfg.size}:${cells.join('-')}` };
    },
    (r) => r.key,
  );
}

// 'continue' | 'correct' | 'wrong'
export function checkPicks(round, picks) {
  if (new Set(picks).size !== picks.length) return 'wrong';
  if (!picks.every((p) => round.cells.includes(p))) return 'wrong';
  return picks.length === round.cells.length ? 'correct' : 'continue';
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  const status = checkPicks(round, input.picks || []);
  if (status === 'correct') return { outcome: OUTCOME.CORRECT, targetRtMs: 800 + 500 * round.count };
  if (status === 'continue') return { outcome: OUTCOME.SKIP };
  return { outcome: OUTCOME.WRONG, explanation: 'Bu karede nesne yoktu.' };
}

export function render(ctx) {
  const { round } = ctx;
  const picks = [];
  let hidden = false;
  let done = false;
  const cells = [];
  const grid = h('div', { class: 'ps-grid', style: { '--n': round.size }, role: 'grid', 'aria-label': 'Desen ızgarası' });
  for (let i = 0; i < round.size * round.size; i++) {
    const idx = round.cells.indexOf(i);
    const obj = idx >= 0 ? objectInfo(round.objects[idx]) : null;
    const cell = h(
      'button',
      { type: 'button', class: 'ps-cell', 'aria-label': `Kare ${i + 1}`, onclick: () => tap(i) },
      obj ? h('span', { class: 'ps-obj', 'aria-hidden': 'true' }, obj.icon) : null,
    );
    cells.push(cell);
    grid.append(cell);
  }
  ctx.root.append(grid);

  const hide = () => {
    if (hidden) return;
    hidden = true;
    grid.classList.add('is-hidden');
    ctx.status(`${round.count} kareyi bul`);
  };

  function tap(i) {
    if (done || picks.includes(i)) return;
    hide();
    picks.push(i);
    const status = checkPicks(round, picks);
    cells[i].classList.add(status === 'wrong' ? 'is-wrong' : 'is-ok');
    if (status === 'continue') {
      ctx.sound('tick');
      return;
    }
    done = true;
    if (status === 'wrong') round.cells.forEach((c) => !picks.includes(c) && cells[c].classList.add('is-missed'));
    grid.classList.add('is-revealed');
    ctx.answer({ picks: picks.slice() });
  }

  ctx.status('Ezberle!');
  ctx.presented();
  ctx.later(hide, ctx.relaxed ? round.showMs * 2 : round.showMs);
}
