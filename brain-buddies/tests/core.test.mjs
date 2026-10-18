import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRng, createRepeatGuard } from '../src/core/rng.js';
import {
  OUTCOME,
  DEFAULT_SCORING,
  scoreAnswer,
  speedFraction,
  accuracyPercent,
  createScoreCalculator,
  buildResult,
  emptyCounts,
} from '../src/core/score.js';
import { createDifficultyController, MAX_LEVEL, MIN_LEVEL } from '../src/core/difficulty.js';
import { createTimer } from '../src/core/timer.js';
import { dailyCounts, sessionSummary, categoryStrengths, trend } from '../src/core/stats.js';
import { fakeClock } from './helpers.mjs';

// ---------- RNG ----------
test('rng: aynı tohum aynı diziyi üretir', () => {
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const seqA = Array.from({ length: 20 }, () => a.next());
  assert.deepEqual(seqA, Array.from({ length: 20 }, () => b.next()));
  assert.notDeepEqual(seqA, Array.from({ length: 20 }, () => c.next()));
});

test('rng: int sınırları kapsar ve aşmaz', () => {
  const r = createRng('sınır');
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6, 7]);
});

test('rng: shuffle bir permütasyondur, girdiyi değiştirmez', () => {
  const r = createRng(1);
  const list = [1, 2, 3, 4, 5, 6];
  const out = r.shuffle(list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(out.slice().sort(), list);
  assert.throws(() => r.pick([]));
});

test('repeat guard: yakın geçmişteki anahtarı tekrar vermez', () => {
  const r = createRng(5);
  const guard = createRepeatGuard({ memory: 5 });
  const keys = [];
  for (let i = 0; i < 5; i++) keys.push(guard.take(() => r.int(1, 6), (v) => v));
  assert.equal(new Set(keys).size, 5);
});

test('repeat guard: aday havuzu tükenince yine de değer döner (kilitlenmez)', () => {
  const guard = createRepeatGuard({ memory: 10, attempts: 3 });
  guard.take(() => 'x', (v) => v);
  assert.equal(guard.take(() => 'x', (v) => v), 'x');
});

// ---------- Puan ----------
test('puan: doğru cevap seviye çarpanlı taban puan alır', () => {
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 1 }).points, 100);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 5 }).points, 140);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 10 }).points, 190);
  // geçersiz seviye sınırlara çekilir
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 99 }).points, 190);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 0 }).points, 100);
});

test('puan: hız bonusu tabanın %50’sini geçmez ve doğruluğu gölgelemez', () => {
  const fast = scoreAnswer({ outcome: OUTCOME.CORRECT, level: 10, rtMs: 1, targetRtMs: 1000 });
  assert.equal(fast.breakdown.speed, Math.round(190 * DEFAULT_SCORING.speedBonusMax));
  assert.ok(fast.breakdown.speed <= fast.breakdown.base / 2);
  assert.equal(speedFraction(500, 1000), 1);
  assert.equal(speedFraction(1500, 1000), 0);
  assert.equal(speedFraction(1000, 1000), 0.5);
  assert.equal(speedFraction(NaN, 1000), 0);
  assert.equal(speedFraction(100, 0), 0);
});

test('puan: seri bonusu artar ve +50 ile sınırlanır', () => {
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, streak: 0 }).breakdown.streak, 0);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, streak: 3 }).breakdown.streak, 30);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, streak: 50 }).breakdown.streak, 50);
});

test('puan: yanlış, yanlış alarm, kaçırma, zaman aşımı ve boş bırakma ayrı cezalar alır', () => {
  assert.equal(scoreAnswer({ outcome: OUTCOME.WRONG }).points, -25);
  assert.equal(scoreAnswer({ outcome: OUTCOME.FALSE_ALARM }).points, -30);
  assert.equal(scoreAnswer({ outcome: OUTCOME.MISS }).points, -20);
  assert.equal(scoreAnswer({ outcome: OUTCOME.TIMEOUT }).points, -15);
  assert.equal(scoreAnswer({ outcome: OUTCOME.SKIP }).points, 0);
  assert.equal(scoreAnswer({ outcome: OUTCOME.IGNORE }).points, 0);
  assert.throws(() => scoreAnswer({ outcome: 'bilinmeyen' }));
});

