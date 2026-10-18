// E. Sequence Detective — Dizi Dedektifi
// Sayı, ok veya şekil dizisindeki kuralı bul ve eksik öğeyi seç.
// Doğrulama: çeldiricilerin hiçbiri, desteklenen HİÇBİR kurala uyan bir dizi oluşturmaz.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { SHAPE_IDS, shapeName } from '../core/shapes.js';
import { h, choiceGrid } from '../ui/dom.js';
import { arrowSvg, shapeSvg } from '../ui/svg.js';

export const definition = {
  id: 'sequenceDetective',
  name: 'Dizi Dedektifi',
  category: 'pattern',
  icon: '⋯',
  description: 'Dizinin kuralını çöz, eksik parçayı bul.',
  howTo: [
    'Bir dizi görünür; bir öğesi “?” ile gizlenmiştir.',
    'Kural; sabit artış, katlanma, iki dizinin iç içe geçmesi, kareler, önceki ikisinin toplamı, ok dönüşü veya tekrar eden şekil olabilir.',
    'Eksik öğeyi seçeneklerden seç.',
  ],
  targetRtMs: 4000,
};

// ---- Sayı kuralları: tam bir dizinin bu kurala uyup uymadığını söyler ----
const diffs = (s) => s.slice(1).map((v, i) => v - s[i]);
const allEqual = (list) => list.every((v) => v === list[0]);

export const NUMBER_RULES = {
  arithmetic: (s) => allEqual(diffs(s)),
  geometric: (s) => {
    if (s[0] === 0 || s[1] % s[0] !== 0) return false;
    const r = s[1] / s[0];
    return Math.abs(r) >= 2 && s.every((v, i) => i === 0 || v === s[i - 1] * r);
  },
  alternating: (s) =>
    s.length >= 6 && allEqual(diffs(s.filter((_, i) => i % 2 === 0))) && allEqual(diffs(s.filter((_, i) => i % 2 === 1))),
  squares: (s) => {
    const k = Math.round(Math.sqrt(s[0]));
    return s[0] >= 0 && s.every((v, i) => v === (k + i) * (k + i));
  },
  fibonacci: (s) => s.every((v, i) => i < 2 || v === s[i - 1] + s[i - 2]),
  secondOrder: (s) => {
    const d = diffs(s);
    const dd = diffs(d);
    return dd.length >= 2 && allEqual(dd) && dd[0] !== 0;
  },
};

export const fitsAnyNumberRule = (s) => Object.values(NUMBER_RULES).some((fits) => fits(s));

// Oklar: sabit açıyla dönme (mod 360)
export const fitsArrowRule = (s) => allEqual(s.slice(1).map((v, i) => (((v - s[i]) % 360) + 360) % 360));

// Şekiller: 2, 3 veya 4 periyotla tekrar
export const fitsShapeRule = (s) => [2, 3, 4].some((p) => s.length >= 2 * p && s.every((v, i) => i < p || v === s[i - p]));

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  const rules = ['arithmetic'];
  if (l >= 3) rules.push('geometric');
  if (l >= 4) rules.push('alternating');
  if (l >= 6) rules.push('squares');
  if (l >= 7) rules.push('fibonacci');
  if (l >= 8) rules.push('secondOrder');
  const kinds = l === 1 ? ['number'] : l === 2 ? ['number', 'arrow'] : ['number', 'number', 'arrow', 'shape'];
  return { rules, kinds, interior: l >= 5, length: l >= 9 ? 7 : l >= 4 ? 6 : 5, scale: l >= 9 ? 3 : l >= 6 ? 2 : 1, negative: l >= 2 };
}

function numberSequence(rng, rule, len, cfg) {
  switch (rule) {
    case 'arithmetic': {
      const d = rng.int(1, 4 + 3 * cfg.scale) * (cfg.negative && rng.chance(0.3) ? -1 : 1);
      const a = d < 0 ? rng.int(-d * len, -d * len + 20) : rng.int(1, 10 * cfg.scale);
      return Array.from({ length: len }, (_, i) => a + i * d);
    }
    case 'geometric': {
      const r = rng.pick(len >= 6 ? [2] : [2, 3]);
      const a = rng.int(1, cfg.scale + 2);
      return Array.from({ length: len }, (_, i) => a * r ** i);
    }
    case 'alternating': {
      const x = rng.int(1, 10);
      const y = rng.int(20, 40);
      const dx = rng.int(1, 5);
      const dy = rng.int(1, 5) * (rng.chance(0.5) ? -1 : 1);
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? x + (i / 2) * dx : y + ((i - 1) / 2) * dy));
    }
    case 'squares': {
      const k = rng.int(1, 4 * cfg.scale);
      return Array.from({ length: len }, (_, i) => (k + i) ** 2);
    }
    case 'fibonacci': {
      const s = [rng.int(1, 5), rng.int(1, 8)];
      while (s.length < len) s.push(s[s.length - 1] + s[s.length - 2]);
      return s;
    }
    case 'secondOrder': {
      const a = rng.int(1, 10);
      const d0 = rng.int(1, 4);
      const step = rng.int(1, 3);
      const s = [a];
      for (let i = 1; i < len; i++) s.push(s[i - 1] + d0 + step * (i - 1));
      return s;
    }
    default:
      throw new Error(`Bilinmeyen kural: ${rule}`);
  }
}

