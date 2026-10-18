// A. Dual Focus — Çift Odak
// Solda şekil, sağda sayı akar. Yalnızca kural sağlandığında BAS'a bas.
// İlk seviyeler tek koşulla öğretir, sonra iki koşul ve dikkat dağıtıcılar gelir.

import { OUTCOME } from '../core/score.js';
import { SHAPE_IDS, COLOR_IDS, shapeName, colorName, describeItem } from '../core/shapes.js';
import { h } from '../ui/dom.js';
import { shapeSvg } from '../ui/svg.js';

export const definition = {
  id: 'dualFocus',
  name: 'Çift Odak',
  category: 'attention',
  icon: '◐',
  description: 'İki bilgi akışını izle; yalnızca kural tuttuğunda bas.',
  howTo: [
    'Solda bir şekil, sağda bir sayı görünür ve kısa süre sonra değişir.',
    'Ekrandaki kural tutuyorsa BAS düğmesine (veya boşluk tuşuna) bas.',
    'Kural tutmuyorsa bekle. Yanlış basmak ve kaçırmak puan düşürür.',
    'Seviye arttıkça iki koşul aynı anda aranır, süre kısalır, dikkat dağıtıcılar eklenir.',
  ],
  targetRtMs: 700,
};

export const TARGET_PROBABILITY = 0.35;

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return {
    tier: l <= 2 ? 1 : l <= 3 ? 2 : 3, // 1: şekil, 2: sayı, 3: iki koşul
    showMs: Math.max(800, 1700 - l * 90),
    distractors: l >= 7 ? Math.min(4, l - 5) : 0,
  };
}

const NUMBER_CONDS = [
  { type: 'parity', value: 'even', text: 'sayı çift' },
  { type: 'parity', value: 'odd', text: 'sayı tek' },
  { type: 'gt', value: 5, text: 'sayı 5’ten büyük' },
  { type: 'lt', value: 5, text: 'sayı 5’ten küçük' },
];

export function matches(cond, stim) {
  switch (cond.type) {
    case 'shape':
      return stim.shape === cond.value;
    case 'color':
      return stim.color === cond.value;
    case 'parity':
      return (stim.number % 2 === 0) === (cond.value === 'even');
    case 'gt':
      return stim.number > cond.value;
    case 'lt':
      return stim.number < cond.value;
    default:
      throw new Error(`Bilinmeyen koşul: ${cond.type}`);
  }
}

export const isTarget = (rule, stim) => rule.conds.every((c) => matches(c, stim));

const shapeCond = (value) => ({ type: 'shape', value, text: `şekil ${shapeName(value)}` });
const colorCond = (value) => ({ type: 'color', value, text: `renk ${colorName(value)}` });

export function makeRule(rng, tier) {
  if (tier === 1) return { tier, conds: [shapeCond(rng.pick(SHAPE_IDS))] };
  const visual = rng.chance(0.5) ? shapeCond(rng.pick(SHAPE_IDS)) : colorCond(rng.pick(COLOR_IDS));
  const num = { ...rng.pick(NUMBER_CONDS) };
  if (tier === 2) return { tier, conds: [num] };
  return { tier, conds: [visual, num] };
}

export const ruleText = (rule) => rule.conds.map((c) => c.text).join(' VE ');

function randomStim(rng) {
  return { shape: rng.pick(SHAPE_IDS), color: rng.pick(COLOR_IDS), number: rng.int(1, 9) };
}

