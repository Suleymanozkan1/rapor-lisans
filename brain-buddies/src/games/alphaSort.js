// Beyin Testi · Mantık 2 — ABC Sırala
// Dağınık harflere alfabe sırasıyla (A'dan Z'ye, Türk alfabesi) tıkla.

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h } from '../ui/dom.js';

export const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
const COUNTS = [3, 3, 4, 4, 5, 5, 6, 6, 7, 8];
const SLOTS = 12; // 4 × 3 yerleşim alanı

export const definition = {
  id: 'alphaSort',
  name: 'ABC Sırala',
  category: 'logic',
  icon: 'Ab',
  description: 'Harflere alfabe sırasıyla tıkla.',
  howTo: [
    'Ekranda karışık harfler belirir.',
    'Harflere Türk alfabesindeki sırayla (A, B, C, Ç, D…) tıkla.',
    'Yanlış harf turu bitirir.',
  ],
  targetRtMs: 3500,
  gramsPerCorrect: 100,
};

export const levelConfig = (level) => ({ count: COUNTS[Math.min(10, Math.max(1, level)) - 1] });

export const sortTr = (letters) => letters.slice().sort((a, b) => ALPHABET.indexOf(a) - ALPHABET.indexOf(b));

export const createState = () => ({ guard: createRepeatGuard({ memory: 30 }) });

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      const letters = rng.sample(ALPHABET, cfg.count);
      const slots = rng.sample([...Array(SLOTS).keys()], cfg.count);
      return { ...cfg, letters, slots, order: sortTr(letters), key: sortTr(letters).join('') };
    },
    (r) => r.key,
  );
}

// 'continue' | 'correct' | 'wrong'
export function checkPicks(round, picks) {
  for (let i = 0; i < picks.length; i++) if (picks[i] !== round.order[i]) return 'wrong';
  return picks.length === round.order.length ? 'correct' : 'continue';
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  const status = checkPicks(round, input.picks || []);
  if (status === 'correct') return { outcome: OUTCOME.CORRECT, targetRtMs: 600 * round.count };
  if (status === 'continue') return { outcome: OUTCOME.SKIP };
  return { outcome: OUTCOME.WRONG, explanation: `Doğru sıra: ${round.order.join(' ')}` };
}

export function render(ctx) {
  const { round } = ctx;
  const picks = [];
  let done = false;
  const field = h('div', { class: 'as-field' });
  const buttons = round.letters.map((letter, i) => {
    const btn = h(
      'button',
      { type: 'button', class: 'as-letter', style: { gridArea: `${Math.floor(round.slots[i] / 4) + 1} / ${(round.slots[i] % 4) + 1}` }, onclick: () => tap(letter, btn) },
      letter,
    );
    field.append(btn);
    return btn;
  });
  ctx.root.append(field);

  function tap(letter, btn) {
    if (done || btn.disabled) return;
    picks.push(letter);
    const status = checkPicks(round, picks);
    btn.disabled = true;
    btn.classList.add(status === 'wrong' ? 'is-wrong' : 'is-ok');
    if (status === 'continue') {
      ctx.sound('tick');
      return;
    }
    done = true;
    buttons.forEach((b) => (b.disabled = true));
    ctx.answer({ picks: picks.slice() });
  }
  // Klavyeden harf yazarak da seçilebilir
  ctx.onKey((e) => {
    const key = e.key.length === 1 ? e.key.toLocaleUpperCase('tr') : '';
    const i = round.letters.indexOf(key);
    if (i < 0) return false;
    tap(key, buttons[i]);
    return true;
  });
  ctx.status('Alfabe sırasıyla tıkla');
  ctx.presented();
}
