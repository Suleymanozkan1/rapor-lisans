// D. Logic Circuit — Mantık Devresi
// Basit mantık kapılarından oluşan bir devrenin çıkışını, eksik girişini veya
// ÇIKIŞ=1 yapan giriş ikilisini bul. Üretilen her sorunun tek doğru cevabı doğrulanır.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h, choiceGrid } from '../ui/dom.js';

export const GATES = {
  AND: { name: 'VE', arity: 2, fn: (a, b) => a & b, hint: 'İkisi de 1 ise 1' },
  OR: { name: 'VEYA', arity: 2, fn: (a, b) => a | b, hint: 'En az biri 1 ise 1' },
  NOT: { name: 'DEĞİL', arity: 1, fn: (a) => 1 - a, hint: 'Tersini verir' },
  XOR: { name: 'YA DA', arity: 2, fn: (a, b) => a ^ b, hint: 'Yalnızca biri 1 ise 1' },
  NAND: { name: 'VE-DEĞİL', arity: 2, fn: (a, b) => 1 - (a & b), hint: 'İkisi de 1 ise 0, yoksa 1' },
};

export const definition = {
  id: 'logicCircuit',
  name: 'Mantık Devresi',
  category: 'logic',
  icon: '⊻',
  description: 'Mantık kapılarını izleyerek doğru çıkışı bul.',
  howTo: [
    'Girişler 1 (açık) ya da 0 (kapalı) değerindedir.',
    'VE: ikisi de 1 ise 1 · VEYA: en az biri 1 ise 1 · DEĞİL: tersini verir.',
    'YA DA: yalnızca biri 1 ise 1 · VE-DEĞİL: VE’nin tersi.',
    'Kapıları yukarıdan aşağı sırayla hesapla. Yanlış cevaptan sonra çözüm adım adım gösterilir.',
  ],
  targetRtMs: 4500,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  const ops = l <= 1 ? ['AND', 'OR'] : l <= 2 ? ['AND', 'OR', 'NOT'] : l <= 7 ? ['AND', 'OR', 'NOT', 'XOR'] : Object.keys(GATES);
  const shape = l <= 2 ? 'single' : l <= 6 ? 'chain' : 'tree';
  const questions = l <= 3 ? ['output'] : l <= 5 ? ['output', 'missing'] : ['output', 'missing', 'combo'];
  return { ops, shape, questions };
}

export function evaluateCircuit(circuit, inputs) {
  const values = { ...inputs };
  for (const g of circuit.gates) values[g.id] = GATES[g.op].fn(...g.args.map((a) => values[a]));
  return values;
}

export function explain(circuit, inputs) {
  const values = evaluateCircuit(circuit, inputs);
  return circuit.gates.map(
    (g) => `${g.id === 'OUT' ? 'ÇIKIŞ' : g.id} = ${GATES[g.op].name}(${g.args.map((a) => `${a}=${values[a]}`).join(', ')}) = ${values[g.id]}`,
  );
}

function gate(rng, ops, id, args) {
  const op = rng.pick(ops);
  return GATES[op].arity === 1 ? { id, op, args: [args[0]] } : { id, op, args };
}