// Kurala uyan ya da uymayan uyaran üretir; tutarlılığı doğrulayarak döner.
export function makeStimulus(rng, rule, wantTarget) {
  for (let i = 0; i < 200; i++) {
    const stim = randomStim(rng);
    if (wantTarget) {
      for (const c of rule.conds) {
        if (c.type === 'shape') stim.shape = c.value;
        if (c.type === 'color') stim.color = c.value;
      }
    } else if (rule.conds.length > 1 && rng.chance(0.6)) {
      // "Yarı hedef": bir koşulu sağlar, diğerini sağlamaz; iki koşulu birlikte aramayı zorunlu kılar.
      const keep = rng.pick(rule.conds);
      if (keep.type === 'shape') stim.shape = keep.value;
      if (keep.type === 'color') stim.color = keep.value;
    }
    if (isTarget(rule, stim) === wantTarget) return stim;
  }
  throw new Error('Uyaran üretilemedi');
}

export function createState() {
  return { rule: null, sinceTarget: 0 };
}

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  let ruleChanged = false;
  if (!state.rule || state.rule.tier !== cfg.tier) {
    state.rule = makeRule(rng, cfg.tier);
    ruleChanged = true;
  }
  // Uzun süre hedef gelmezse olasılık artar (en fazla 5 hedefsiz uyaran).
  const wantTarget = state.sinceTarget >= 5 || rng.chance(TARGET_PROBABILITY);
  state.sinceTarget = wantTarget ? 0 : state.sinceTarget + 1;
  const stim = makeStimulus(rng, state.rule, wantTarget);
  const distractors = Array.from({ length: cfg.distractors }, () => randomStim(rng));
  return {
    rule: state.rule,
    ruleChanged,
    stim,
    target: wantTarget,
    distractors,
    showMs: cfg.showMs,
    key: `${stim.shape}/${stim.color}/${stim.number}`,
  };
}

export function evaluate(_state, round, input) {
  if (input.pressed) {
    return round.target
      ? { outcome: OUTCOME.CORRECT }
      : { outcome: OUTCOME.FALSE_ALARM, explanation: `Kural tutmuyordu: ${ruleText(round.rule)}.` };
  }
  return round.target
    ? { outcome: OUTCOME.MISS, explanation: 'Kural tutuyordu, basmalıydın.' }
    : { outcome: OUTCOME.IGNORE };
}

export function render(ctx) {
  const { round } = ctx;
  const showMs = ctx.relaxed ? Math.round(round.showMs * 1.6) : round.showMs;
  ctx.root.append(
    h(
      'div',
      { class: `df-rule${round.ruleChanged ? ' is-new' : ''}` },
      h('span', { class: 'label' }, round.ruleChanged ? 'Yeni kural' : 'Kural'),
      h('strong', {}, `Bas: ${ruleText(round.rule)}`),
    ),
  );
  const left = h(
    'div',
    { class: 'df-panel df-left', 'aria-label': 'Şekil' },
    shapeSvg(round.stim, { size: 96 }),
    h('span', { class: 'df-caption' }, describeItem(round.stim)),
  );
  const right = h('div', { class: 'df-panel df-right', 'aria-label': 'Sayı' }, h('span', { class: 'df-number' }, String(round.stim.number)));
  const stage = h('div', { class: 'df-stage' }, left, right);
  if (round.distractors.length) {
    stage.append(
      h(
        'div',
        { class: 'df-distractors', 'aria-hidden': 'true' },
        round.distractors.map((d) => h('span', { class: 'df-d' }, shapeSvg(d, { size: 30, label: false }), String(d.number))),
      ),
    );
  }
  ctx.root.append(stage);
  const press = h(
    'button',
    { type: 'button', class: 'btn btn-primary df-press', onclick: () => go() },
    'BAS',
    h('kbd', {}, 'Boşluk'),
  );
  ctx.root.append(press);
  let done = false;
  function go() {
    if (done) return;
    done = true;
    press.disabled = true;
    ctx.answer({ pressed: true });
  }
  ctx.onKey((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      go();
      return true;
    }
    return false;
  });
  ctx.status(round.ruleChanged ? 'Kural değişti, dikkat!' : 'Kural tutuyorsa bas');
  ctx.presented();
  ctx.limit(showMs, () => {
    done = true;
    return { pressed: false };
  });
  press.focus({ preventScroll: true });
}