test('puan: oyuna özel ek bonus sınırlıdır', () => {
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, extraBonus: 1000 }).breakdown.extra, 50);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, extraBonus: -5 }).breakdown.extra, 0);
});

test('doğruluk: sıfıra bölme güvenli, tek ondalık', () => {
  assert.equal(accuracyPercent(emptyCounts()), 0);
  assert.equal(accuracyPercent({ ...emptyCounts(), correct: 2, wrong: 1 }), 66.7);
  assert.equal(accuracyPercent({ ...emptyCounts(), correct: 1, falseAlarm: 1, miss: 1, timeout: 1 }), 25);
});

test('skor hesaplayıcı: toplam sıfırın altına inmez, seri sıfırlanır, IGNORE seriyi bozmaz', () => {
  const calc = createScoreCalculator();
  calc.record({ outcome: OUTCOME.WRONG, level: 1 });
  assert.equal(calc.score, 0);
  calc.record({ outcome: OUTCOME.CORRECT, level: 1 });
  calc.record({ outcome: OUTCOME.IGNORE, level: 1 });
  const r = calc.record({ outcome: OUTCOME.CORRECT, level: 1 });
  assert.equal(r.streak, 2);
  assert.equal(calc.score, 100 + 110);
  const w = calc.record({ outcome: OUTCOME.WRONG, level: 1 });
  assert.equal(w.applied, -25);
  assert.equal(calc.streak, 0);
  const s = calc.summary();
  assert.equal(s.counts.correct, 2);
  assert.equal(s.counts.wrong, 2);
  assert.equal(s.answered, 4);
  assert.equal(s.accuracy, 50);
  assert.equal(s.bestStreak, 2);
});

test('sonuç: kişisel rekor bayrakları ve rekora kalan fark', () => {
  const summary = { score: 500, accuracy: 80, avgRtMs: 900, answered: 10, counts: emptyCounts(), bestStreak: 3 };
  const first = buildResult({ gameId: 'x', summary, durationMs: 60000, level: 2, maxLevel: 3 });
  assert.deepEqual(first.records, { score: true, accuracy: true, avgRtMs: true });
  const worse = buildResult({ gameId: 'x', summary, durationMs: 60000, level: 2, maxLevel: 3, best: { score: 700, accuracy: 90, avgRtMs: 800 } });
  assert.deepEqual(worse.records, { score: false, accuracy: false, avgRtMs: false });
  assert.equal(worse.toBest, 200);
  const empty = buildResult({ gameId: 'x', summary: { ...summary, score: 0, answered: 0, avgRtMs: null }, durationMs: -5 });
  assert.equal(empty.records.score, false);
  assert.equal(empty.durationMs, 0);
});

// ---------- Zorluk ----------
const good = { correct: true, rtMs: 500, targetRtMs: 1000 };
const bad = { correct: false };

test('zorluk: art arda başarıda kademeli yükselir', () => {
  const d = createDifficultyController({ startLevel: 1 });
  const changes = [];
  for (let i = 0; i < 9; i++) changes.push(d.record(good).changed);
  assert.deepEqual(changes, [0, 0, 1, 0, 0, 1, 0, 0, 1]);
  assert.equal(d.level, 4);
  assert.equal(d.maxLevel, 4);
});

test('zorluk: sık başarısızlıkta düşer, sınırlar korunur', () => {
  const d = createDifficultyController({ startLevel: 3 });
  for (let i = 0; i < 30; i++) d.record(bad);
  assert.equal(d.level, MIN_LEVEL);
  const up = createDifficultyController({ startLevel: 10 });
  for (let i = 0; i < 30; i++) up.record(good);
  assert.equal(up.level, MAX_LEVEL);
});

