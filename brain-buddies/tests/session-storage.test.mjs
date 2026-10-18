import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSession, PHASE } from '../src/core/session.js';
import { createRng } from '../src/core/rng.js';
import {
  createProgressRepository,
  createMemoryStore,
  STORAGE_KEY,
  SCHEMA_VERSION,
  migrate,
  sanitize,
  DEFAULT_SETTINGS,
} from '../src/core/storage.js';
import { planChallenge, summarizeChallenge } from '../src/core/adaptive.js';
import { GAMES, CATEGORIES, gameById } from '../src/games/index.js';
import * as mentalMath from '../src/games/mentalMath.js';
import { fakeClock, correctInput, wrongInput } from './helpers.mjs';

const makeSession = (opts = {}) => {
  const now = fakeClock();
  const session = createSession({ game: mentalMath, rng: createRng(7), now, clock: () => 1e12, ...opts, ...(opts.now ? {} : { now }) });
  return { session, now: opts.now || now };
};

// ---------- Oturum durum makinesi ----------
test('oturum: başlangıç → tur → cevap → geri bildirim → sonraki tur', () => {
  const { session, now } = makeSession();
  assert.equal(session.phase, PHASE.READY);
  const round = session.start();
  assert.ok(round);
  assert.equal(session.phase, PHASE.PRESENTING);
  session.presented();
  assert.equal(session.phase, PHASE.AWAITING);
  now.advance(800);
  const r = session.submit(correctInput('mentalMath', round));
  assert.equal(r.outcome, 'correct');
  assert.equal(r.rtMs, 800);
  assert.ok(r.points > 100); // hız bonusu dahil
  assert.equal(session.phase, PHASE.FEEDBACK);
  assert.ok(session.nextRound());
  assert.equal(session.roundNumber, 1);
});

test('oturum: geçersiz geçişler hata verir', () => {
  const { session } = makeSession();
  assert.throws(() => session.submit({ choice: 0 }), /Geçersiz geçiş/);
  assert.throws(() => session.presented(), /Geçersiz geçiş/);
  session.start();
  assert.throws(() => session.start(), /Geçersiz geçiş/);
  assert.throws(() => session.nextRound(), /Geçersiz geçiş/);
});

test('oturum: süre dolunca biter ve sonuç üretir', () => {
  const { session, now } = makeSession({ durationMs: 10000 });
  let round = session.start();
  let answered = 0;
  while (round) {
    session.presented();
    now.advance(1500);
    session.submit(answered % 3 === 2 ? wrongInput('mentalMath', round) : correctInput('mentalMath', round));
    answered += 1;
    round = session.nextRound();
  }
  assert.equal(session.phase, PHASE.ENDED);
  const res = session.result();
  assert.equal(res.answered, answered);
  assert.equal(res.durationMs, 10000);
  const wrong = Math.floor(answered / 3);
  assert.equal(answered, 7);
  assert.equal(res.accuracy, Math.round(((answered - wrong) / answered) * 1000) / 10);
  assert.equal(res.counts.correct + res.counts.wrong, answered);
  assert.equal(res.gameId, 'mentalMath');
  assert.equal(res.startedAt, 1e12);
});

test('oturum: turlu (süresiz) mod tur sayısında biter', () => {
  const { session, now } = makeSession({ durationMs: Infinity, rounds: 5 });
  let round = session.start();
  let count = 0;
  while (round) {
    session.presented();
    now.advance(60000); // süre baskısı yok
    session.submit(correctInput('mentalMath', round));
    count += 1;
    round = session.nextRound();
  }
  assert.equal(count, 5);
  assert.equal(session.totalRounds, 5);
});

test('oturum: alıştırma turu puanlanmaz ve süreyi başlatmaz', () => {
  const { session, now } = makeSession({ durationMs: 5000, practiceRounds: 1 });
  const round = session.start();
  assert.equal(session.practice, true);
  session.presented();
  now.advance(20000);
  const r = session.submit(correctInput('mentalMath', round));
  assert.equal(r.practice, true);
  assert.equal(r.points, 0);
  assert.equal(session.score, 0);
  assert.equal(session.timer.remaining(), 5000);
  assert.ok(session.nextRound(), 'alıştırmadan sonra oturum sürer');
  assert.equal(session.practice, false);
});

test('oturum: duraklatma süreyi dondurur; end() oturumu kapatır', () => {
  const { session, now } = makeSession({ durationMs: 5000 });
  session.start();
  now.advance(1000);
  session.pause();
  assert.equal(session.phase, PHASE.PAUSED);
  now.advance(100000);
  session.resume();
  assert.equal(session.phase, PHASE.PRESENTING);
  assert.equal(session.timer.remaining(), 4000);
  session.end();
  assert.equal(session.phase, PHASE.ENDED);
  assert.equal(session.isOver(), true);
});

