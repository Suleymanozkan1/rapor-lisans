// Beyin Testi · Hesap 1 — Düşürme!
// İşlem yazılı toplar yukarıdan düşer. Sonucu tuş takımıyla (ya da klavyeyle) yaz;
// sonucu tutan top patlar. Yere düşen top hata sayılır. Sürekli akan bir oyundur:
// tüm süre tek bir "tur"dur, her patlama/düşme ayrı puanlanır.

import { OUTCOME } from '../core/score.js';
import { buildProblem } from './mentalMath.js';
import { h } from '../ui/dom.js';

export const definition = {
  id: 'dontDrop',
  name: 'Düşürme!',
  category: 'numeric',
  icon: '123',
  description: 'Düşen toplardaki işlemleri yere değmeden çöz.',
  howTo: [
    'Toplarda işlemler yazılı ve aşağı düşüyorlar.',
    'Sonucu tuş takımıyla ya da klavyedeki rakamlarla yaz; doğru top hemen patlar.',
    'Yere düşen top ve yanlış yazılan sayı hata sayılır.',
    'Art arda 10 doğru ek süre kazandırır.',
  ],
  targetRtMs: 3500,
  gramsPerCorrect: 38,
  continuous: true,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return {
    fallMs: Math.round(8000 - l * 420),
    spawnMs: Math.round(2300 - l * 140),
    maxBalls: Math.min(6, 2 + Math.ceil(l / 3)),
    // mentalMath seviyeleri daha hızlı zorlaşır; burada yarı hızla ilerler
    mathLevel: Math.max(1, Math.ceil(l * 0.75)),
  };
}

// İki cevap birbirinin öneki olamaz (ör. 1 ve 12); aksi hâlde "1" yazınca hangisi kastedildi belirsizdir.
export const conflicts = (a, b) => {
  const x = String(a);
  const y = String(b);
  return x.startsWith(y) || y.startsWith(x);
};

export function makeBall(rng, level, onScreen = []) {
  const cfg = levelConfig(level);
  for (let i = 0; i < 40; i++) {
    const p = buildProblem(rng, cfg.mathLevel);
    if (!onScreen.some((v) => conflicts(v, p.value))) return { text: p.text, value: p.value };
  }
  return null;
}

// Yazılan metni ekrandaki cevaplarla karşılaştırır.
export function matchInput(answers, typed) {
  if (!typed) return { status: 'partial' };
  const i = answers.findIndex((v) => String(v) === typed);
  if (i >= 0) return { status: 'pop', index: i };
  if (answers.some((v) => String(v).startsWith(typed))) return { status: 'partial' };
  return { status: 'wrong' };
}

export const createState = () => ({ streams: 0 });

export function nextRound(state) {
  state.streams += 1;
  return { stream: true, key: `stream-${state.streams}` };
}

export function evaluate(_state, _round, input) {
  if (input.kind === 'pop') return { outcome: OUTCOME.CORRECT, targetRtMs: definition.targetRtMs };
  if (input.kind === 'drop') return { outcome: OUTCOME.MISS, explanation: 'Bir top yere düştü.' };
  if (input.timeout) return { outcome: OUTCOME.IGNORE };
  return { outcome: OUTCOME.WRONG, explanation: 'Ekranda bu sonuçta top yok.' };
}

export function render(ctx) {
  const sky = h('div', { class: 'dd-sky', 'aria-label': 'Düşen işlemler' });
  const ground = h('div', { class: 'dd-ground', 'aria-hidden': 'true' });
  const display = h('output', { class: 'dd-display', 'aria-live': 'polite', 'aria-label': 'Yazdığın sayı' }, '');
  const balls = []; // { el, value, born, alive }
  let typed = '';
  let lane = 0;

  const keypad = h(
    'div',
    { class: 'dd-keypad', role: 'group', 'aria-label': 'Tuş takımı' },
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', 'C'].map((k) =>
      h('button', { type: 'button', class: 'dd-key', 'aria-label': k === '⌫' ? 'Sil' : k === 'C' ? 'Temizle' : k, onclick: () => press(k) }, k),
    ),
  );
  ctx.root.append(h('div', { class: 'dd-wrap' }, h('div', { class: 'dd-play' }, sky, ground), h('div', { class: 'dd-side' }, display, keypad)));

  const alive = () => balls.filter((b) => b.alive);
  const setTyped = (v) => {
    typed = v;
    display.textContent = v;
  };

  function spawn() {
    const level = ctx.currentLevel();
    const cfg = levelConfig(level);
    if (alive().length < cfg.maxBalls) {
      const ball = makeBall(ctx.rng, level, alive().map((b) => b.value));
      if (ball) {
        lane = (lane + 1 + Math.floor(ctx.rng.next() * 2)) % 4;
        const el = h('div', { class: 'dd-ball', style: { left: `${4 + lane * 24}%`, animationDuration: `${cfg.fallMs}ms` } }, ball.text);
        const entry = { ...ball, el, born: ctx.now(), alive: true };
        balls.push(entry);
        sky.append(el);
        ctx.later(() => {
          if (!entry.alive) return;
          entry.alive = false;
          el.classList.add('is-dropped');
          ctx.later(() => el.remove(), 400);
          ctx.record({ kind: 'drop' });
        }, cfg.fallMs);
      }
    }
    ctx.later(spawn, cfg.spawnMs);
  }

  function press(k) {
    if (k === 'C') return setTyped('');
    if (k === '⌫') return setTyped(typed.slice(0, -1));
    const next = (typed + k).replace(/^0(?=\d)/, '');
    const live = alive();
    const m = matchInput(live.map((b) => b.value), next);
    if (m.status === 'pop') {
      const b = live[m.index];
      b.alive = false;
      b.el.classList.add('is-popped');
      ctx.later(() => b.el.remove(), 250);
      setTyped('');
      ctx.record({ kind: 'pop', rtMs: ctx.now() - b.born });
    } else if (m.status === 'partial') {
      setTyped(next);
    } else {
      setTyped('');
      display.classList.remove('is-wrong');
      void display.offsetWidth;
      display.classList.add('is-wrong');
      ctx.record({ kind: 'wrong' });
    }
  }

  ctx.onKey((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('⌫');
    else if (e.key === 'Delete' || e.key === 'Escape') press('C');
    else return false;
    return true;
  });
  ctx.status('Sonucu yaz!');
  ctx.presented();
  spawn();
}
