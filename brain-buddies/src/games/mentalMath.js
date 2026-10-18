// Sayısal akıl yürütme: zihinden hesap. Dört seçenekten doğru sonucu seç.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h, choiceGrid } from '../ui/dom.js';

export const definition = {
  id: 'mentalMath',
  name: 'Zihinden Hesap',
  category: 'numeric',
  icon: '∑',
  description: 'İşlemin sonucunu dört seçenek arasından hızlıca bul.',
  howTo: [
    'Ekranda bir işlem görünür.',
    'Doğru sonucu seç (1–4 tuşlarıyla da seçebilirsin).',
    'Seviye arttıkça sayılar büyür; çarpma, bölme ve iki adımlı işlemler gelir.',
  ],
  targetRtMs: 2600,
};

const OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  const max = [9, 12, 20, 30, 50, 50, 80, 99, 99, 150][l - 1];
  const ops = l <= 2 ? ['+', '−'] : l <= 4 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  return { max, ops, twoStep: l >= 7, tableMax: l <= 4 ? 6 : l <= 7 ? 9 : 12 };
}

function makeBinary(rng, op, cfg) {
  if (op === '×') {
    const a = rng.int(2, cfg.tableMax);
    const b = rng.int(2, cfg.tableMax);
    return { a, b };
  }
  if (op === '÷') {
    const b = rng.int(2, cfg.tableMax);
    const q = rng.int(2, cfg.tableMax);
    return { a: b * q, b };
  }
  if (op === '−') {
    const a = rng.int(2, cfg.max);
    return { a, b: rng.int(1, a) };
  }
  return { a: rng.int(1, cfg.max), b: rng.int(1, cfg.max) };
}

export function buildProblem(rng, level) {
  const cfg = levelConfig(level);
  const op1 = rng.pick(cfg.ops);
  const { a, b } = makeBinary(rng, op1, cfg);
  let value = OPS[op1](a, b);
  let text = `${a} ${op1} ${b}`;
  if (cfg.twoStep && rng.chance(0.6)) {
    const op2 = rng.pick(['+', '−']);
    const c = op2 === '−' ? rng.int(1, Math.max(1, value)) : rng.int(1, 20);
    // Önce soldaki işlem yapılır; parantez işlem önceliğini açık eder.
    text = `(${text}) ${op2} ${c}`;
    value = OPS[op2](value, c);
  }
  return { text, value };
}

// Benzersiz, negatif olmayan, akla yatkın çeldiriciler.
export function makeOptions(rng, value, count = 4) {
  const deltas = rng.shuffle([1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 11, -9]);
  const out = new Set([value]);
  for (const d of deltas) {
    if (out.size >= count) break;
    const v = value + d;
    if (v >= 0) out.add(v);
  }
  let extra = value + 4;
  while (out.size < count) out.add(extra++);
  return rng.shuffle([...out]);
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 40 }) });

export function nextRound(state, { rng, level }) {
  return state.guard.take(
    () => {
      const p = buildProblem(rng, level);
      const options = makeOptions(rng, p.value);
      return { text: p.text, value: p.value, options, answer: options.indexOf(p.value), key: p.text };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return round.options[input.choice] === round.value
    ? { outcome: OUTCOME.CORRECT }
    : { outcome: OUTCOME.WRONG, explanation: `${round.text} = ${round.value}` };
}

export function render(ctx) {
  const { round } = ctx;
  ctx.root.append(h('div', { class: 'mm-problem', 'aria-live': 'polite' }, `${round.text} = ?`));
  const grid = choiceGrid(
    ctx,
    round.options.map((v, i) => ({ content: h('span', { class: 'mm-num' }, String(v)), label: String(v), value: i })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: 2 },
  );
  ctx.root.append(grid.el);
  ctx.status('Sonuç kaç?');
  ctx.presented();
}
