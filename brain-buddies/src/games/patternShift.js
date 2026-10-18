// C. Pattern Shift — Değişen Örüntü
// Kart, gizli bir kurala göre (renk, şekil, adet, boyut) eşleştirilir. Kural, birkaç
// doğru cevaptan sonra değişir; oyuncu eski kurala takılmadan yenisini bulmalıdır.
// Her seçenek hedefle TAM OLARAK bir özellikte eşleşir; bu yüzden her kuralın tek cevabı vardır.

import { OUTCOME } from '../core/score.js';
import { SHAPE_IDS, COLOR_IDS, describeItem } from '../core/shapes.js';
import { h, choiceGrid } from '../ui/dom.js';
import { shapeSvg } from '../ui/svg.js';

export const DIMENSIONS = {
  color: { name: 'Renk', values: COLOR_IDS.slice(0, 4) },
  shape: { name: 'Şekil', values: SHAPE_IDS.slice(0, 4) },
  count: { name: 'Adet', values: [1, 2, 3] },
  size: { name: 'Boyut', values: ['small', 'large'] },
};

export const SWITCH_BONUS = 40;

export const definition = {
  id: 'patternShift',
  name: 'Değişen Örüntü',
  category: 'pattern',
  icon: '⇄',
  description: 'Gizli eşleştirme kuralını bul; kural değişince hemen fark et.',
  howTo: [
    'Üstteki kartı alttaki kartlardan biriyle eşleştir.',
    'Eşleştirme kuralı renk, şekil, adet veya boyut olabilir.',
    'Geri bildirime bakarak kuralı keşfet. Birkaç doğrudan sonra kural değişir!',
    'İlk seviyelerde kural yazılı; sonra yalnızca değişim duyurulur, en sonunda hiç duyurulmaz.',
    'Değişimden hemen sonra yeni kuralı bulursan bonus kazanırsın.',
  ],
  targetRtMs: 2200,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return {
    dims: l >= 6 ? ['color', 'shape', 'count', 'size'] : ['color', 'shape', 'count'],
    visibility: l <= 2 ? 'shown' : l <= 4 ? 'announced' : 'silent',
    streak: l <= 4 ? [4, 5] : [3, 5],
  };
}

const other = (rng, values, not) => rng.pick(values.filter((v) => v !== not));

export function makeCards(rng, dims) {
  const target = {
    color: rng.pick(DIMENSIONS.color.values),
    shape: rng.pick(DIMENSIONS.shape.values),
    count: rng.pick(DIMENSIONS.count.values),
    size: dims.includes('size') ? rng.pick(DIMENSIONS.size.values) : 'large',
  };
  const choices = dims.map((dim) => {
    const card = { dim };
    for (const d of Object.keys(DIMENSIONS)) {
      if (d === 'size' && !dims.includes('size')) card.size = 'large';
      else card[d] = d === dim ? target[d] : other(rng, DIMENSIONS[d].values, target[d]);
    }
    return card;
  });
  return { target, choices: rng.shuffle(choices) };
}

// Kartın verilen kurala göre eşleşen seçeneklerinin indeksleri (her zaman tek olmalı).
export const matchingChoices = (round, dim) =>
  round.choices.map((c, i) => (c[dim] === round.target[dim] ? i : -1)).filter((i) => i >= 0);

export function createState() {
  return { rule: null, previousRule: null, streak: 0, needed: 0, sinceChange: 0, changePending: true, changes: 0 };
}

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  let ruleChanged = false;
  if (state.changePending || !cfg.dims.includes(state.rule)) {
    state.previousRule = state.rule;
    state.rule = rng.pick(cfg.dims.filter((d) => d !== state.rule));
    state.needed = rng.int(cfg.streak[0], cfg.streak[1]);
    state.streak = 0;
    state.sinceChange = 0;
    state.changePending = false;
    ruleChanged = state.previousRule != null;
    if (ruleChanged) state.changes += 1;
  }
  const { target, choices } = makeCards(rng, cfg.dims);
  const round = { target, choices, rule: state.rule, previousRule: state.previousRule, ruleChanged, visibility: cfg.visibility };
  round.answer = matchingChoices(round, state.rule)[0];
  round.key = `${state.changes}:${JSON.stringify(target)}`;
  return round;
}

export function evaluate(state, round, input) {
  state.sinceChange += 1;
  if (input.timeout) {
    state.streak = 0;
    return { outcome: OUTCOME.TIMEOUT };
  }
  if (input.choice === round.answer) {
    state.streak += 1;
    // Değişimden sonraki ilk iki denemede yeni kuralı bulmak = hızlı fark etme bonusu.
    const quick = round.previousRule && state.changes > 0 && state.sinceChange <= 2 && state.streak === state.sinceChange;
    if (state.streak >= state.needed) state.changePending = true;
    return { outcome: OUTCOME.CORRECT, extraBonus: quick ? SWITCH_BONUS : 0, quickSwitch: !!quick };
  }
  state.streak = 0;
  const chosen = round.choices[input.choice];
  const perseverative = round.previousRule && chosen && chosen[round.previousRule] === round.target[round.previousRule];
  return {
    outcome: OUTCOME.WRONG,
    perseverative: !!perseverative,
    explanation: perseverative
      ? 'Eski kurala göre seçtin. Kural değişti!'
      : round.visibility === 'shown'
        ? `Kural: ${DIMENSIONS[round.rule].name}.`
        : 'Bu kural değil. Başka bir özelliği dene.',
  };
}

function cardEl(card, big = false) {
  const n = card.count;
  const size = (big ? 46 : 34) * (card.size === 'small' ? 0.62 : 1);
  return h(
    'div',
    { class: `ps-card${big ? ' ps-target' : ''}` },
    Array.from({ length: n }, () => shapeSvg({ shape: card.shape, color: card.color }, { size, label: false })),
  );
}

export const cardLabel = (c) =>
  `${describeItem({ shape: c.shape, color: c.color, count: c.count })}, ${c.size === 'small' ? 'küçük' : 'büyük'}`;

export function render(ctx) {
  const { round } = ctx;
  const ruleLine =
    round.visibility === 'shown'
      ? `Kural: ${DIMENSIONS[round.rule].name}`
      : round.ruleChanged && round.visibility === 'announced'
        ? 'Kural değişti!'
        : 'Kuralı bul';
  ctx.root.append(
    h('div', { class: 'ps-head' }, h('span', { class: 'label' }, 'Bu kart'), cardEl(round.target, true)),
    h('p', { class: 'visually-hidden' }, cardLabel(round.target)),
  );
  const grid = choiceGrid(
    ctx,
    round.choices.map((c, i) => ({ content: cardEl(c), label: cardLabel(c), value: i })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: round.choices.length === 4 ? 2 : 3 },
  );
  ctx.root.append(grid.el);
  ctx.status(ruleLine);
  ctx.presented();
}
