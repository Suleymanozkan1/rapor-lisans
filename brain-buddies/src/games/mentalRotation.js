// Mekânsal akıl yürütme: döndürme mi, ayna mı?
// Seçeneklerden yalnızca biri parçanın DÖNDÜRÜLMÜŞ hâlidir; diğerleri ayna görüntüsünün
// döndürülmüş hâlleridir. Parça "kiral" seçilir (ayna görüntüsü hiçbir dönüşüne eşit değildir),
// bu yüzden doğru cevap tektir.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h, choiceGrid } from '../ui/dom.js';
import { pieceSvg } from '../ui/svg.js';

export const definition = {
  id: 'mentalRotation',
  name: 'Döndür ya da Aynala',
  category: 'spatial',
  icon: '⟳',
  description: 'Hangisi parçanın sadece döndürülmüş hâli? Gerisi ayna görüntüsü.',
  howTo: [
    'Üstte bir parça görünür.',
    'Seçeneklerden yalnızca biri aynı parçanın döndürülmüş hâlidir.',
    'Diğerleri ayna görüntüsüdür; döndürsen de üstteki parçayla çakışmaz.',
  ],
  targetRtMs: 3500,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return { cells: l <= 2 ? 4 : l <= 5 ? 5 : l <= 7 ? 6 : 7, options: l <= 3 ? 3 : 4, allowZero: l <= 2 };
}

export function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export const keyOf = (cells) => normalize(cells).map(([r, c]) => `${r}.${c}`).join('|');
export const rotate = (cells) => normalize(cells.map(([r, c]) => [c, -r]));
export const mirror = (cells) => normalize(cells.map(([r, c]) => [r, -c]));

export function rotations(cells) {
  const out = [normalize(cells)];
  for (let i = 0; i < 3; i++) out.push(rotate(out[out.length - 1]));
  return out;
}

export const isChiral = (cells) => {
  const m = keyOf(mirror(cells));
  return !rotations(cells).some((r) => keyOf(r) === m);
};

export function growPiece(rng, count) {
  const cells = [[0, 0]];
  const has = (r, c) => cells.some(([a, b]) => a === r && b === c);
  while (cells.length < count) {
    const [r, c] = rng.pick(cells);
    const [dr, dc] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (!has(r + dr, c + dc)) cells.push([r + dr, c + dc]);
  }
  return normalize(cells);
}

export const boxSize = (cells) => Math.max(...cells.map(([r, c]) => Math.max(r, c))) + 1;

export function makeQuestion(rng, level) {
  const cfg = levelConfig(level);
  for (let i = 0; i < 200; i++) {
    const piece = growPiece(rng, cfg.cells);
    if (!isChiral(piece)) continue;
    const rots = rotations(piece);
    const mirrors = rotations(mirror(piece));
    const mirrorKeys = new Set(mirrors.map(keyOf));
    if (mirrorKeys.size < cfg.options - 1) continue;
    const turn = cfg.allowZero ? rng.int(0, 3) : rng.int(1, 3);
    const correct = rots[turn];
    const distinct = [...new Map(mirrors.map((m) => [keyOf(m), m])).values()];
    const distractors = rng.sample(distinct, cfg.options - 1);
    const options = rng.shuffle([correct, ...distractors]);
    return {
      piece,
      options,
      answer: options.indexOf(correct),
      turn: turn * 90,
      size: Math.max(boxSize(piece), ...options.map(boxSize)),
      key: keyOf(piece),
    };
  }
  throw new Error('Parça üretilemedi');
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 20 }) });

export function nextRound(state, { rng, level }) {
  return state.guard.take(() => makeQuestion(rng, level), (r) => r.key);
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  return input.choice === round.answer
    ? { outcome: OUTCOME.CORRECT }
    : {
        outcome: OUTCOME.WRONG,
        explanation: `Seçtiğin parça ayna görüntüsüydü. Doğrusu ${round.turn}° döndürülmüş hâliydi.`,
      };
}

export function render(ctx) {
  const { round } = ctx;
  ctx.root.append(
    h('div', { class: 'mr-ref' }, h('span', { class: 'label' }, 'Parça'), pieceSvg(round.piece, round.size, { size: 110, title: 'Referans parça' })),
  );
  const grid = choiceGrid(
    ctx,
    round.options.map((cells, i) => ({ content: pieceSvg(cells, round.size, { size: 80 }), label: `parça ${i + 1}`, value: i })),
    (choice, i) => {
      grid.mark(round.answer, 'is-correct');
      if (i !== round.answer) grid.mark(i, 'is-wrong');
      ctx.answer({ choice });
    },
    { columns: round.options.length === 4 ? 2 : 3 },
  );
  ctx.root.append(grid.el);
  ctx.status('Hangisi sadece döndürülmüş?');
  ctx.presented();
}
