// Beyin Testi ekranları: ana sayfa, kategori girişi, ara sonuç, final tartısı, kupalar.

import { h } from './dom.js';
import { s } from './svg.js';
import { mascotSvg, speech } from './mascot.js';
import { createRng } from '../core/rng.js';
import { TEST_CATEGORIES, STEP_MS, BONUS_EVERY, BONUS_MS, scoringFor, unlockedGames, pickGame, summarizeTest, TROPHIES, weightComment, stepComment, categoryById } from '../core/brainTest.js';
import { gameById } from '../games/index.js';

const g = (v) => `${Math.round(v || 0).toLocaleString('tr-TR')} g`;
const nameOf = (id) => gameById(id).definition.name;

export function createBrainScreens({ repo, show, play, audio, reducedMotion, openTraining }) {
  const brain = () => repo.data.brain;

  // ---------------- Ana sayfa ----------------
  function home() {
    show((el) => {
      const b = brain();
      const earned = TROPHIES.filter((t) => b.trophies[t.id]).length;
      el.append(
        h(
          'section',
          { class: 'bt-hero' },
          h(
            'div',
            { class: 'bt-window' },
            h('div', { class: 'bt-sky', 'aria-hidden': 'true' }),
            h('div', { class: 'bt-host' }, mascotSvg({ size: 132, mood: 'happy' })),
            h(
              'div',
              { class: 'bt-hero-text' },
              h('p', { class: 'speech' }, b.tests ? 'Tekrar hoş geldin! Beynini bir kez daha tartalım mı?' : 'Merhaba, ben Profesör Gram! Beynini tartmaya hazır mısın?'),
              h('h1', { class: 'bt-title' }, 'Beynin kaç gram?'),
              h(
                'p',
                { class: 'bt-record' },
                b.best ? ['Rekorun: ', h('strong', { id: 'record-weight' }, g(b.best.total))] : 'Henüz tartılmadın.',
              ),
              h(
                'div',
                { class: 'row-actions' },
                h('button', { type: 'button', class: 'btn btn-primary btn-lg', id: 'start-test', onclick: startTest }, 'Testi başlat'),
                h('button', { type: 'button', class: 'btn btn-secondary', id: 'open-trophies', onclick: trophies }, `Kupalar ${earned}/${TROPHIES.length}`),
              ),
              h('p', { class: 'bt-sub' }, '4 oyun × 60 saniye: Hafıza, Mantık, Hesap, Görsel.'),
            ),
          ),
        ),
        h(
          'section',
          { class: 'bt-cats', 'aria-labelledby': 'cats-h' },
          h('h2', { class: 'section-title', id: 'cats-h' }, 'Testteki oyunlar'),
          h('div', { class: 'bt-cat-grid' }, TEST_CATEGORIES.map((cat) => categoryCard(cat))),
        ),
        h(
          'section',
          { class: 'bt-training' },
          h('div', {}, h('h2', { class: 'section-title' }, 'Serbest antrenman'), h('p', { class: 'muted' }, 'Açtığın oyunları ve ek beyin oyunlarını tek tek, süre ve zorluk ayarlarıyla oyna.')),
          h('button', { type: 'button', class: 'btn btn-secondary', id: 'open-training', onclick: openTraining }, 'Antrenmana git'),
        ),
      );
      if (!repo.persistent) el.append(h('p', { class: 'note' }, 'Not: Tarayıcı yerel kaydı engelliyor. Sonuçlar bu sekme kapanınca silinir.'));
    }, { focus: false });
  }

  function categoryCard(cat) {
    const b = brain();
    const open = unlockedGames(cat.id, b.tests);
    const locked = cat.games.filter((id) => !open.includes(id));
    let gameLine;
    if (open.length > 1) {
      const sel = h(
        'select',
        { id: `choice-${cat.id}`, 'aria-label': `${cat.name} oyunu`, onchange: (e) => repo.setBrainChoice(cat.id, e.target.value) },
        h('option', { value: 'random', selected: b.choice[cat.id] === 'random' }, 'Rastgele'),
        open.map((id) => h('option', { value: id, selected: b.choice[cat.id] === id }, nameOf(id))),
      );
      gameLine = h('label', { class: 'bt-choice' }, h('span', { class: 'label' }, 'Oyun'), sel);
    } else {
      gameLine = h('p', { class: 'bt-game' }, nameOf(open[0]));
    }
    return h(
      'article',
      { class: `bt-cat cat-${cat.id}` },
      h('div', { class: 'bt-cat-head' }, h('span', { class: 'bt-cat-icon', 'aria-hidden': 'true' }, cat.icon), h('h3', {}, cat.name)),
      gameLine,
      h('p', { class: 'bt-cat-best' }, h('span', { class: 'label' }, 'En iyi'), h('strong', {}, b.catBest[cat.id] ? g(b.catBest[cat.id]) : '—')),
      locked.map((id) => {
        const after = cat.unlockAfter[cat.games.indexOf(id)];
        return h('p', { class: 'bt-lock' }, `🔒 ${nameOf(id)}: ${after - b.tests} test sonra açılır`);
      }),
    );
  }

  // ---------------- Test akışı ----------------
  function startTest() {
    const b = brain();
    const seed = repo.settings.seed ? `${repo.settings.seed}:test:${b.tests}` : Date.now();
    const rng = createRng(seed);
    const plan = TEST_CATEGORIES.map((cat) => ({ category: cat.id, gameId: pickGame(cat.id, b.tests, b.choice[cat.id], rng) }));
    audio.play('start');
    stepIntro({ plan, steps: [] }, 0);
  }

  function progress(state, current) {
    return h(
      'ol',
      { class: 'bt-progress', 'aria-label': 'Test ilerlemesi' },
      state.plan.map((p, i) => {
        const done = state.steps[i];
        return h(
          'li',
          { class: done ? 'is-done' : i === current ? 'is-current' : '', 'aria-current': i === current ? 'step' : null },
          h('span', { class: 'bt-progress-name' }, categoryById(p.category).name),
          h('span', { class: 'bt-progress-val' }, done ? g(done.result.score) : i === current ? 'şimdi' : '—'),
        );
      }),
    );
  }

  function stepIntro(state, i) {
    const p = state.plan[i];
    const cat = categoryById(p.category);
    const def = gameById(p.gameId).definition;
    show((el) => {
      el.append(
        h(
          'section',
          { class: 'bt-step' },
          progress(state, i),
          speech(i === 0 ? `İlk olarak ${cat.name.toLocaleLowerCase('tr')}! Hazırsan başlayalım.` : `Sırada ${cat.name.toLocaleLowerCase('tr')} var.`, { mood: 'think', size: 96 }),
          h('p', { class: 'eyebrow' }, `${i + 1}/4 · ${cat.name}`),
          h('h1', { class: 'intro-title' }, def.name),
          h('ol', { class: 'howto' }, def.howTo.map((line) => h('li', {}, line))),
          h('p', { class: 'muted' }, `60 saniye · art arda ${BONUS_EVERY} doğru = +${BONUS_MS / 1000} sn · hatalar gram kaybettirir`),
          h(
            'div',
            { class: 'row-actions' },
            h('button', {
              type: 'button',
              class: 'btn btn-primary btn-lg',
              id: 'start-step',
              onclick: () =>
                play(p.gameId, {
                  level: 1,
                  test: {
                    durationMs: STEP_MS,
                    scoring: scoringFor(def),
                    bonusEvery: BONUS_EVERY,
                    bonusMs: BONUS_MS,
                    label: `${i + 1}/4 · ${cat.name}`,
                    onFinish: (result) => stepResult(state, i, result),
                    onQuit: home,
                  },
                }),
            }, 'Başla'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: home }, 'Testi bırak'),
          ),
        ),
      );
      setTimeout(() => el.querySelector('#start-step')?.focus(), 0);
    });
  }

  function stepResult(state, i, result) {
    const p = state.plan[i];
    const cat = categoryById(p.category);
    state.steps[i] = { ...p, result };
    const b = brain();
    const grams = Math.round(result.score);
    const errors = result.answered - result.counts.correct;
    const last = i === state.plan.length - 1;
    show((el) => {
      el.append(
        h(
          'section',
          { class: 'bt-step' },
          progress(state, last ? -1 : i + 1),
          speech(stepComment(grams, b.catBest[cat.id]), { mood: grams >= 1000 ? 'wow' : 'happy', size: 96 }),
          h('p', { class: 'eyebrow' }, `${cat.name} · ${nameOf(p.gameId)}`),
          h('h1', { class: 'bt-grams' }, h('span', { id: 'step-grams' }, g(grams))),
          h(
            'dl',
            { class: 'stat-grid' },
            h('div', {}, h('dt', {}, 'Doğru / hata'), h('dd', {}, `${result.counts.correct} / ${errors}`)),
            h('div', {}, h('dt', {}, 'En uzun seri'), h('dd', {}, String(result.bestStreak))),
            h('div', {}, h('dt', {}, 'Rekor testindeki'), h('dd', {}, b.best ? g(b.best.cats[cat.id]) : '—')),
            h('div', {}, h('dt', {}, 'Kategori en iyin'), h('dd', {}, b.catBest[cat.id] ? g(b.catBest[cat.id]) : '—')),
          ),
          h(
            'div',
            { class: 'row-actions' },
            last
              ? h('button', { type: 'button', class: 'btn btn-primary btn-lg', id: 'weigh', onclick: () => finalScreen(state) }, 'Beynimi tart')
              : h('button', { type: 'button', class: 'btn btn-primary btn-lg', id: 'next-step', onclick: () => stepIntro(state, i + 1) }, `Sonraki: ${categoryById(state.plan[i + 1].category).name}`),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: home }, 'Testi bırak'),
          ),
        ),
      );
      setTimeout(() => el.querySelector('#weigh, #next-step')?.focus(), 0);
    });
  }

  function scaleSvg() {
    return s(
      'svg',
      { viewBox: '0 0 200 120', class: 'bt-scale', 'aria-hidden': 'true', focusable: 'false' },
      s('rect', { x: 20, y: 96, width: 160, height: 18, rx: 6, class: 'sc-base' }),
      s('rect', { x: 92, y: 62, width: 16, height: 36, class: 'sc-post' }),
      s('rect', { x: 40, y: 54, width: 120, height: 10, rx: 5, class: 'sc-plate' }),
      s('g', { class: 'sc-brain' }, [[78, 34, 18], [100, 26, 20], [122, 34, 18], [88, 46, 16], [112, 46, 16]].map(([cx, cy, r]) => s('circle', { cx, cy, r }))),
      s('path', { d: 'M100 10 Q94 28 100 40 Q106 52 100 58', class: 'sc-fold' }),
    );
  }

  function finalScreen(state) {
    const summary = summarizeTest(state.steps);
    const outcome = repo.recordBrainTest(summary);
    const b = brain();
    audio.play('end');
    show((el) => {
      const big = h('span', { id: 'brain-weight', 'aria-label': g(summary.total) }, reducedMotion() ? g(summary.total) : '0 g');
      const prev = outcome.previousBest;
      el.append(
        h(
          'section',
          { class: 'bt-final' },
          speech(weightComment(summary.total), { mood: 'wow', size: 110 }),
          h('div', { class: 'bt-weigh' }, scaleSvg(), h('h1', { class: 'bt-total' }, h('small', {}, 'Beyin ağırlığın'), big)),
          outcome.isRecord
            ? h('p', { class: 'badge badge-record' }, prev ? `Yeni rekor! Öncekinden ${g(summary.total - prev.total)} ağır.` : 'İlk tartın rekor olarak kaydedildi!')
            : h('p', { class: 'badge' }, `Rekorun ${g(prev.total)}. Rekor yalnızca toplamı geçince güncellenir.`),
          h(
            'ul',
            { class: 'bt-breakdown', 'aria-label': 'Kategori dağılımı' },
            TEST_CATEGORIES.map((cat) => {
              const v = summary.cats[cat.id];
              return h(
                'li',
                {},
                h('span', { class: 'bar-name' }, `${cat.name}`, h('small', {}, nameOf(state.plan.find((p) => p.category === cat.id).gameId))),
                h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: `bar-fill cat-${cat.id}`, style: { width: `${Math.min(100, (v / 2000) * 100)}%` } })),
                h('span', { class: 'bar-num' }, g(v)),
              );
            }),
          ),
          outcome.newTrophies.length
            ? h('div', { class: 'panel' }, h('h2', { class: 'section-title' }, '🏆 Yeni kupa'), h('ul', { class: 'plain' }, outcome.newTrophies.map((t) => h('li', {}, h('strong', {}, t.name), ` · ${t.desc}`))))
            : null,
          outcome.unlocked.length
            ? h('div', { class: 'panel' }, h('h2', { class: 'section-title' }, '🔓 Yeni oyun açıldı'), h('ul', { class: 'plain' }, outcome.unlocked.map((u) => h('li', {}, h('strong', {}, nameOf(u.gameId)), ` · ${categoryById(u.category).name}. Ana sayfada seçebilirsin.`))))
            : null,
          h('p', { class: 'muted' }, `Toplam ${b.tests} test. ${summary.errors ? `Bu testte ${summary.errors} hata.` : 'Bu testte hiç hata yapmadın!'}`),
          h(
            'div',
            { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn btn-primary btn-lg', id: 'again-test', onclick: startTest }, 'Yeniden test'),
            h('button', { type: 'button', class: 'btn btn-secondary', id: 'go-home', onclick: home }, 'Ana sayfa'),
          ),
        ),
      );
      if (!reducedMotion()) {
        const t0 = performance.now();
        const step = (t) => {
          if (!big.isConnected) return;
          const k = Math.min(1, (t - t0) / 1400);
          big.textContent = g(summary.total * (1 - (1 - k) ** 3));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      setTimeout(() => el.querySelector('#again-test')?.focus(), 0);
    });
  }

  // ---------------- Kupalar ----------------
  function trophies() {
    show((el) => {
      const b = brain();
      el.append(
        h('h1', { class: 'page-title' }, 'Kupalar'),
        h(
          'ul',
          { class: 'trophy-grid' },
          TROPHIES.map((t) => {
            const at = b.trophies[t.id];
            return h(
              'li',
              { class: `trophy${at ? ' is-earned' : ''}` },
              h('span', { class: 'trophy-icon', 'aria-hidden': 'true' }, at ? '🏆' : '🔒'),
              h('strong', {}, t.name),
              h('span', { class: 'muted' }, t.desc),
              h('span', { class: 'trophy-state' }, at ? `Kazanıldı · ${new Date(at).toLocaleDateString('tr-TR')}` : 'Henüz kazanılmadı'),
            );
          }),
        ),
        h('div', { class: 'row-actions' }, h('button', { type: 'button', class: 'btn btn-secondary', onclick: home }, 'Ana sayfa')),
      );
    });
  }

  return { home, trophies, startTest };
}