test('zorluk: yavaş ama doğru cevaplar yükseltmez (tepki süresi de bakılır)', () => {
  const d = createDifficultyController({ startLevel: 2 });
  for (let i = 0; i < 10; i++) d.record({ correct: true, rtMs: 3000, targetRtMs: 1000 });
  assert.equal(d.level, 2);
});

test('zorluk: %50 doğrulukta yükselmez; uyarlama kapalıyken hiç değişmez', () => {
  const d = createDifficultyController({ startLevel: 5 });
  for (let i = 0; i < 12; i++) d.record(i % 2 ? good : { correct: false, rtMs: 900, targetRtMs: 1000 });
  assert.ok(d.level <= 5 && d.level >= MIN_LEVEL);
  assert.equal(d.maxLevel, 5);
  const off = createDifficultyController({ startLevel: 5, adaptive: false });
  for (let i = 0; i < 12; i++) assert.equal(off.record(good).changed, 0);
  assert.equal(off.level, 5);
});

test('zorluk: değişiklik nedeni açıklanır', () => {
  const d = createDifficultyController({ startLevel: 1 });
  d.record(good);
  d.record(good);
  const r = d.record(good);
  assert.equal(r.changed, 1);
  assert.match(r.reason, /doğruluk/);
});

// ---------- Zamanlayıcı ----------
test('zamanlayıcı: geri sayım, duraklatma ve süre dolumu', () => {
  const now = fakeClock();
  const t = createTimer({ durationMs: 1000, now });
  assert.equal(t.remaining(), 1000);
  assert.equal(t.expired(), false);
  t.start();
  now.advance(400);
  assert.equal(t.remaining(), 600);
  t.pause();
  now.advance(5000);
  assert.equal(t.remaining(), 600);
  t.resume();
  now.advance(599);
  assert.equal(t.expired(), false);
  now.advance(1);
  assert.equal(t.expired(), true);
  assert.equal(t.remaining(), 0);
  assert.equal(t.fraction(), 0);
});

test('zamanlayıcı: süresiz mod hiç dolmaz', () => {
  const now = fakeClock();
  const t = createTimer({ durationMs: Infinity, now });
  t.start();
  now.advance(1e9);
  assert.equal(t.expired(), false);
  assert.equal(t.remaining(), Infinity);
  assert.equal(t.elapsed(), 1e9);
});

// ---------- İstatistik ----------
test('istatistik: günlük ve haftalık oturum sayısı', () => {
  const now = new Date(2026, 9, 18, 15, 0).getTime();
  const day = 24 * 3600 * 1000;
  const sessions = [
    { at: now - 1000 },
    { at: now - 2000 },
    { at: now - day },
    { at: now - 6 * day },
    { at: now - 8 * day },
  ];
  const s = sessionSummary(sessions, now);
  assert.equal(s.today, 2);
  assert.equal(s.week, 4);
  assert.equal(s.total, 5);
  assert.equal(dailyCounts(sessions, now).length, 7);
});

test('istatistik: kategori güçlü alanları cevap sayısıyla ağırlıklıdır', () => {
  const list = categoryStrengths(
    [
      { category: 'memory', accuracy: 100, answered: 2 },
      { category: 'memory', accuracy: 50, answered: 8 },
      { category: 'logic', accuracy: 90, answered: 10 },
      { category: 'logic', accuracy: 0, answered: 0 },
    ],
    ['memory', 'logic', 'verbal'],
  );
  assert.deepEqual(list.map((e) => e.category), ['logic', 'memory', 'verbal']);
  assert.equal(list[1].accuracy, 60);
  assert.equal(list[2].accuracy, null);
});

test('istatistik: eğilim son 5 ile önceki 5 oyunu karşılaştırır', () => {
  const history = [100, 100, 100, 100, 100, 200, 200, 200, 200, 200].map((score) => ({ score }));
  assert.equal(trend(history), 100);
  assert.equal(trend([{ score: 1 }]), null);
});
