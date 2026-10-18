// Beyin Testi · Hafıza 2 — Kayıp Sembol
// Bir grup nesne gösterilir. Sonra biri eksik olarak yeniden gösterilir.
// Alttaki seçeneklerden eksik olanı seç. Seçeneklerin yalnızca biri ilk grupta vardı.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { OBJECT_IDS, objectInfo } from '../core/icons.js';
import { h, choiceGrid } from '../ui/dom.js';

export const definition = {
  id: 'missingSymbol',
  name: 'Kayıp Sembol',
  category: 'memory',
  icon: '?',
  description: 'Nesneleri ezberle; biri kaybolunca hangisi olduğunu bul.',
  howTo: [
    'Birkaç nesne gösterilir; hepsini ezberle.',
    'Nesneler bir kez daha gösterilir ama biri eksiktir.',
    'Alttaki dört seçenekten eksik olanı seç.',
    'Ezberlediysen "Hazırım"a basarak süre kazan.',
  ],
  targetRtMs: 2500,
  gramsPerCorrect: 100,
};

export const levelConfig = (level) => {
  const l = Math.min(10, Math.max(1, level));
  const count = Math.min(10, 3 + Math.ceil(l * 0.7));
  return { count, showMs: 1000 + 350 * count };
};

export const createState = () => ({ guard: createRepeatGuard({ memory: 20 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      const shown = rng.sample(OBJECT_IDS, cfg.count);
      const missing = rng.pick(shown);
      const remaining = rng.shuffle(shown.filter((o) => o !== missing));
      // Çeldiriciler ilk grupta hiç olmayan nesnelerdir; böylece tek doğru cevap vardır.
      const unseen = OBJECT_IDS.filter((o) => !shown.includes(o));
      const options = rng.shuffle([missing, ...rng.sample(unseen, 3)]);
      return { ...cfg, shown, remaining, missing, options, answer: options.indexOf(missing), key: shown.slice().sort().join(',') + ':' + missing };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return input.choice === round.answer
    ? { outcome: OUTCOME.CORRECT }
    : { outcome: OUTCOME.WRONG, explanation: `Eksik olan: ${objectInfo(round.missing).name}.` };
}

const objEl = (id, cls = 'ms-obj') => h('span', { class: cls, role: 'img', 'aria-label': objectInfo(id).name }, objectInfo(id).icon);

export function render(ctx) {
  const { round } = ctx;
  const board = h('div', { class: 'ms-board' }, round.shown.map((id) => objEl(id)));
  const ready = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'ms-ready', onclick: () => phase2() }, 'Hazırım');
  ctx.root.append(board, ready);
  ctx.status('Ezberle!');
  let switched = false;
  function phase2() {
    if (switched) return;
    switched = true;
    ready.remove();
    board.replaceChildren(...round.remaining.map((id) => objEl(id)));
    board.classList.add('is-second');
    const grid = choiceGrid(
      ctx,
      round.options.map((id, i) => ({ content: objEl(id, 'ms-opt'), label: objectInfo(id).name, value: i })),
      (choice, i) => {
        grid.mark(round.answer, 'is-correct');
        if (i !== round.answer) grid.mark(i, 'is-wrong');
        ctx.answer({ choice });
      },
      { columns: 4, className: 'ms-choices' },
    );
    ctx.root.append(grid.el);
    ctx.status('Hangisi eksik?');
    ctx.presented();
  }
  ctx.onKey((e) => (e.key === 'Enter' && !switched ? (phase2(), true) : false));
  ctx.later(phase2, ctx.relaxed ? round.showMs * 2 : round.showMs);
}