test('oturum: art arda doğrularla seviye yükselir, sonuçta en yüksek seviye görünür', () => {
  const { session, now } = makeSession({ durationMs: Infinity, rounds: 9 });
  let round = session.start();
  while (round) {
    session.presented();
    now.advance(500);
    session.submit(correctInput('mentalMath', round));
    round = session.nextRound();
  }
  const res = session.result();
  assert.equal(res.maxLevel, 4);
  assert.equal(res.accuracy, 100);
  assert.equal(res.bestStreak, 9);
});

// ---------- Kayıt sistemi ----------
const sampleResult = (over = {}) => ({
  gameId: 'mentalMath',
  startedAt: Date.now(),
  durationMs: 60000,
  level: 3,
  maxLevel: 4,
  score: 900,
  answered: 12,
  accuracy: 83.3,
  avgRtMs: 1200,
  counts: { correct: 10, wrong: 2, falseAlarm: 0, miss: 0, timeout: 0, skip: 0 },
  ...over,
});

test('kayıt: kaydet → yeniden aç → aynı veri', () => {
  const store = createMemoryStore();
  const repo = createProgressRepository(store);
  repo.updateSettings({ sound: false, durationSec: 90 });
  repo.recordResult(sampleResult(), { category: 'numeric' });
  const reopened = createProgressRepository(store);
  assert.equal(reopened.settings.sound, false);
  assert.equal(reopened.settings.durationSec, 90);
  assert.equal(reopened.data.games.mentalMath.plays, 1);
  assert.deepEqual(reopened.data.games.mentalMath.best, { score: 900, accuracy: 83.3, avgRtMs: 1200 });
  assert.equal(reopened.data.sessions.length, 1);
  assert.equal(reopened.data.version, SCHEMA_VERSION);
});

test('kayıt: rekorlar ayrı ayrı güncellenir (skor ↑, doğruluk ↑, süre ↓)', () => {
  const repo = createProgressRepository();
  repo.recordResult(sampleResult());
  const prev = repo.recordResult(sampleResult({ score: 500, accuracy: 95, avgRtMs: 1500 }));
  assert.deepEqual(prev, { score: 900, accuracy: 83.3, avgRtMs: 1200 });
  assert.deepEqual(repo.data.games.mentalMath.best, { score: 900, accuracy: 95, avgRtMs: 1200 });
  repo.recordResult(sampleResult({ score: 100, accuracy: 10, avgRtMs: 700 }));
  assert.equal(repo.data.games.mentalMath.best.avgRtMs, 700);
});

test('kayıt: hiç cevap verilmeyen oturum rekor yazmaz', () => {
  const repo = createProgressRepository();
  repo.recordResult(sampleResult({ answered: 0, score: 0, accuracy: 0, avgRtMs: null }));
  assert.equal(repo.data.games.mentalMath.best, null);
  assert.equal(repo.data.games.mentalMath.plays, 1);
});

test('kayıt: bozuk JSON yedeklenir ve varsayılana dönülür', () => {
  const store = createMemoryStore();
  store.setItem(STORAGE_KEY, '{bozuk json');
  const repo = createProgressRepository(store);
  assert.equal(repo.warnings.length, 1);
  assert.equal(store.getItem(`${STORAGE_KEY}:bozuk`), '{bozuk json');
  assert.deepEqual(repo.settings, DEFAULT_SETTINGS);
  assert.ok(JSON.parse(store.getItem(STORAGE_KEY)).version === SCHEMA_VERSION);
});

test('kayıt: gelecekteki sürüm veya nesne olmayan veri güvenle ele alınır', () => {
  for (const raw of ['[1,2]', '"metin"', JSON.stringify({ version: 999 })]) {
    const store = createMemoryStore();
    store.setItem(STORAGE_KEY, raw);
    const repo = createProgressRepository(store);
    assert.equal(repo.warnings.length, 1, raw);
    assert.equal(repo.data.version, SCHEMA_VERSION);
  }
});

test('kayıt: sürümsüz (v0) eski kayıt v1’e dönüştürülür', () => {
  const store = createMemoryStore();
  store.setItem(STORAGE_KEY, JSON.stringify({ settings: { sound: false }, bestScores: { quickMatch: 1234, kötü: 'x' } }));
  const repo = createProgressRepository(store);
  assert.equal(repo.warnings.length, 0);
  assert.equal(repo.settings.sound, false);
  assert.equal(repo.data.games.quickMatch.best.score, 1234);
  assert.equal(repo.data.games['kötü'], undefined);
});