export function makeCircuit(rng, cfg) {
  const twoInput = cfg.ops.filter((o) => GATES[o].arity === 2);
  if (cfg.shape === 'single') {
    const g = gate(rng, cfg.ops, 'OUT', ['A', 'B']);
    return { inputs: g.args.length === 1 ? ['A'] : ['A', 'B'], gates: [g] };
  }
  if (cfg.shape === 'chain') {
    const g1 = gate(rng, twoInput, 'G1', ['A', 'B']);
    const last = rng.chance(0.25) ? { id: 'OUT', op: 'NOT', args: ['G1'] } : gate(rng, twoInput, 'OUT', ['G1', 'C']);
    return { inputs: last.args.includes('C') ? ['A', 'B', 'C'] : ['A', 'B'], gates: [g1, last] };
  }
  const g1 = gate(rng, twoInput, 'G1', ['A', 'B']);
  const g2 = gate(rng, cfg.ops, 'G2', ['C', 'D']);
  const out = gate(rng, twoInput, 'OUT', ['G1', 'G2']);
  return { inputs: g2.args.length === 1 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'], gates: [g1, g2, out] };
}

const randomInputs = (rng, names) => Object.fromEntries(names.map((n) => [n, rng.int(0, 1)]));
const COMBOS = [[0, 0], [0, 1], [1, 0], [1, 1]];

// Soruyu üretir; tek cevaplı değilse null döner (çağıran yeniden dener).
export function makeQuestion(rng, circuit, type) {
  const inputs = randomInputs(rng, circuit.inputs);
  if (type === 'output') {
    const out = evaluateCircuit(circuit, inputs).OUT;
    return { type, inputs, options: [0, 1], answer: out, solution: inputs };
  }
  if (type === 'missing') {
    const hidden = rng.pick(circuit.inputs);
    const out = evaluateCircuit(circuit, inputs).OUT;
    const fits = [0, 1].filter((v) => evaluateCircuit(circuit, { ...inputs, [hidden]: v }).OUT === out);
    if (fits.length !== 1) return null;
    return { type, inputs, hidden, out, options: [0, 1], answer: fits[0], solution: inputs };
  }
  // combo: A ve B bilinmiyor; ÇIKIŞ=want yapan TEK (A,B) ikilisini bul
  if (!circuit.inputs.includes('B')) return null;
  const want = rng.int(0, 1);
  const fits = COMBOS.filter(([a, b]) => evaluateCircuit(circuit, { ...inputs, A: a, B: b }).OUT === want);
  if (fits.length !== 1) return null;
  const [a, b] = fits[0];
  return {
    type,
    inputs,
    want,
    options: COMBOS.map(([x, y]) => `A=${x}, B=${y}`),
    answer: `A=${a}, B=${b}`,
    solution: { ...inputs, A: a, B: b },
  };
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 20 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      for (let i = 0; i < 100; i++) {
        const circuit = makeCircuit(rng, cfg);
        const q = makeQuestion(rng, circuit, rng.pick(cfg.questions));
        if (q) {
          const key = `${q.type}:${JSON.stringify(circuit.gates)}:${JSON.stringify(q.inputs)}:${q.hidden ?? ''}:${q.want ?? ''}`;
          return { circuit, ...q, key };
        }
      }
      // Her zaman tek cevaplı yedek soru
      const circuit = { inputs: ['A', 'B'], gates: [{ id: 'OUT', op: 'AND', args: ['A', 'B'] }] };
      return { circuit, type: 'output', inputs: { A: 1, B: 1 }, options: [0, 1], answer: 1, solution: { A: 1, B: 1 }, key: 'fallback' };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  const steps = explain(round.circuit, round.solution);
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT, steps };
  const value = round.options[input.choice];
  return value === round.answer
    ? { outcome: OUTCOME.CORRECT, steps }
    : { outcome: OUTCOME.WRONG, steps, explanation: steps.join(' · ') };
}

function lamp(name, value) {
  const hidden = value == null;
  return h(
    'span',
    { class: `lc-input${hidden ? ' is-hidden' : value ? ' is-on' : ''}` },
    h('span', { class: 'lc-name' }, name),
    h('span', { class: 'lc-val' }, hidden ? '?' : String(value)),
  );
}

export function render(ctx) {
  const { round } = ctx;
  const unknown = new Set(round.type === 'missing' ? [round.hidden] : round.type === 'combo' ? ['A', 'B'] : []);
  const inputs = h('div', { class: 'lc-inputs' }, round.circuit.inputs.map((n) => lamp(n, unknown.has(n) ? null : round.inputs[n])));
  const gates = h(
    'ol',
    { class: 'lc-gates' },
    round.circuit.gates.map((g) =>
      h(
        'li',
        { class: 'lc-gate' },
        h('span', { class: 'lc-out' }, g.id === 'OUT' ? 'ÇIKIŞ' : g.id),
        ' = ',
        h('span', { class: `lc-op op-${g.op}`, title: GATES[g.op].hint }, GATES[g.op].name),
        ` ( ${g.args.join(', ')} )`,
      ),
    ),
  );
  const question =
    round.type === 'output'
      ? 'ÇIKIŞ kaç?'
      : round.type === 'missing'
        ? `ÇIKIŞ = ${round.out}. ${round.hidden} kaç olmalı?`
        : `ÇIKIŞ = ${round.want} yapan tek A, B ikilisi hangisi?`;
  ctx.root.append(h('div', { class: 'lc-board' }, inputs, gates), h('p', { class: 'lc-question' }, question));
  const grid = choiceGrid(
    ctx,
    round.options.map((o, i) => ({ content: h('span', { class: 'mm-num' }, String(o)), label: String(o), value: i })),
    (choice) => {
      const correctIndex = round.options.indexOf(round.answer);
      grid.mark(correctIndex, 'is-correct');
      if (choice !== correctIndex) grid.mark(choice, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: 2 },
  );
  ctx.root.append(grid.el);
  ctx.status(question);
  ctx.presented();
}
