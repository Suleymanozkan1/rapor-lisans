// Beyin Testi · Hesap 2 — Sayı Avı
// Üstte bir hedef toplam yazar. Toplamı tam olarak bu sayıyı veren sayıları seç.
// Üretici, hedefe ulaşan TEK bir sayı grubu olduğunu doğrular.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h } from '../ui/dom.js';

const COUNTS = [6, 6, 7, 7, 8, 8, 8, 9, 9, 9];

export const definition = {
  id: 'numberHunt',
  name: 'Sayı Avı',
  category: 'numeric',
  icon: 'Σ',
  description: 'Toplamı hedef sayıyı veren sayıları seç.',
  howTo: [
    'Üstte hedef toplam yazar.',
    'Aşağıdaki sayılardan toplamı tam olarak hedefi veren 2 (ileride 3) sayıyı seç.',
    'Seçimi geri almak için aynı sayıya tekrar bas. Hedefi aşarsan tur biter.',
  ],
  targetRtMs: 3000,
  gramsPerCorrect: 75,
};

export const levelConfig = (level) => {
  const l = Math.min(10, Math.max(1, level));
  return { count: COUNTS[l - 1], pick: l <= 4 ? 2 : 3, max: l <= 3 ? 12 : l <= 6 ? 25 : 40 };
};

// Toplamı target olan ve en az 2 elemanlı tüm alt kümeler (indeks listeleri)
export function subsetsWithSum(numbers, target) {
  const out = [];
  const n = numbers.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    let size = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) {
      sum += numbers[i];
      size += 1;
    }
    if (size >= 2 && sum === target) out.push([...Array(n).keys()].filter((i) => mask & (1 << i)));
  }
  return out;
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 30 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      for (let attempt = 0; attempt < 200; attempt++) {
        const pool = [...Array(cfg.max).keys()].map((i) => i + 1);
        const numbers = rng.sample(pool, cfg.count);
        const solution = rng.sample([...Array(cfg.count).keys()], cfg.pick).sort((a, b) => a - b);
        const target = solution.reduce((s, i) => s + numbers[i], 0);
        const all = subsetsWithSum(numbers, target);
        if (all.length === 1) return { ...cfg, numbers, target, solution, key: `${target}:${numbers.join(',')}` };
      }
      // Her zaman tek çözümlü yedek
      return { ...cfg, pick: 2, numbers: [1, 2, 4, 8, 16, 32], target: 3, solution: [0, 1], key: 'fallback' };
    },
    (r) => r.key,
  );
}

// 'continue' | 'correct' | 'wrong'
export function checkPicks(round, picks) {
  const sum = picks.reduce((s, i) => s + round.numbers[i], 0);
  if (sum > round.target) return 'wrong';
  if (sum === round.target) return picks.length === round.solution.length ? 'correct' : 'wrong';
  return picks.length >= round.solution.length ? 'wrong' : 'continue';
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  const status = checkPicks(round, input.picks || []);
  if (status === 'correct') return { outcome: OUTCOME.CORRECT };
  if (status === 'continue') return { outcome: OUTCOME.SKIP };
  return { outcome: OUTCOME.WRONG, explanation: `Doğrusu: ${round.solution.map((i) => round.numbers[i]).join(' + ')} = ${round.target}` };
}

export function render(ctx) {
  const { round } = ctx;
  let picks = [];
  let done = false;
  const sumEl = h('span', { class: 'nh-sum' }, '0');
  ctx.root.append(h('div', { class: 'nh-target' }, h('span', { class: 'label' }, 'Hedef'), h('strong', {}, String(round.target)), h('span', { class: 'nh-now' }, 'Toplam: ', sumEl)));
  const grid = h('div', { class: 'nh-grid', role: 'group', 'aria-label': 'Sayılar' });
  const buttons = round.numbers.map((n, i) => {
    const b = h('button', { type: 'button', class: 'nh-num', 'aria-pressed': 'false', onclick: () => tap(i) }, String(n));
    grid.append(b);
    return b;
  });
  ctx.root.append(grid);

  function tap(i) {
    if (done) return;
    if (picks.includes(i)) {
      picks = picks.filter((p) => p !== i);
      buttons[i].setAttribute('aria-pressed', 'false');
    } else {
      picks.push(i);
      buttons[i].setAttribute('aria-pressed', 'true');
    }
    sumEl.textContent = String(picks.reduce((s, p) => s + round.numbers[p], 0));
    const status = checkPicks(round, picks);
    if (status === 'continue') return ctx.sound('tick');
    done = true;
    buttons.forEach((b, j) => {
      b.disabled = true;
      if (round.solution.includes(j)) b.classList.add('is-solution');
    });
    ctx.answer({ picks: picks.slice() });
  }
  ctx.status(`${round.solution.length} sayı seç`);
  ctx.presented();
}