function numberDistractors(rng, seq, missing) {
  const truth = seq[missing];
  const step = Math.abs(seq[1] - seq[0]) || 2;
  const cands = rng.shuffle([1, -1, 2, -2, step, -step, 3, -3, 5, -5, 10, -10, step + 1, -(step + 1)]).map((d) => truth + d);
  return cands.filter((v, i) => v !== truth && cands.indexOf(v) === i);
}

const fill = (seq, missing, value) => seq.map((v, i) => (i === missing ? value : v));

// Kuralı ve seçenekleri doğrulanmış bir soru üretir; başaramazsa null.
export function makeQuestion(rng, level) {
  const cfg = levelConfig(level);
  const kind = rng.pick(cfg.kinds);
  const len = kind === 'number' ? cfg.length : 6;
  const missing = cfg.interior ? rng.int(1, len - 1) : len - 1;
  let seq;
  let rule;
  let pool;
  let fits;
  if (kind === 'number') {
    rule = rng.pick(cfg.rules);
    seq = numberSequence(rng, rule, rule === 'alternating' ? Math.max(6, len) : len, cfg);
    fits = fitsAnyNumberRule;
    pool = numberDistractors(rng, seq, missing);
  } else if (kind === 'arrow') {
    rule = 'rotation';
    const step = rng.pick([45, 90, 135, -45, -90]);
    const start = rng.pick([0, 45, 90, 135, 180, 225, 270, 315]);
    seq = Array.from({ length: len }, (_, i) => (((start + i * step) % 360) + 360) % 360);
    fits = fitsArrowRule;
    pool = rng.shuffle([0, 45, 90, 135, 180, 225, 270, 315]);
  } else {
    rule = 'cycle';
    const period = rng.pick([2, 3]);
    const unit = rng.sample(SHAPE_IDS, period);
    seq = Array.from({ length: len }, (_, i) => unit[i % period]);
    fits = fitsShapeRule;
    pool = rng.shuffle(SHAPE_IDS);
  }
  const truth = seq[missing];
  if (!fits(seq)) return null;
  const distractors = pool.filter((v) => v !== truth && !fits(fill(seq, missing, v))).slice(0, 3);
  if (distractors.length < 3) return null;
  const options = rng.shuffle([truth, ...distractors]);
  return {
    kind,
    rule,
    terms: fill(seq, missing, null),
    full: seq,
    missing,
    options,
    answer: options.indexOf(truth),
    key: `${kind}:${seq.join(',')}:${missing}`,
  };
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 25 }) });

export function nextRound(state, { rng, level }) {
  return state.guard.take(
    () => {
      for (let i = 0; i < 100; i++) {
        const q = makeQuestion(rng, level);
        if (q) return q;
      }
      throw new Error('Dizi sorusu üretilemedi');
    },
    (r) => r.key,
  );
}

const RULE_TEXT = {
  arithmetic: 'Her adımda aynı sayı ekleniyor/çıkarılıyor.',
  geometric: 'Her adımda aynı sayıyla çarpılıyor.',
  alternating: 'İki ayrı dizi iç içe ilerliyor.',
  squares: 'Ardışık sayıların kareleri.',
  fibonacci: 'Her sayı önceki ikisinin toplamı.',
  secondOrder: 'Aradaki farklar düzenli artıyor.',
  rotation: 'Ok her adımda aynı açıyla dönüyor.',
  cycle: 'Şekiller aynı sırayla tekrar ediyor.',
};
export const ruleText = (rule) => RULE_TEXT[rule];

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return input.choice === round.answer
    ? { outcome: OUTCOME.CORRECT }
    : { outcome: OUTCOME.WRONG, explanation: RULE_TEXT[round.rule] };
}

const DIR_NAMES = { 0: 'yukarı', 45: 'sağ üst', 90: 'sağ', 135: 'sağ alt', 180: 'aşağı', 225: 'sol alt', 270: 'sol', 315: 'sol üst' };

function termEl(kind, v, size) {
  if (v == null) return h('span', { class: 'sd-term sd-missing', 'aria-label': 'eksik' }, '?');
  if (kind === 'arrow') return h('span', { class: 'sd-term' }, arrowSvg(v, { size, title: DIR_NAMES[v] }));
  if (kind === 'shape') return h('span', { class: 'sd-term' }, shapeSvg({ shape: v, color: 'blue' }, { size }));
  return h('span', { class: 'sd-term sd-num' }, String(v));
}

const optionLabel = (kind, v) => (kind === 'arrow' ? DIR_NAMES[v] : kind === 'shape' ? shapeName(v) : String(v));

export function render(ctx) {
  const { round } = ctx;
  ctx.root.append(
    h(
      'div',
      { class: `sd-seq sd-${round.kind}`, role: 'list', 'aria-label': 'Dizi' },
      round.terms.map((v) => h('span', { role: 'listitem' }, termEl(round.kind, v, 44))),
    ),
  );
  const grid = choiceGrid(
    ctx,
    round.options.map((v, i) => ({ content: termEl(round.kind, v, 48), label: optionLabel(round.kind, v), value: i })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: 2 },
  );
  ctx.root.append(grid.el);
  ctx.status('Eksik öğe hangisi?');
  ctx.presented();
}
