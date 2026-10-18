// Beyin Testi · Görsel 1 — Uzaylıyı Dondur
// İki sıra uzaylı ters yönlerde kayar; her biri elinde bir nesne tutar.
// Üstte gösterilen nesneyi tutan uzaylılara tıklayıp dondur. Yanlış uzaylıya tıklamak
// ve hedefi kaçırmak hata sayılır. Sürekli akan bir oyundur.

import { OUTCOME } from '../core/score.js';
import { OBJECT_IDS, objectInfo } from '../core/icons.js';
import { h } from '../ui/dom.js';
import { s } from '../ui/svg.js';

export const ALIEN_COLORS = ['#7ac74f', '#4fb3c7', '#c77ac7', '#e0a43a', '#e06a5a'];
export const TARGET_RATE = 0.4;
export const FREEZES_PER_TARGET = 5;

export const definition = {
  id: 'freezeAlien',
  name: 'Uzaylıyı Dondur',
  category: 'visual',
  icon: '❄',
  description: 'Hedef nesneyi tutan uzaylıları kaçmadan dondur.',
  howTo: [
    'İki sıra uzaylı ters yönlerde geçer; her biri elinde bir nesne tutar.',
    'Üstte yazan nesneyi tutan uzaylılara dokun ve dondur.',
    'Yanlış uzaylıya dokunmak ve hedefi kaçırmak hata sayılır.',
    'İpucu: iki sırayı birden görmek için ekranın ortasına bak.',
  ],
  targetRtMs: 1800,
  gramsPerCorrect: 45,
  continuous: true,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return {
    crossMs: Math.round(7600 - l * 420),
    spawnMs: Math.round(1350 - l * 70),
    pool: Math.min(OBJECT_IDS.length, 4 + l), // seçilebilecek farklı nesne sayısı
  };
}

export function pickTarget(rng, level, previous = null) {
  const pool = OBJECT_IDS.slice(0, levelConfig(level).pool).filter((o) => o !== previous);
  return rng.pick(pool);
}

export function makeAlien(rng, level, target) {
  const isTarget = rng.chance(TARGET_RATE);
  const pool = OBJECT_IDS.slice(0, levelConfig(level).pool).filter((o) => o !== target);
  return {
    object: isTarget ? target : rng.pick(pool),
    color: rng.pick(ALIEN_COLORS),
    isTarget,
  };
}

export const createState = () => ({ streams: 0 });
export function nextRound(state) {
  state.streams += 1;
  return { stream: true, key: `stream-${state.streams}` };
}

export function evaluate(_state, _round, input) {
  if (input.kind === 'freeze') {
    return input.isTarget
      ? { outcome: OUTCOME.CORRECT }
      : { outcome: OUTCOME.FALSE_ALARM, explanation: 'Bu uzaylı hedef nesneyi tutmuyordu.' };
  }
  if (input.kind === 'escape') return { outcome: OUTCOME.MISS, explanation: 'Bir hedef kaçtı.' };
  return { outcome: OUTCOME.IGNORE };
}

export function alienSvg(color) {
  return s(
    'svg',
    { viewBox: '0 0 60 70', width: 54, height: 63, class: 'fa-body', 'aria-hidden': 'true', focusable: 'false' },
    s('path', { d: 'M18 12 L14 2 M42 12 L46 2', class: 'fa-stalk' }),
    s('circle', { cx: 14, cy: 3, r: 3, fill: color }),
    s('circle', { cx: 46, cy: 3, r: 3, fill: color }),
    s('ellipse', { cx: 30, cy: 38, rx: 22, ry: 26, fill: color, class: 'fa-skin' }),
    s('ellipse', { cx: 22, cy: 30, rx: 6, ry: 7, class: 'fa-eye' }),
    s('ellipse', { cx: 38, cy: 30, rx: 6, ry: 7, class: 'fa-eye' }),
    s('circle', { cx: 23, cy: 31, r: 3, class: 'fa-pupil' }),
    s('circle', { cx: 37, cy: 31, r: 3, class: 'fa-pupil' }),
    s('path', { d: 'M22 46 Q30 52 38 46', class: 'fa-mouth' }),
  );
}

export function render(ctx) {
  const lanes = [h('div', { class: 'fa-lane fa-lane-a' }), h('div', { class: 'fa-lane fa-lane-b' })];
  const targetIcon = h('span', { class: 'fa-target-icon' });
  const targetName = h('strong', {});
  const banner = h('div', { class: 'fa-target', 'aria-live': 'polite' }, h('span', { class: 'label' }, 'Dondur'), targetIcon, targetName, h('span', {}, ' tutanları'));
  ctx.root.append(banner, h('div', { class: 'fa-field' }, lanes));
  let target = null;
  let frozenSinceSwitch = 0;
  let laneIndex = 0;

  const setTarget = () => {
    target = pickTarget(ctx.rng, ctx.currentLevel(), target);
    targetIcon.textContent = objectInfo(target).icon;
    targetName.textContent = ` ${objectInfo(target).name}`;
    banner.classList.remove('is-new');
    void banner.offsetWidth;
    banner.classList.add('is-new');
    frozenSinceSwitch = 0;
    ctx.status(`Elinde ${objectInfo(target).name} olanları dondur!`);
  };

  function spawn() {
    const cfg = levelConfig(ctx.currentLevel());
    const alien = makeAlien(ctx.rng, ctx.currentLevel(), target);
    const lane = laneIndex++ % 2;
    let state = 'moving';
    const el = h(
      'button',
      {
        type: 'button',
        class: `fa-alien ${lane ? 'go-left' : 'go-right'}`,
        style: { animationDuration: `${cfg.crossMs}ms` },
        'aria-label': `Uzaylı, elinde ${objectInfo(alien.object).name}`,
        onclick: () => {
          if (state !== 'moving') return;
          state = 'frozen';
          el.classList.add(alien.isTarget ? 'is-frozen' : 'is-wrong');
          el.disabled = true;
          ctx.record({ kind: 'freeze', isTarget: alien.isTarget });
          if (alien.isTarget && ++frozenSinceSwitch >= FREEZES_PER_TARGET) setTarget();
          ctx.later(() => el.remove(), 700);
        },
      },
      h('span', { class: 'fa-held', 'aria-hidden': 'true' }, objectInfo(alien.object).icon),
      alienSvg(alien.color),
    );
    lanes[lane].append(el);
    const heldTarget = target;
    ctx.later(() => {
      if (state !== 'moving') return;
      state = 'gone';
      el.remove();
      // Hedef değiştiyse eski hedefi kaçırmak ceza almaz
      if (alien.isTarget && heldTarget === target) ctx.record({ kind: 'escape' });
    }, cfg.crossMs);
    ctx.later(spawn, cfg.spawnMs);
  }

  setTarget();
  ctx.presented();
  spawn();
}
