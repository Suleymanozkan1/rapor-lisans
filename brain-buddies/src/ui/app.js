// Uygulama kabuğu: ekranlar (menü, tanıtım, oyun, sonuç, istatistik, ayarlar) ve oyun döngüsü.

import { createRng } from '../core/rng.js';
import { createSession, PHASE } from '../core/session.js';
import { OUTCOME } from '../core/score.js';
import { createTimer } from '../core/timer.js';
import { sessionSummary, categoryStrengths, trend } from '../core/stats.js';
import { planChallenge, summarizeChallenge } from '../core/adaptive.js';
import { GAMES, CATEGORIES, CATEGORY_IDS, gameById, gamesInCategory } from '../games/index.js';
import { h, clear, append } from './dom.js';
import { s } from './svg.js';
import { createAudio } from './audio.js';
import { MAX_IMPORT_BYTES } from '../core/storage.js';
import { createBrainScreens } from './brainScreens.js';
import { TEST_CATEGORIES, unlockedGames } from '../core/brainTest.js';

const RELAXED_ROUNDS = 12;

const fmtMs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(2).replace('.', ',')} sn`);
const fmtPct = (v) => (v == null ? '—' : `%${String(v).replace('.', ',')}`);
const fmtInt = (v) => (v == null ? '—' : Math.round(v).toLocaleString('tr-TR'));

export function createApp({ root, repo, media = globalThis.matchMedia?.bind(globalThis) }) {
  const audio = createAudio(() => repo.settings.sound);
  const screen = root.querySelector('#screen');
  const live = root.querySelector('#live');
  let teardown = null; // aktif ekranın temizlik fonksiyonu

  const announce = (text) => {
    live.textContent = '';
    setTimeout(() => (live.textContent = text), 30);
  };

  const reducedMotion = () => {
    const pref = repo.settings.reducedMotion;
    if (pref === 'on') return true;
    if (pref === 'off') return false;
    return !!media?.('(prefers-reduced-motion: reduce)').matches;
  };

  const hostTheme = document.documentElement.dataset.theme;

  function applySettings() {
    const html = document.documentElement;
    const theme = repo.settings.theme;
    // "Sistem": sayfayı barındıran ortam bir tema seçtiyse ona dokunma
    if (theme === 'auto') {
      if (hostTheme) html.dataset.theme = hostTheme;
      else delete html.dataset.theme;
    } else html.dataset.theme = theme;
    html.classList.toggle('reduce-motion', reducedMotion());
    html.classList.toggle('motion-ok', repo.settings.reducedMotion === 'off');
  }

  function show(build, { focus = true } = {}) {
    if (teardown) teardown();
    teardown = null;
    clear(screen);
    const result = build(screen);
    if (typeof result === 'function') teardown = result;
    if (focus) {
      const heading = screen.querySelector('h1, h2');
      (heading || screen).setAttribute('tabindex', '-1');
      (heading || screen).focus({ preventScroll: false });
    }
    window.scrollTo?.(0, 0);
  }

  // ---------------- Menü ----------------
  function menu() {
    show((el) => {
      const sum = sessionSummary(repo.data.sessions);
      el.append(
        h(
          'section',
          { class: 'hero' },
          h('h1', { class: 'hero-title' }, 'Serbest ', h('span', { class: 'hl' }, 'antrenman')),
          h('p', { class: 'hero-sub' }, `Oyunları tek tek oyna. Bugün ${sum.today} oturum · Son 7 gün ${sum.week} oturum`),
          h(
            'div',
            { class: 'hero-actions' },
            h('button', { type: 'button', class: 'btn btn-primary', id: 'quick-start', onclick: quickStart }, 'Hızlı başlat'),
            h(
              'button',
              { type: 'button', class: 'btn btn-secondary', id: 'challenge-start', onclick: challengeIntro },
              'Uyarlanabilir Mücadele',
            ),
          ),
        ),
      );
      const list = h('section', { class: 'game-list', 'aria-labelledby': 'games-h' }, h('h2', { id: 'games-h', class: 'section-title' }, 'Oyunlar'));
      for (const cat of CATEGORY_IDS) {
        const games = gamesInCategory(cat);
        if (!games.length) continue;
        list.append(
          h(
            'div',
            { class: 'cat' },
            h('h3', { class: 'cat-title' }, CATEGORIES[cat].name),
            games.map((g) => gameRow(g)),
          ),
        );
      }
      el.append(list);
      if (!repo.persistent) {
        el.append(h('p', { class: 'note' }, 'Not: Tarayıcı yerel kaydı engelliyor. Rekorlar bu sekme kapanınca silinir.'));
      }
    }, { focus: false });
  }

  function lockedTestGame(id) {
    const cat = TEST_CATEGORIES.find((c) => c.games.includes(id));
    if (!cat || unlockedGames(cat.id, repo.data.brain.tests).includes(id)) return null;
    return cat.unlockAfter[cat.games.indexOf(id)] - repo.data.brain.tests;
  }

  function gameRow(game) {
    const d = game.definition;
    const rec = repo.data.games[d.id];
    const best = rec?.best;
    const lockedFor = lockedTestGame(d.id);
    if (lockedFor) {
      return h(
        'div',
        { class: 'game-row is-locked', 'aria-disabled': 'true' },
        h('span', { class: 'game-icon', 'aria-hidden': 'true' }, '🔒'),
        h('span', { class: 'game-text' }, h('strong', {}, d.name), h('span', {}, `Beyin Testi'ni ${lockedFor} kez daha bitirince açılır.`)),
        h('span', { class: 'game-best' }, h('small', {}, 'Kilitli')),
      );
    }
    return h(
      'button',
      { type: 'button', class: 'game-row', onclick: () => intro(d.id), 'aria-label': `${d.name}. ${d.description}${best ? ` En iyi skor ${best.score}.` : ''}` },
      h('span', { class: 'game-icon', 'aria-hidden': 'true' }, d.icon),
      h('span', { class: 'game-text' }, h('strong', {}, d.name), h('span', {}, d.description)),
      h('span', { class: 'game-best' }, best ? h('span', {}, h('small', {}, 'Rekor'), fmtInt(best.score)) : h('small', {}, 'Yeni')),
    );
  }

  function quickStart() {
    const today = new Date().setHours(0, 0, 0, 0);
    const playedToday = new Set(repo.data.sessions.filter((x) => x.at >= today).map((x) => x.gameId));
    const fresh = GAMES.filter((g) => !playedToday.has(g.definition.id));
    const pool = (fresh.length ? fresh : GAMES).filter((g) => !lockedTestGame(g.definition.id));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    intro(pick.definition.id);
  }

  // ---------------- Tanıtım ----------------
  function startLevelFor(id) {
    const sl = repo.settings.startLevel;
    if (sl !== 'auto') return sl;
    const rec = repo.data.games[id];
    // Son seviyenin bir altından başla: kısa bir ısınma, sonra uyarlama devreye girer.
    return rec ? Math.max(1, rec.lastLevel - 1) : 1;
  }

  function intro(id, { challenge = null } = {}) {
    const game = gameById(id);
    const d = game.definition;
    const rec = repo.data.games[id];
    const firstTime = !rec?.tutorialSeen;
    const options = { ...repo.getOptions(id) };
    show((el) => {
      const optionEls = (d.options || []).map((opt) => {
        const current = options[opt.id] || opt.default;
        return h(
          'fieldset',
          { class: 'seg' },
          h('legend', {}, opt.label),
          opt.choices.map((c) =>
            h(
              'label',
              { class: 'seg-item' },
              h('input', {
                type: 'radio',
                name: `opt-${opt.id}`,
                id: `opt-${opt.id}-${c.value}`,
                value: c.value,
                checked: c.value === current,
                onchange: () => {
                  options[opt.id] = c.value;
                  repo.setOption(id, opt.id, c.value);
                },
              }),
              h('span', {}, c.label),
            ),
          ),
        );
      });
      const level = challenge ? challenge.step.startLevel : startLevelFor(id);
      el.append(
        h(
          'section',
          { class: 'intro' },
          challenge
            ? h('p', { class: 'eyebrow' }, `Mücadele ${challenge.index + 1}/${challenge.plan.length} · ${challenge.step.categoryName}`)
            : h('p', { class: 'eyebrow' }, CATEGORIES[d.category].name),
          h('h1', { class: 'intro-title' }, h('span', { class: 'game-icon big', 'aria-hidden': 'true' }, d.icon), d.name),
          challenge ? h('p', { class: 'reason' }, `Neden bu oyun: ${challenge.step.reason}`) : null,
          h('ol', { class: 'howto' }, d.howTo.map((line) => h('li', {}, line))),
          optionEls,
          h(
            'dl',
            { class: 'facts' },
            h('div', {}, h('dt', {}, 'Süre'), h('dd', {}, challenge ? `${challenge.step.durationMs / 1000} sn` : repo.settings.relaxed ? `${RELAXED_ROUNDS} tur, süresiz` : `${repo.settings.durationSec} sn`)),
            h('div', {}, h('dt', {}, 'Başlangıç seviyesi'), h('dd', {}, String(level))),
            h('div', {}, h('dt', {}, 'Rekor'), h('dd', {}, rec?.best ? fmtInt(rec.best.score) : '—')),
          ),
          firstTime ? h('p', { class: 'note' }, 'İlk oynayışın: önce puanlanmayan bir alıştırma turu var.') : null,
          h(
            'div',
            { class: 'row-actions' },
            h('button', {
              type: 'button',
              class: 'btn btn-primary',
              id: 'start-game',
              onclick: () => play(id, { options, challenge, practiceRounds: firstTime ? 1 : 0, level }),
            }, 'Başla'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: challenge ? () => abandonChallenge(challenge) : menu }, challenge ? 'Mücadeleyi bırak' : 'Geri'),
          ),
        ),
      );
      const start = el.querySelector('#start-game');
      setTimeout(() => start.focus(), 0);
    });
  }

  // ---------------- Oyun ----------------
  // test: Beyin Testi adımı { durationMs, scoring, bonusEvery, bonusMs, label, onFinish(result), onQuit() }
  function play(id, { options = {}, challenge = null, practiceRounds = 0, level = 1, test = null }) {
    const game = gameById(id);
    const d = game.definition;
    const settings = repo.settings;
    // Sürekli akan oyunlar tur saymaz; bu yüzden "süre baskısı kapalı" modunda da süreli oynanır
    const relaxed = settings.relaxed && !challenge && !test && !d.continuous;
    const seed = settings.seed ? `${settings.seed}:${id}` : `${Date.now()}:${Math.random()}`;
    const rng = createRng(seed);
    const unit = test ? ' g' : '';
    const playClock = createTimer({ durationMs: Infinity, now: () => performance.now() });
    playClock.start();
    const now = () => playClock.elapsed();
    const rec = repo.data.games[id];
    const session = createSession({
      game,
      rng,
      startLevel: level,
      // Beyin Testi'nde oyunlar her zaman kolaydan başlayıp zorlaşır
      adaptive: test ? true : settings.adaptive,
      durationMs: test ? test.durationMs : challenge ? challenge.step.durationMs : relaxed ? Infinity : settings.durationSec * 1000,
      scoring: test?.scoring,
      bonusEvery: test?.bonusEvery || 0,
      bonusMs: test?.bonusMs,
      rounds: RELAXED_ROUNDS,
      practiceRounds,
      options,
      best: rec?.best || null,
      now,
    });

    show((el) => {
      let raf = 0;
      let disposed = false;
      let scheduled = [];
      let keyHandlers = [];
      let roundLimit = null;
      let answered = false;
      let finished = false;

      const hudScore = h('span', { class: 'hud-val', id: 'hud-score' }, '0');
      const hudLevel = h('span', { class: 'hud-val' }, String(level));
      const hudStreak = h('span', { class: 'hud-val' }, '0');
      const timeText = h('span', { class: 'time-text', 'aria-hidden': 'true' }, '');
      const timeFill = h('span', { class: 'time-fill' });
      const roundFill = h('span', { class: 'round-fill' });
      const status = h('p', { class: 'status', 'aria-live': 'polite' }, '');
      const stage = h('div', { class: 'stage', id: 'stage' });
      const feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'assertive' });
      // null/false çocukları atlayan ekleme (yerel append bunları "null" metnine çevirir)
      const fbAppend = (...nodes) => append(feedback, nodes);
      const banner = h('p', { class: 'banner', hidden: true });
      const pauseBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', id: 'pause', onclick: () => togglePause() }, 'Duraklat');
      const pauseLayer = h(
        'div',
        { class: 'pause-layer', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-h' },
        h('h2', { id: 'pause-h' }, 'Duraklatıldı'),
        h('div', { class: 'row-actions' },
          h('button', { type: 'button', class: 'btn btn-primary', id: 'resume', onclick: () => togglePause() }, 'Devam et'),
          h('button', { type: 'button', class: 'btn btn-ghost', id: 'quit', onclick: () => finish(true) }, test ? 'Testi bırak' : 'Oyunu bitir'),
        ),
      );

      el.append(
        h(
          'section',
          { class: 'play', 'aria-label': d.name },
          h(
            'div',
            { class: 'hud' },
            pauseBtn,
            h('span', { class: 'hud-item' }, h('small', {}, 'Seviye'), hudLevel),
            h('span', { class: 'hud-item' }, h('small', {}, 'Seri'), hudStreak),
            h('span', { class: 'hud-item hud-score' }, h('small', {}, test ? 'Gram' : 'Skor'), hudScore),
          ),
          h(
            'div',
            {
              class: `timebar${session.timed ? '' : ' is-rounds'}`,
              role: 'progressbar',
              'aria-label': session.timed ? 'Kalan süre' : 'Tur ilerlemesi',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
            },
            timeFill,
            timeText,
          ),
          h('div', { class: 'roundbar', 'aria-hidden': 'true' }, roundFill),
          banner,
          test ? h('p', { class: 'test-step-label' }, test.label) : null,
          h('h1', { class: 'visually-hidden' }, d.name),
          status,
          stage,
          feedback,
          pauseLayer,
        ),
      );

      const later = (fn, ms) => scheduled.push({ at: now() + ms, fn });

      const onKey = (e) => {
        if (e.key === 'Escape') {
          togglePause();
          e.preventDefault();
          return;
        }
        if (paused) return;
        for (const handler of keyHandlers) {
          if (handler(e)) {
            e.preventDefault();
            return;
          }
        }
      };
      document.addEventListener('keydown', onKey);

      let paused = false;
      function togglePause() {
        if (finished) return;
        paused = !paused;
        if (!paused) {
          session.resume();
          playClock.resume();
          pauseLayer.hidden = true;
          stage.inert = false;
          stage.classList.remove('is-paused');
          pauseBtn.focus();
        } else {
          session.pause();
          playClock.pause();
          pauseLayer.hidden = false;
          stage.inert = true;
          stage.classList.add('is-paused');
          pauseLayer.querySelector('#resume').focus();
        }
      }

      function updateHud() {
        hudScore.textContent = fmtInt(session.score) + unit;
        hudLevel.textContent = String(session.level);
        hudStreak.textContent = String(session.streak);
      }

      function tick() {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const t = now();
        // zamanlanmış işler (duraklatmaya duyarlı saat)
        if (scheduled.length) {
          const due = scheduled.filter((j) => j.at <= t);
          scheduled = scheduled.filter((j) => j.at > t);
          due.forEach((j) => j.fn());
        }
        if (session.timed && !session.practice) {
          const frac = session.timer.fraction();
          timeFill.style.transform = `scaleX(${frac})`;
          const secs = Math.ceil(session.timer.remaining() / 1000);
          timeText.textContent = `${secs} sn`;
          timeFill.parentElement.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
          timeFill.parentElement.classList.toggle('is-low', secs <= 10);
          if (session.timer.expired() && (session.phase === PHASE.AWAITING || session.phase === PHASE.PRESENTING)) {
            finish(false);
            return;
          }
        } else if (!session.timed) {
          const frac = Math.min(1, session.roundNumber / RELAXED_ROUNDS);
          timeFill.style.transform = `scaleX(${frac})`;
          timeText.textContent = `${session.roundNumber}/${RELAXED_ROUNDS}`;
        } else {
          timeText.textContent = 'Alıştırma';
        }
        if (roundLimit) {
          roundFill.style.transform = `scaleX(${roundLimit.timer.fraction()})`;
          if (roundLimit.timer.expired()) {
            const map = roundLimit.map;
            roundLimit = null;
            answer(map ? map() : { timeout: true });
          }
        }
      }

      function newRound() {
        const round = session.nextRound();
        if (!round) finish(false);
        else renderRound(round);
      }

      function renderRound(round) {
        scheduled = [];
        keyHandlers = [];
        roundLimit = null;
        roundFill.style.transform = 'scaleX(0)';
        answered = false;
        feedback.className = 'feedback';
        clear(feedback);
        clear(stage);
        banner.hidden = !session.practice;
        banner.textContent = session.practice ? 'ALIŞTIRMA TURU · puan sayılmaz, süre işlemez' : '';
        updateHud();
        game.render({
          root: stage,
          round,
          level: session.level,
          practice: session.practice,
          relaxed,
          reducedMotion: reducedMotion(),
          answer,
          presented: () => session.phase === PHASE.PRESENTING && session.presented(),
          later,
          onKey: (fn) => keyHandlers.push(fn),
          status: (text) => (status.textContent = text),
          sound: (name) => audio.play(name),
          limit: (ms, map) => {
            roundLimit = { timer: createTimer({ durationMs: ms, now }), map };
            roundLimit.timer.start();
          },
          // sürekli akan oyunlar için
          currentLevel: () => session.level,
          rng,
          now,
          record: recordEvent,
        });
      }

      // Sürekli oyunlarda tek olay: tur bitmez, kısa geri bildirim verilir.
      function recordEvent(input) {
        if (finished || paused || session.phase !== PHASE.AWAITING) return null;
        const res = session.record(input);
        updateHud();
        const ok = res.outcome === OUTCOME.CORRECT;
        if (res.outcome !== OUTCOME.IGNORE) {
          feedback.className = `feedback is-flash ${ok ? 'is-ok' : 'is-bad'}`;
          clear(feedback);
          fbAppend(
            h('span', { class: 'fb-icon', 'aria-hidden': 'true' }, ok ? '✓' : '✕'),
            h('span', { class: 'fb-pts' }, `${res.points >= 0 ? '+' : ''}${res.points}${unit}`),
            !ok && res.explanation ? h('span', { class: 'fb-inline' }, res.explanation) : null,
            res.bonusTime ? h('strong', { class: 'fb-bonus' }, `+${res.bonusTime / 1000} sn ek süre!`) : null,
          );
          audio.play(ok ? 'tick' : 'wrong');
          if (res.bonusTime) audio.play('level');
        }
        if (res.levelChange.changed) announce(`Seviye ${res.levelChange.level}`);
        return res;
      }

      function answer(input) {
        if (answered || finished || paused) return;
        answered = true;
        roundLimit = null;
        const res = session.submit(input);
        updateHud();
        const ok = res.outcome === OUTCOME.CORRECT;
        const ignore = res.outcome === OUTCOME.IGNORE;
        const label = {
          [OUTCOME.CORRECT]: 'Doğru',
          [OUTCOME.WRONG]: 'Yanlış',
          [OUTCOME.FALSE_ALARM]: 'Yanlış alarm',
          [OUTCOME.MISS]: 'Kaçırdın',
          [OUTCOME.TIMEOUT]: 'Süre doldu',
          [OUTCOME.SKIP]: 'Boş geçildi',
        }[res.outcome];
        if (!ignore) {
          feedback.className = `feedback ${ok ? 'is-ok' : 'is-bad'}`;
          clear(feedback);
          fbAppend(
            h('span', { class: 'fb-icon', 'aria-hidden': 'true' }, ok ? '✓' : '✕'),
            h('strong', {}, label),
            res.practice ? h('span', { class: 'fb-pts' }, 'alıştırma') : h('span', { class: 'fb-pts' }, `${res.points >= 0 ? '+' : ''}${res.points}${unit}`),
            res.bonusTime ? h('strong', { class: 'fb-bonus' }, `+${res.bonusTime / 1000} sn ek süre!`) : null,
            res.quickSwitch ? h('span', { class: 'fb-note' }, 'Kural değişimini hemen fark ettin!') : null,
            !ok && res.explanation ? h('span', { class: 'fb-note' }, res.explanation) : null,
          );
          audio.play(ok ? 'correct' : 'wrong');
        }
        if (res.levelChange.changed) {
          const up = res.levelChange.changed > 0;
          const toast = h('span', { class: `fb-level ${up ? 'up' : 'down'}` }, `Seviye ${res.levelChange.level} ${up ? '↑' : '↓'} · ${res.levelChange.reason}`);
          fbAppend(toast);
          if (up) audio.play('level');
          announce(toast.textContent);
        }
        const practiceDone = res.practice && !session.practice;
        if (practiceDone) fbAppend(h('span', { class: 'fb-note' }, 'Alıştırma bitti. Şimdi gerçek oyun başlıyor!'));
        const long = !ok && res.explanation;
        const delay = ignore ? 220 : practiceDone ? 1800 : long ? (res.steps ? 2800 : 1700) : ok ? 520 : 900;
        if (relaxed && long) {
          const cont = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', id: 'continue', onclick: () => newRound() }, 'Devam');
          fbAppend(cont);
          keyHandlers = [(e) => (e.key === 'Enter' ? (cont.click(), true) : false)];
          cont.focus();
        } else {
          later(() => {
            if (!finished) newRound();
          }, delay);
        }
      }

      function finish(quit) {
        if (finished) return;
        finished = true;
        session.end();
        const result = session.result();
        if (test && quit) {
          cleanup();
          test.onQuit();
          return;
        }
        if (quit && result.answered === 0) {
          cleanup();
          if (challenge) abandonChallenge(challenge);
          else intro(id);
          return;
        }
        repo.markTutorialSeen(id);
        const previousBest = repo.recordResult(result, { category: d.category });
        audio.play('end');
        cleanup();
        if (test) test.onFinish(result);
        else if (challenge) challengeNext(challenge, result);
        else resultScreen(result, previousBest);
      }

      function cleanup() {
        disposed = true;
        cancelAnimationFrame(raf);
        document.removeEventListener('keydown', onKey);
      }

      // 3-2-1 geri sayım, sonra ilk tur
      const count = h('div', { class: 'countdown', 'aria-live': 'assertive' });
      stage.append(count);
      const steps = reducedMotion() ? ['Hazır'] : ['3', '2', '1'];
      steps.forEach((txt, i) =>
        later(() => {
          count.textContent = txt;
          audio.play('count');
        }, i * 650),
      );
      later(() => {
        audio.play('start');
        renderRound(session.start());
      }, steps.length * 650);
      raf = requestAnimationFrame(tick);

      return () => {
        if (!finished) {
          finished = true;
          session.end();
        }
        cleanup();
      };
    });
  }

  // ---------------- Sonuç ----------------
  function resultRows(r) {
    return [
      ['Doğruluk', fmtPct(r.accuracy), r.records.accuracy],
      ['Doğru / Yanlış', `${r.counts.correct} / ${r.answered - r.counts.correct}`],
      ['Ort. tepki süresi', fmtMs(r.avgRtMs), r.records.avgRtMs],
      ['Süre', fmtMs(r.durationMs)],
      ['En uzun seri', String(r.bestStreak)],
      ['Ulaşılan seviye', `${r.maxLevel}`],
    ];
  }

  function resultScreen(result, previousBest) {
    const d = gameById(result.gameId).definition;
    show((el) => {
      const isRecord = result.records.score;
      const errors = [
        ['Yanlış', result.counts.wrong],
        ['Yanlış alarm', result.counts.falseAlarm],
        ['Kaçırılan', result.counts.miss],
        ['Süre aşımı', result.counts.timeout],
        ['Boş', result.counts.skip],
      ].filter(([, n]) => n > 0);
      el.append(
        h(
          'section',
          { class: 'result' },
          h('p', { class: 'eyebrow' }, d.name),
          h('h1', { class: 'result-score' }, h('small', {}, 'Skor'), fmtInt(result.score)),
          isRecord
            ? h('p', { class: 'badge badge-record' }, previousBest ? `Yeni rekor! Öncekinden ${fmtInt(result.score - previousBest.score)} fazla.` : 'İlk rekorun!')
            : result.toBest > 0
              ? h('p', { class: 'badge' }, `Rekoruna ${fmtInt(result.toBest)} puan kaldı (${fmtInt(previousBest?.score)}).`)
              : null,
          h(
            'dl',
            { class: 'stat-grid' },
            resultRows(result).map(([k, v, rec]) => h('div', {}, h('dt', {}, k), h('dd', {}, v, rec ? h('span', { class: 'pill' }, 'rekor') : null))),
          ),
          errors.length ? h('p', { class: 'muted' }, `Hata dağılımı: ${errors.map(([k, n]) => `${k} ${n}`).join(' · ')}`) : null,
          h(
            'div',
            { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn btn-primary', id: 'again', onclick: () => intro(result.gameId) }, 'Tekrar oyna'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: menu }, 'Menü'),
          ),
        ),
      );
      setTimeout(() => el.querySelector('#again')?.focus(), 0);
    });
  }

  // ---------------- Uyarlanabilir Mücadele ----------------
  function challengeIntro() {
    const fixed = repo.settings.startLevel === 'auto' ? null : repo.settings.startLevel;
    const plan = planChallenge({
      games: GAMES,
      categories: CATEGORIES,
      data: repo.data,
      rng: createRng(repo.settings.seed ? `${repo.settings.seed}:challenge` : Date.now()),
      adaptive: repo.settings.adaptive,
      fixedLevel: fixed,
    });
    show((el) => {
      el.append(
        h(
          'section',
          { class: 'intro' },
          h('p', { class: 'eyebrow' }, `${plan.length} oyun · her biri ${plan[0].durationMs / 1000} sn`),
          h('h1', { class: 'intro-title' }, 'Uyarlanabilir Mücadele'),
          h(
            'p',
            {},
            repo.settings.adaptive
              ? 'Oyunlar geçmiş sonuçlarına göre seçildi: bir ısınma, gelişime açık alanların ve henüz denemediklerin. Zorluk; doğruluğuna, hızına ve son turlarına göre oyun içinde ayarlanır.'
              : 'Otomatik uyarlama ayarlardan kapalı. Oyunlar rastgele seçildi ve seviye sabit kalır.',
          ),
          h(
            'ol',
            { class: 'plan' },
            plan.map((step) =>
              h('li', {}, h('strong', {}, gameById(step.gameId).definition.name), h('span', { class: 'muted' }, ` · ${step.categoryName} · seviye ${step.startLevel}`), h('span', { class: 'reason' }, step.reason)),
            ),
          ),
          h(
            'div',
            { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn btn-primary', id: 'start-challenge', onclick: () => challengeStep({ plan, index: 0, results: [] }) }, 'Mücadeleyi başlat'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: menu }, 'Geri'),
          ),
        ),
      );
      setTimeout(() => el.querySelector('#start-challenge')?.focus(), 0);
    });
  }

  function challengeStep(state) {
    const step = state.plan[state.index];
    intro(step.gameId, { challenge: { ...state, step } });
  }

  function challengeNext(challenge, result) {
    const results = [...challenge.results, result];
    const index = challenge.index + 1;
    if (index < challenge.plan.length) challengeStep({ plan: challenge.plan, index, results });
    else challengeSummary(challenge.plan, results);
  }

  function abandonChallenge(challenge) {
    if (challenge.results.length) challengeSummary(challenge.plan.slice(0, challenge.results.length), challenge.results);
    else menu();
  }

  function challengeSummary(plan, results) {
    const sum = summarizeChallenge(results);
    show((el) => {
      el.append(
        h(
          'section',
          { class: 'result' },
          h('p', { class: 'eyebrow' }, 'Uyarlanabilir Mücadele'),
          h('h1', { class: 'result-score' }, h('small', {}, 'Toplam skor'), fmtInt(sum.score)),
          h('p', { class: 'muted' }, `Toplam doğruluk ${fmtPct(sum.accuracy)} · ${sum.correct}/${sum.answered} doğru`),
          h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'data' },
              h('thead', {}, h('tr', {}, ['Oyun', 'Skor', 'Doğruluk', 'Seviye', 'Neden seçildi'].map((t) => h('th', { scope: 'col' }, t)))),
              h(
                'tbody',
                {},
                results.map((r, i) =>
                  h(
                    'tr',
                    {},
                    h('th', { scope: 'row' }, gameById(r.gameId).definition.name),
                    h('td', { class: 'num' }, fmtInt(r.score)),
                    h('td', { class: 'num' }, fmtPct(r.accuracy)),
                    h('td', { class: 'num' }, r.level === r.maxLevel ? String(r.level) : `${r.level} (en yüksek ${r.maxLevel})`),
                    h('td', {}, plan[i]?.reason || ''),
                  ),
                ),
              ),
            ),
          ),
          h(
            'div',
            { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn btn-primary', id: 'again', onclick: challengeIntro }, 'Yeni mücadele'),
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: menu }, 'Menü'),
          ),
        ),
      );
    });
  }

  // ---------------- İstatistik ----------------
  function sparkline(values) {
    if (values.length < 2) return h('span', { class: 'muted' }, '—');
    const w = 96;
    const hgt = 28;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, hgt - 3 - (v / max) * (hgt - 6)]);
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    return s(
      'svg',
      { viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, class: 'spark', role: 'img', 'aria-label': `Son ${values.length} skor: ${values.join(', ')}` },
      s('polyline', { points: line, class: 'spark-line', fill: 'none' }),
      s('circle', { cx: last[0], cy: last[1], r: 2.8, class: 'spark-dot' }),
    );
  }

  function weekChart(days) {
    const w = 320;
    const hgt = 120;
    const max = Math.max(...days.map((d) => d.count), 1);
    const bw = (w - 20) / days.length;
    const names = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return s(
      'svg',
      { viewBox: `0 0 ${w} ${hgt}`, class: 'week-chart', role: 'img', 'aria-label': `Son 7 gün oturum sayıları: ${days.map((d) => d.count).join(', ')}` },
      s('line', { x1: 10, x2: w - 10, y1: hgt - 22, y2: hgt - 22, class: 'axis' }),
      days.map((d, i) => {
        const bh = (d.count / max) * (hgt - 46);
        const x = 10 + i * bw + bw * 0.2;
        return s(
          'g',
          {},
          s('rect', { x, y: hgt - 22 - bh, width: bw * 0.6, height: Math.max(bh, d.count ? 2 : 0), rx: 3, class: i === days.length - 1 ? 'bar bar-today' : 'bar' }),
          d.count ? s('text', { x: x + bw * 0.3, y: hgt - 26 - bh, class: 'bar-val', 'text-anchor': 'middle' }, document.createTextNode(String(d.count))) : null,
          s('text', { x: x + bw * 0.3, y: hgt - 6, class: 'bar-label', 'text-anchor': 'middle' }, document.createTextNode(names[new Date(d.dayStart).getDay()])),
        );
      }),
    );
  }

  function brainPanel() {
    const b = repo.data.brain;
    const kg = (v) => (v ? `${Math.round(v).toLocaleString('tr-TR')} g` : '—');
    return h(
      'section',
      { class: 'panel' },
      h('h2', { class: 'section-title' }, 'Beyin Testi'),
      h(
        'dl',
        { class: 'stat-grid' },
        h('div', {}, h('dt', {}, 'Test'), h('dd', {}, String(b.tests))),
        h('div', {}, h('dt', {}, 'Rekor beyin'), h('dd', {}, kg(b.best?.total))),
        TEST_CATEGORIES.map((c) => h('div', {}, h('dt', {}, `${c.name} en iyi`), h('dd', {}, kg(b.catBest[c.id])))),
      ),
      h('div', { class: 'bt-trend' }, h('span', { class: 'muted' }, 'Son testler'), sparkline(b.history.slice(-10).map((x) => x.total))),
    );
  }

  function statsScreen() {
    show((el) => {
      const sum = sessionSummary(repo.data.sessions);
      const strengths = categoryStrengths(repo.data.sessions, CATEGORY_IDS);
      el.append(
        h('h1', { class: 'page-title' }, 'İstatistikler'),
        brainPanel(),
        h(
          'dl',
          { class: 'stat-grid three' },
          h('div', {}, h('dt', {}, 'Bugün'), h('dd', {}, `${sum.today} oturum`)),
          h('div', {}, h('dt', {}, 'Son 7 gün'), h('dd', {}, `${sum.week} oturum`)),
          h('div', {}, h('dt', {}, 'Toplam'), h('dd', {}, `${sum.total} oturum`)),
        ),
        h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, 'Son 7 gün'), weekChart(sum.days)),
        h(
          'section',
          { class: 'panel' },
          h('h2', { class: 'section-title' }, 'Alanlar'),
          h('p', { class: 'muted' }, 'Cevap sayısıyla ağırlıklı doğruluk. En güçlü alan en üstte.'),
          h(
            'ul',
            { class: 'bars' },
            strengths.map((st) =>
              h(
                'li',
                {},
                h('span', { class: 'bar-name' }, CATEGORIES[st.category].name),
                h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: { width: `${st.accuracy ?? 0}%` } })),
                h('span', { class: 'bar-num' }, st.accuracy == null ? 'oynanmadı' : fmtPct(st.accuracy)),
              ),
            ),
          ),
        ),
        h(
          'section',
          { class: 'panel' },
          h('h2', { class: 'section-title' }, 'Oyunlar'),
          h(
            'div',
            { class: 'table-wrap' },
            h(
              'table',
              { class: 'data' },
              h('thead', {}, h('tr', {}, ['Oyun', 'Oynama', 'En iyi skor', 'En iyi doğruluk', 'En iyi tepki', 'Eğilim', 'Son skorlar'].map((t) => h('th', { scope: 'col' }, t)))),
              h(
                'tbody',
                {},
                GAMES.map((g) => {
                  const rec = repo.data.games[g.definition.id];
                  const tr = rec ? trend(rec.history) : null;
                  return h(
                    'tr',
                    {},
                    h('th', { scope: 'row' }, g.definition.name),
                    h('td', { class: 'num' }, String(rec?.plays ?? 0)),
                    h('td', { class: 'num' }, fmtInt(rec?.best?.score)),
                    h('td', { class: 'num' }, fmtPct(rec?.best?.accuracy)),
                    h('td', { class: 'num' }, fmtMs(rec?.best?.avgRtMs)),
                    h('td', { class: 'num' }, tr == null ? '—' : `${tr > 0 ? '▲ +' : tr < 0 ? '▼ ' : ''}${tr}`),
                    h('td', {}, sparkline((rec?.history || []).slice(-10).map((x) => x.score))),
                  );
                }),
              ),
            ),
          ),
        ),
      );
    });
  }

  // ---------------- Ayarlar ----------------
  function settingsScreen() {
    show((el) => {
      const st = repo.settings;
      const update = (patch) => {
        repo.updateSettings(patch);
        applySettings();
      };
      const toggle = (id, label, key, hint) =>
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'switch', for: id },
            h('input', { type: 'checkbox', id, checked: st[key], onchange: (e) => update({ [key]: e.target.checked }) }),
            h('span', {}, label),
          ),
          hint ? h('p', { class: 'hint' }, hint) : null,
        );
      const select = (id, label, key, choices, parse = (v) => v) =>
        h(
          'div',
          { class: 'field' },
          h('label', { for: id }, label),
          h(
            'select',
            { id, onchange: (e) => update({ [key]: parse(e.target.value) }) },
            choices.map(([value, text]) => h('option', { value: String(value), selected: String(st[key]) === String(value) }, text)),
          ),
        );
      const confirmBtn = (id, label, confirmText, action) => {
        const btn = h('button', { type: 'button', class: 'btn btn-ghost btn-danger', id }, label);
        btn.addEventListener('click', () => {
          if (btn.dataset.armed) {
            action();
            return;
          }
          btn.dataset.armed = '1';
          btn.textContent = confirmText;
          setTimeout(() => {
            if (btn.isConnected) {
              delete btn.dataset.armed;
              btn.textContent = label;
            }
          }, 4000);
        });
        return btn;
      };
      const msg = h('p', { class: 'hint', 'aria-live': 'polite', id: 'data-msg' });
      const exportBox = h('textarea', { id: 'export-box', class: 'export-box', rows: 6, readonly: true, hidden: true, 'aria-label': 'Dışa aktarılan veri (JSON)' });
      const fileInput = h('input', { type: 'file', id: 'import-file', accept: 'application/json,.json', class: 'visually-hidden' });
      // İçe aktarma: önce dosya doğrulanır ve özetlenir, mevcut veri ancak onaydan sonra değişir.
      const importConfirm = h('div', { class: 'import-confirm', hidden: true, role: 'group', 'aria-label': 'İçe aktarma onayı' });
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        importConfirm.hidden = true;
        clear(importConfirm);
        if (!file) return;
        try {
          if (file.size > MAX_IMPORT_BYTES) throw new Error('Dosya 1 MB’tan büyük');
          const text = await file.text();
          const preview = repo.previewImport(text);
          importConfirm.append(
            h('p', { class: 'hint' }, `Dosyada ${preview.games} oyun kaydı ve ${preview.sessions} oturum var. İçe aktarırsan şu anki ilerlemen bunlarla değiştirilir.`),
            h(
              'div',
              { class: 'row-actions wrap' },
              h('button', {
                type: 'button',
                class: 'btn btn-primary',
                id: 'import-confirm',
                onclick: () => {
                  repo.importJson(text);
                  applySettings();
                  importConfirm.hidden = true;
                  msg.textContent = 'Veriler içe aktarıldı.';
                },
              }, 'Mevcut verinin yerine yaz'),
              h('button', {
                type: 'button',
                class: 'btn btn-ghost',
                onclick: () => {
                  importConfirm.hidden = true;
                  msg.textContent = 'İçe aktarma iptal edildi. Verilerin değişmedi.';
                },
              }, 'Vazgeç'),
            ),
          );
          importConfirm.hidden = false;
          msg.textContent = '';
          importConfirm.querySelector('#import-confirm').focus();
        } catch (err) {
          msg.textContent = `İçe aktarılamadı: ${err.message}. Bu uygulamadan dışa aktarılmış bir JSON dosyası seç.`;
        }
      });

      el.append(
        h('h1', { class: 'page-title' }, 'Ayarlar'),
        h(
          'section',
          { class: 'panel form' },
          h('h2', { class: 'section-title' }, 'Oyun'),
          select('set-duration', 'Oturum süresi', 'durationSec', [[45, '45 saniye'], [60, '60 saniye'], [90, '90 saniye']], Number),
          toggle('set-relaxed', 'Süre baskısı kapalı', 'relaxed', `Oturumlar ${RELAXED_ROUNDS} tur sürer, geri sayım olmaz. Hafıza Izgarası’nda ezberleme süresini sen bitirirsin. Çift Odak’ta uyaranlar daha uzun kalır.`),
          toggle('set-adaptive', 'Otomatik zorluk', 'adaptive', 'Açıkken seviye; doğruluğuna, tepki süren ve son cevaplarına göre küçük adımlarla değişir. Kapalıyken başlangıç seviyesinde kalır.'),
          select('set-level', 'Başlangıç seviyesi', 'startLevel', [['auto', 'Otomatik (son seviyenin bir altı)'], ...Array.from({ length: 10 }, (_, i) => [i + 1, `Seviye ${i + 1}`])], (v) => (v === 'auto' ? 'auto' : Number(v))),
        ),
        h(
          'section',
          { class: 'panel form' },
          h('h2', { class: 'section-title' }, 'Görünüm ve ses'),
          h('div', { class: 'field' },
            h('label', { for: 'set-name' }, 'Adın'),
            h('input', { type: 'text', id: 'set-name', value: st.name, maxlength: 20, autocomplete: 'given-name', placeholder: 'Testten önce seni adınla karşılar', onchange: (e) => update({ name: e.target.value.trim() }) }),
          ),
          toggle('set-sound', 'Sesler', 'sound'),
          select('set-motion', 'Hareketler', 'reducedMotion', [['auto', 'Sistem ayarına uy'], ['on', 'Azalt'], ['off', 'Normal']]),
          select('set-theme', 'Tema', 'theme', [['auto', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']]),
        ),
        h(
          'section',
          { class: 'panel form' },
          h('h2', { class: 'section-title' }, 'Veriler'),
          h('p', { class: 'hint' }, repo.persistent ? 'Tüm veriler yalnızca bu tarayıcıda saklanır; hiçbir yere gönderilmez.' : 'Bu tarayıcı yerel kaydı engelliyor; veriler sekme kapanınca silinir.'),
          repo.warnings.map((w) => h('p', { class: 'hint warn' }, w)),
          h(
            'div',
            { class: 'row-actions wrap' },
            h('button', {
              type: 'button',
              class: 'btn btn-secondary',
              id: 'export',
              onclick: () => {
                const json = repo.exportJson();
                exportBox.value = json;
                exportBox.hidden = false;
                exportBox.select();
                try {
                  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                  const a = h('a', { href: url, download: 'zihin-molasi-veri.json' });
                  document.body.append(a);
                  a.click();
                  a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  /* indirme engellenmiş olabilir; metin kutusu yedek yoldur */
                }
                navigator.clipboard?.writeText(json).then(
                  () => (msg.textContent = 'Veri indirildi ve panoya kopyalandı. İndirme başlamadıysa aşağıdaki metni kopyala.'),
                  () => (msg.textContent = 'İndirme başlamadıysa aşağıdaki metni seçip kopyala.'),
                );
              },
            }, 'Dışa aktar'),
            h('button', { type: 'button', class: 'btn btn-secondary', id: 'import', onclick: () => fileInput.click() }, 'İçe aktar'),
            confirmBtn('reset-stats', 'İstatistikleri sıfırla', 'Emin misin? Tekrar bas', () => {
              repo.resetStats();
              msg.textContent = 'İstatistikler ve rekorlar sıfırlandı. Ayarlar korundu.';
            }),
            confirmBtn('delete-all', 'Tüm verileri sil', 'Her şey silinecek. Tekrar bas', () => {
              repo.deleteAll();
              applySettings();
              settingsScreen();
            }),
          ),
          fileInput,
          importConfirm,
          msg,
          exportBox,
        ),
        h(
          'section',
          { class: 'panel form' },
          h('h2', { class: 'section-title' }, 'Test'),
          h('div', { class: 'field' },
            h('label', { for: 'set-seed' }, 'Sabit tohum'),
            h('input', { type: 'text', id: 'set-seed', value: st.seed, maxlength: 40, placeholder: 'boş = her oyun farklı', onchange: (e) => update({ seed: e.target.value.trim() }) }),
            h('p', { class: 'hint' }, 'Bir değer girersen aynı oyun her seferinde aynı soruları üretir.'),
          ),
        ),
      );
    });
  }

  const brainScreens = createBrainScreens({ repo, show, play, audio, reducedMotion, openTraining: menu });

  return { menu: brainScreens.home, training: menu, trophies: brainScreens.trophies, intro, statsScreen, settingsScreen, applySettings };
}
