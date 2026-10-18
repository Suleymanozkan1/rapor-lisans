// GameSession: tek bir mini oyun oturumunun durum makinesi. DOM bilmez.
//
// Durumlar:  ready → (start) → playing:presenting → (presented) → playing:awaiting
//            → (submit) → playing:feedback → (nextRound) → ... → ended
// Süreli modda süre dolunca, turlu modda tur sayısı bitince oturum biter.
// Alıştırma turları puanlanmaz, zorluğu etkilemez ve süreyi başlatmaz.

import { createScoreCalculator, buildResult, OUTCOME } from './score.js';
import { createDifficultyController } from './difficulty.js';
import { createTimer } from './timer.js';

export const PHASE = Object.freeze({
  READY: 'ready',
  PRESENTING: 'presenting', // tur gösteriliyor (ör. hafıza ızgarası yanıp sönüyor)
  AWAITING: 'awaiting', // oyuncunun cevabı bekleniyor
  FEEDBACK: 'feedback', // doğru/yanlış gösteriliyor
  PAUSED: 'paused',
  ENDED: 'ended',
});

export function createSession({
  game,
  rng,
  startLevel = 1,
  adaptive = true,
  durationMs = 60000, // Infinity ise turlu mod
  rounds = 12, // turlu modda tur sayısı
  practiceRounds = 0,
  options = {},
  best = null,
  now = () => performance.now(),
  clock = () => Date.now(),
}) {
  const def = game.definition;
  const timed = Number.isFinite(durationMs);
  const timer = createTimer({ durationMs: timed ? durationMs : Infinity, now });
  const score = createScoreCalculator();
  const difficulty = createDifficultyController({ startLevel, adaptive });
  const gameState = game.createState({ rng, options });

  let phase = PHASE.READY;
  let pausedFrom = null;
  let round = null;
  let roundNumber = 0; // puanlanan turlar
  let practiceLeft = practiceRounds;
  let presentedAt = null;
  let startedAtWall = null;
  let lastResult = null;
  const log = [];

  const assertPhase = (...allowed) => {
    if (!allowed.includes(phase)) {
      throw new Error(`Geçersiz geçiş: ${phase} durumunda (beklenen: ${allowed.join(', ')})`);
    }
  };

  const isOver = () => {
    if (phase === PHASE.ENDED) return true;
    if (practiceLeft > 0) return false;
    if (timed) return timer.expired();
    return roundNumber >= rounds;
  };

  const session = {
    get phase() {
      return phase;
    },
    get round() {
      return round;
    },
    get level() {
      return difficulty.level;
    },
    get score() {
      return score.score;
    },
    get streak() {
      return score.streak;
    },
    get roundNumber() {
      return roundNumber;
    },
    get totalRounds() {
      return timed ? null : rounds;
    },
    get practice() {
      return practiceLeft > 0;
    },
    get timed() {
      return timed;
    },
    get lastResult() {
      return lastResult;
    },
    get log() {
      return log;
    },
    timer,
    definition: def,
    gameState,

    start() {
      assertPhase(PHASE.READY);
      startedAtWall = clock();
      if (practiceLeft === 0) timer.start();
      return session.nextRound();
    },

    // Yeni tur üretir. Oturum bittiyse null döner ve ENDED olur.
    nextRound() {
      assertPhase(PHASE.READY, PHASE.FEEDBACK);
      if (isOver()) {
        phase = PHASE.ENDED;
        round = null;
        return null;
      }
      round = game.nextRound(gameState, { rng, level: difficulty.level, practice: practiceLeft > 0 });
      phase = PHASE.PRESENTING;
      presentedAt = null;
      return round;
    },

    // Oyuncunun cevap verebildiği an; tepki süresi buradan ölçülür.
    presented() {
      assertPhase(PHASE.PRESENTING);
      phase = PHASE.AWAITING;
      presentedAt = now();
    },

    // input oyuna özeldir. { timeout: true } tur süresi dolduğunda gönderilir.
    submit(input) {
      assertPhase(PHASE.AWAITING, PHASE.PRESENTING);
      const rtMs = input && Number.isFinite(input.rtMs) ? input.rtMs : presentedAt == null ? null : now() - presentedAt;
      const verdict = game.evaluate(gameState, round, { ...input, rtMs });
      const outcome = verdict.outcome;
      const wasPractice = practiceLeft > 0;
      let scored = { points: 0, applied: 0, breakdown: null };
      let levelChange = { level: difficulty.level, changed: 0, reason: '' };

      if (wasPractice) {
        practiceLeft -= 1;
        if (practiceLeft === 0) timer.start();
      } else {
        const level = difficulty.level;
        scored = score.record({
          outcome,
          level,
          rtMs: verdict.rtMs ?? rtMs,
          targetRtMs: verdict.targetRtMs ?? def.targetRtMs,
          extraBonus: verdict.extraBonus || 0,
        });
        if (outcome !== OUTCOME.IGNORE) {
          roundNumber += 1;
          levelChange = difficulty.record({
            correct: outcome === OUTCOME.CORRECT,
            rtMs: verdict.rtMs ?? rtMs,
            targetRtMs: verdict.targetRtMs ?? def.targetRtMs,
          });
        }
      }

      lastResult = {
        ...verdict,
        outcome,
        rtMs: verdict.rtMs ?? rtMs,
        practice: wasPractice,
        points: scored.applied,
        breakdown: scored.breakdown,
        levelChange,
        round,
      };
      log.push({ key: round?.key, outcome, rtMs: lastResult.rtMs, level: levelChange.level, practice: wasPractice });
      phase = PHASE.FEEDBACK;
      return lastResult;
    },

    pause() {
      if (phase === PHASE.PAUSED || phase === PHASE.ENDED || phase === PHASE.READY) return;
      pausedFrom = phase;
      phase = PHASE.PAUSED;
      timer.pause();
    },

    resume() {
      if (phase !== PHASE.PAUSED) return;
      phase = pausedFrom;
      pausedFrom = null;
      timer.resume();
    },

    isOver,

    // Süre/tur bitmeden oturumu sonlandırır (ör. oyuncu çıkış yaptı).
    end() {
      phase = PHASE.ENDED;
      round = null;
    },

    result() {
      const summary = score.summary();
      return buildResult({
        gameId: def.id,
        summary,
        durationMs: timed ? Math.min(durationMs, timer.elapsed()) : timer.elapsed(),
        startedAt: startedAtWall,
        level: difficulty.level,
        maxLevel: difficulty.maxLevel,
        best,
      });
    },
  };
  return session;
}
