// B. Memory Grid — Hafıza Izgarası
// Kısa süre yanan hücreleri hatırla ve aynı hücreleri seç. "Sıra" varyantında aynı sırayla.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h } from '../ui/dom.js';

// [ızgara kenarı, yanan hücre sayısı] — seviye 1..10
export const LEVELS = [
  [3, 3], [3, 4], [4, 4], [4, 5], [4, 6], [5, 6], [5, 7], [5, 8], [6, 8], [6, 9],
];

export const definition = {
  id: 'memoryGrid',
  name: 'Hafıza Izgarası',
  category: 'memory',
  icon: '▦',
  description: 'Yanan kareleri ezberle, sonra aynı kareleri seç.',
  howTo: [
    'Bazı kareler kısa bir süre yanar.',
    'Işıklar sönünce aynı karelere dokun.',
    '"Sıra" modunda kareleri yandıkları sırayla seç.',
    'Yanlış kareye dokunursan tur biter ve doğru kareler gösterilir.',
  ],
  targetRtMs: 2500,
  options: [
    {
      id: 'variant',
      label: 'Mod',
      choices: [
        { value: 'position', label: 'Konum' },
        { value: 'order', label: 'Sıra' },
      ],
      default: 'position',
    },
  ],
};

export const levelConfig = (level) => {
  const [size, count] = LEVELS[Math.min(LEVELS.length, Math.max(1, level)) - 1];
  // Daha çok hücre = daha uzun gösterim; seviye arttıkça hücre başına süre kısalır.
  const showMs = Math.round(600 + count * Math.max(260, 460 - level * 20));
  return { size, count, showMs, stepMs: Math.max(420, 750 - level * 30) };
};

export function createState({ options = {} } = {}) {
  return {
    variant: options.variant === 'order' ? 'order' : 'position',
    guard: createRepeatGuard({ memory: 20 }),
  };
}

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  const total = cfg.size * cfg.size;
  const indices = [...Array(total).keys()];
  return state.guard.take(
    () => {
      const targets = rng.sample(indices, cfg.count);
      const keyCells = state.variant === 'order' ? targets : targets.slice().sort((a, b) => a - b);
      return { ...cfg, targets, variant: state.variant, key: `${cfg.size}:${keyCells.join('-')}` };
    },
    (r) => r.key,
  );
}

// Kısmi seçim kontrolü: 'continue' | 'correct' | 'wrong'
export function checkPicks(round, picks) {
  if (new Set(picks).size !== picks.length) return 'wrong';
  for (let i = 0; i < picks.length; i++) {
    const ok = round.variant === 'order' ? picks[i] === round.targets[i] : round.targets.includes(picks[i]);
    if (!ok) return 'wrong';
  }
  return picks.length === round.targets.length ? 'correct' : 'continue';
}

export function evaluate(_state, round, input) {
  const targetRtMs = 700 * round.count;
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT, targetRtMs };
  const status = checkPicks(round, input.picks || []);
  if (status === 'correct') return { outcome: OUTCOME.CORRECT, targetRtMs };
  if (status === 'continue') return { outcome: OUTCOME.SKIP, targetRtMs, explanation: 'Tur yarım kaldı.' };
  return {
    outcome: OUTCOME.WRONG,
    targetRtMs,
    explanation:
      round.variant === 'order' ? 'Sıra karıştı. Doğru sıra numaralarla gösterildi.' : 'Bu kare yanmamıştı.',
  };
}

export function render(ctx) {
  const { round } = ctx;
  const picks = [];
  let accepting = false;
  const cells = [];
  const grid = h('div', {
    class: 'mg-grid',
    role: 'grid',
    'aria-label': `${round.size} x ${round.size} hafıza ızgarası`,
    style: { '--n': round.size },
  });
  for (let i = 0; i < round.size * round.size; i++) {
    const cell = h('button', {
      type: 'button',
      class: 'mg-cell',
      'aria-label': `Satır ${Math.floor(i / round.size) + 1}, sütun ${(i % round.size) + 1}`,
      onclick: () => tap(i),
      disabled: true,
    });
    cells.push(cell);
    grid.append(cell);
  }
  ctx.root.append(grid);

  const reveal = () => {
    round.targets.forEach((t, order) => {
      if (!picks.includes(t) || round.variant === 'order') {
        cells[t].classList.add(picks.includes(t) ? 'mg-ok' : 'mg-missed');
        if (round.variant === 'order') cells[t].textContent = String(order + 1);
      }
    });
  };

  function tap(i) {
    if (!accepting || picks.includes(i)) return;
    picks.push(i);
    const status = checkPicks(round, picks);
    cells[i].classList.add(status === 'wrong' ? 'mg-wrong' : 'mg-ok');
    cells[i].setAttribute('aria-pressed', 'true');
    ctx.sound(status === 'wrong' ? 'wrong' : 'tick');
    if (status !== 'continue') {
      accepting = false;
      cells.forEach((c) => (c.disabled = true));
      if (status === 'wrong') reveal();
      ctx.answer({ picks: picks.slice() });
    }
  }

  const startInput = () => {
    cells.forEach((c) => {
      c.classList.remove('mg-lit');
      c.textContent = '';
      c.disabled = false;
    });
    accepting = true;
    ctx.status(round.variant === 'order' ? 'Şimdi aynı sırayla seç.' : `Şimdi ${round.count} kareyi seç.`);
    ctx.presented();
    cells[0].focus({ preventScroll: true });
  };

  ctx.status('Ezberle…');
  if (round.variant === 'order') {
    round.targets.forEach((t, i) => {
      ctx.later(() => {
        cells[t].classList.add('mg-lit');
        cells[t].textContent = String(i + 1);
      }, i * round.stepMs);
      ctx.later(() => {
        cells[t].classList.remove('mg-lit');
        cells[t].textContent = '';
      }, i * round.stepMs + round.stepMs * 0.8);
    });
  } else {
    round.targets.forEach((t) => cells[t].classList.add('mg-lit'));
  }
  const showFor = round.variant === 'order' ? round.targets.length * round.stepMs : round.showMs;

  if (ctx.relaxed) {
    // Süre baskısı kapalı: oyuncu hazır olduğunda kendisi başlatır.
    const ready = h('button', { type: 'button', class: 'btn btn-secondary mg-ready', onclick: () => {
      ready.remove();
      startInput();
    } }, 'Ezberledim');
    ctx.root.append(ready);
    if (round.variant === 'order') ready.disabled = true;
    ctx.later(() => (ready.disabled = false), showFor);
  } else {
    ctx.later(startInput, showFor);
  }

  // Ok tuşlarıyla hücreler arasında gezinme
  ctx.onKey((e) => {
    const idx = cells.indexOf(document.activeElement);
    if (idx < 0) return false;
    const n = round.size;
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n };
    if (!(e.key in moves)) return false;
    const next = idx + moves[e.key];
    if (next >= 0 && next < cells.length) cells[next].focus();
    return true;
  });
}
