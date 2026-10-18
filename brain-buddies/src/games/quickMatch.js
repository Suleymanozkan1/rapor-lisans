// Hızlı Eşleştirme: üstte gösterilen şeklin aynısını (şekil + renk/desen) bul.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { SHAPE_IDS, COLOR_IDS, describeItem } from '../core/shapes.js';
import { h, choiceGrid } from '../ui/dom.js';
import { shapeSvg } from '../ui/svg.js';

const OPTION_COUNTS = [4, 4, 6, 6, 6, 9, 9, 9, 12, 12];

export const definition = {
  id: 'quickMatch',
  name: 'Hızlı Eşleştirme',
  category: 'match',
  icon: '◈',
  description: 'Üstteki şeklin tıpatıp aynısını bul.',
  howTo: [
    'Üstte bir hedef şekil görünür.',
    'Aşağıdakilerden şekli ve rengi/deseni aynı olanı seç.',
    'İleri seviyelerde şekiller döndürülmüş olabilir; döndürme farkı önemsizdir.',
    'Her rengin kendine özgü bir deseni vardır.',
  ],
  targetRtMs: 1600,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return {
    options: OPTION_COUNTS[l - 1],
    similar: l >= 6 ? 1 : l >= 3 ? 0.5 : 0, // hedefle bir özelliği paylaşan çeldirici oranı
    rotate: l >= 8,
    columns: OPTION_COUNTS[l - 1] >= 12 ? 4 : OPTION_COUNTS[l - 1] >= 6 ? 3 : 2,
  };
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 12 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      const target = { shape: rng.pick(SHAPE_IDS), color: rng.pick(COLOR_IDS) };
      const used = new Set([`${target.shape}/${target.color}`]);
      const all = [];
      for (const shape of SHAPE_IDS) {
        for (const color of COLOR_IDS) {
          if (!used.has(`${shape}/${color}`)) all.push({ shape, color });
        }
      }
      const similarPool = rng.shuffle(all.filter((o) => o.shape === target.shape || o.color === target.color));
      const otherPool = rng.shuffle(all.filter((o) => o.shape !== target.shape && o.color !== target.color));
      const distractorCount = cfg.options - 1;
      const similarCount = Math.min(similarPool.length, Math.round(distractorCount * cfg.similar));
      const distractors = [
        ...similarPool.slice(0, similarCount),
        ...otherPool.slice(0, distractorCount - similarCount),
      ];
      const items = rng.shuffle([{ ...target, isTarget: true }, ...distractors]).map((o) => ({
        ...o,
        rotation: cfg.rotate && o.shape !== 'circle' ? rng.pick([0, 45, 90, 135, 180, 270]) : 0,
      }));
      return {
        target,
        items,
        answer: items.findIndex((o) => o.isTarget),
        columns: cfg.columns,
        key: `${target.shape}/${target.color}:${items.length}`,
      };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return input.choice === round.answer
    ? { outcome: OUTCOME.CORRECT }
    : { outcome: OUTCOME.WRONG, explanation: `Doğrusu: ${describeItem(round.target)}.` };
}

export function render(ctx) {
  const { round } = ctx;
  ctx.root.append(
    h('div', { class: 'qm-target' }, h('span', { class: 'label' }, 'Hedef'), shapeSvg(round.target, { size: 88 })),
  );
  const grid = choiceGrid(
    ctx,
    round.items.map((item, i) => ({ content: shapeSvg(item, { size: 60, label: false }), label: describeItem(item), value: i })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: round.columns, className: 'qm-choices' },
  );
  ctx.root.append(grid.el);
  ctx.status('Aynısını bul');
  ctx.presented();
}