test('kayıt: sanitize yanlış türleri ve sınır dışı değerleri düzeltir', () => {
  const clean = sanitize({
    settings: { sound: 'evet', durationSec: 999, startLevel: 42, theme: 'neon', seed: 'x'.repeat(100) },
    games: { mentalMath: { plays: -3, lastLevel: 50, history: [{ at: 1, score: 5 }, { bozuk: true }] }, '<script>': {} },
    sessions: [{ at: 1, gameId: 'mentalMath', score: 5 }, null, 'x'],
  });
  assert.equal(clean.settings.sound, true);
  assert.equal(clean.settings.durationSec, 60);
  assert.equal(clean.settings.startLevel, 10);
  assert.equal(clean.settings.theme, 'auto');
  assert.equal(clean.settings.seed.length, 40);
  assert.equal(clean.games.mentalMath.plays, 0);
  assert.equal(clean.games.mentalMath.lastLevel, 10);
  assert.equal(clean.games.mentalMath.history.length, 1);
  assert.equal(clean.games['<script>'], undefined);
  assert.equal(clean.sessions.length, 1);
});

test('kayıt: dışa aktar → içe aktar, sıfırla, tümünü sil', () => {
  const repo = createProgressRepository();
  repo.recordResult(sampleResult());
  const json = repo.exportJson();
  const other = createProgressRepository();
  other.importJson(json);
  assert.equal(other.data.games.mentalMath.plays, 1);
  assert.throws(() => other.importJson('[]'));
  other.updateSettings({ sound: false });
  other.resetStats();
  assert.deepEqual(other.data.games, {});
  assert.equal(other.settings.sound, false, 'sıfırlama ayarları korur');
  const store = createMemoryStore();
  const third = createProgressRepository(store);
  third.recordResult(sampleResult());
  third.deleteAll();
  assert.equal(store.getItem(STORAGE_KEY), null);
});

test('kayıt: migrate() bilinmeyen ara sürümde hata verir', () => {
  assert.throws(() => migrate({ version: -1 }));
});

// ---------- Uyarlanabilir Mücadele ----------
test('uyarlanabilir mod: farklı kategoriler, zayıf alanlar dahil, her seçimin nedeni var', () => {
  const repo = createProgressRepository();
  const add = (gameId, category, accuracy) =>
    repo.recordResult(sampleResult({ gameId, accuracy, answered: 10 }), { category });
  add('memoryGrid', 'memory', 40);
  add('logicCircuit', 'logic', 55);
  add('mentalMath', 'numeric', 95);
  add('quickMatch', 'match', 80);
  const plan = planChallenge({ games: GAMES, categories: CATEGORIES, data: repo.data, rng: createRng(3) });
  assert.equal(plan.length, 5);
  assert.equal(new Set(plan.map((p) => p.category)).size, 5);
  assert.equal(plan[0].category, 'numeric', 'ısınma: en güçlü alan');
  const cats = plan.map((p) => p.category);
  assert.ok(cats.includes('memory') && cats.includes('logic'), 'en zayıf iki alan seçilir');
  for (const step of plan) {
    assert.ok(step.reason.length > 5);
    assert.ok(gameById(step.gameId));
    assert.equal(gameById(step.gameId).definition.category, step.category);
  }
});

test('uyarlanabilir mod: uyarlama kapalıyken rastgele seçer ve bunu söyler', () => {
  const repo = createProgressRepository();
  const plan = planChallenge({ games: GAMES, categories: CATEGORIES, data: repo.data, rng: createRng(4), adaptive: false, fixedLevel: 3 });
  assert.equal(plan.length, 5);
  assert.equal(new Set(plan.map((p) => p.category)).size, 5);
  assert.ok(plan.every((p) => p.startLevel === 3 && /kapalı/.test(p.reason)));
});

test('uyarlanabilir mod: hiç veri yokken de plan üretir; özet doğru toplanır', () => {
  const repo = createProgressRepository();
  const plan = planChallenge({ games: GAMES, categories: CATEGORIES, data: repo.data, rng: createRng(1) });
  assert.equal(plan.length, 5);
  const sum = summarizeChallenge([
    { score: 100, answered: 4, counts: { correct: 3 } },
    { score: 50, answered: 0, counts: { correct: 0 } },
  ]);
  assert.deepEqual([sum.score, sum.answered, sum.correct, sum.accuracy], [150, 4, 3, 75]);
  assert.equal(summarizeChallenge([]).accuracy, 0);
});
