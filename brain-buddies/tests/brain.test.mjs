import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRng } from '../src/core/rng.js';
import { createSession } from '../src/core/session.js';
import { OUTCOME, scoreAnswer } from '../src/core/score.js';
import {
  TEST_CATEGORIES,
  CATEGORY_IDS,
  scoringFor,
  unlockedGames,
  pickGame,
  newlyUnlocked,
  summarizeTest,
  recordTest,
  defaultBrain,
  TROPHIES,
  BONUS_EVERY,
  BONUS_MS,
} from '../src/core/brainTest.js';
import { createProgressRepository, createMemoryStore, STORAGE_KEY, SCHEMA_VERSION, sanitize } from '../src/core/storage.js';
import { TEST_GAMES, gameById } from '../src/games/index.js';
import * as patternShoot from '../src/games/patternShoot.js';
import * as missingSymbol from '../src/games/missingSymbol.js';
import * as gearWheel from '../src/games/gearWheel.js';
import * as alphaSort from '../src/games/alphaSort.js';
import * as dontDrop from '../src/games/dontDrop.js';
import * as numberHunt from '../src/games/numberHunt.js';
import * as freezeAlien from '../src/games/freezeAlien.js';
import * as bubbles from '../src/games/bubbles.js';
import { fakeClock, correctInput } from './helpers.mjs';

function* rounds(game, seeds = 20, perSeed = 3) {
  for (let level = 1; level <= 10; level++) {
    for (let s = 0; s < seeds; s++) {
      const rng = createRng(`${game.definition.id}-${level}-${s}`);
      const state = game.createState({ rng });
      for (let i = 0; i < perSeed; i++) yield { level, rng, round: game.nextRound(state, { rng, level }) };
    }
  }
}

// ---------- Kategoriler ve oyunlar ----------
test('beyin testi: 4 kategori, her birinde 2 oyun; hepsi kayıtlı ve gram değeri tanımlı', () => {
  assert.deepEqual(CATEGORY_IDS, ['memory', 'logic', 'numeric', 'visual']);
  for (const cat of TEST_CATEGORIES) {
    assert.equal(cat.games.length, 2);
    for (const id of cat.games) {
      const g = gameById(id);
      assert.ok(g, id);
      assert.equal(g.definition.category, cat.id, id);
      assert.ok(g.definition.gramsPerCorrect > 0, id);
    }
  }
  assert.equal(TEST_GAMES.length, 8);
});

test('beyin testi: başlangıçta her kategoride 1 oyun açık; diğerleri test sayısıyla açılır', () => {
  for (const cat of TEST_CATEGORIES) assert.deepEqual(unlockedGames(cat.id, 0), [cat.games[0]]);
  assert.deepEqual(unlockedGames('memory', 2), TEST_CATEGORIES[0].games);
  assert.deepEqual(newlyUnlocked(1, 2), [{ category: 'memory', gameId: 'missingSymbol' }]);
  assert.deepEqual(newlyUnlocked(5, 6), []);
  const rng = createRng(1);
  assert.equal(pickGame('logic', 0, 'alphaSort', rng), 'gearWheel', 'kilitli seçim yok sayılır');
  assert.equal(pickGame('logic', 3, 'alphaSort', rng), 'alphaSort');
  const picks = new Set(Array.from({ length: 40 }, () => pickGame('visual', 9, 'random', rng)));
  assert.deepEqual([...picks].sort(), ['bubbles', 'freezeAlien'], 'rastgele seçim iki oyunu da getirir');
});

test('gram puanlaması: doğru = gram değeri, hata 1,5 katı düşürür, seri bonusu yok', () => {
  const cfg = scoringFor(patternShoot.definition);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 1 }, cfg).points, 110);
  assert.equal(scoreAnswer({ outcome: OUTCOME.CORRECT, level: 1, streak: 9 }, cfg).points, 110);
  assert.equal(scoreAnswer({ outcome: OUTCOME.WRONG }, cfg).points, -165);
  assert.equal(scoreAnswer({ outcome: OUTCOME.MISS }, cfg).points, -110);
  const fast = scoreAnswer({ outcome: OUTCOME.CORRECT, level: 1, rtMs: 1, targetRtMs: 1000 }, cfg);
  assert.equal(fast.breakdown.speed, Math.round(110 * 0.25));
});

test('beyin testi oturumu: art arda 10 doğru ek 5 sn kazandırır; skor gram olarak birikir', () => {
  const now = fakeClock();
  const game = gameById('gearWheel');
  const session = createSession({
    game,
    rng: createRng(4),
    now,
    durationMs: 60000,
    scoring: scoringFor(game.definition),
    bonusEvery: BONUS_EVERY,
    bonusMs: BONUS_MS,
  });
  let round = session.start();
  let bonus = 0;
  for (let i = 0; i < 20; i++) {
    session.presented();
    now.advance(2000);
    bonus += session.submit(correctInput('gearWheel', round)).bonusTime;
    round = session.nextRound();
  }
  assert.equal(bonus, 2 * BONUS_MS);
  assert.equal(session.bonusTotal, 2 * BONUS_MS);
  assert.equal(session.timer.durationMs, 70000);
  assert.ok(session.score > 20 * 85, 'seviye ve hız bonuslarıyla gram artar');
});

test('sürekli oyun: record() turu bitirmeden olay puanlar', () => {
  const now = fakeClock();
  const game = gameById('dontDrop');
  const session = createSession({ game, rng: createRng(1), now, durationMs: 60000, scoring: scoringFor(game.definition) });
  session.start();
  session.presented();
  session.record({ kind: 'pop', rtMs: 1500 });
  session.record({ kind: 'pop', rtMs: 1500 });
  session.record({ kind: 'drop' });
  assert.equal(session.phase, 'awaiting');
  const r = session.result();
  assert.equal(r.counts.correct, 2);
  assert.equal(r.counts.miss, 1);
});

// ---------- Özet, rekor ve kupalar ----------
const step = (category, score, counts = {}, bestStreak = 0) => ({
  category,
  gameId: 'x',
  result: { score, bestStreak, counts: { correct: 10, wrong: 0, falseAlarm: 0, miss: 0, timeout: 0, skip: 0, ...counts } },
});

test('test özeti: toplam = dört kategorinin gramı; eksik test kaydedilmez', () => {
  const sum = summarizeTest([step('memory', 1057), step('logic', 926), step('numeric', 1151), step('visual', 938, { wrong: 2 })]);
  assert.equal(sum.total, 4072); // forumda bildirilen örnek dağılım
  assert.equal(sum.errors, 2);
  assert.equal(sum.complete, true);
  const brain = defaultBrain();
  const partial = summarizeTest([step('memory', 900)]);
  assert.equal(recordTest(brain, partial).isRecord, false);
  assert.equal(brain.tests, 0);
});

test('rekor yalnızca toplam rekor geçilince güncellenir; kategori rekorları ayrı tutulur', () => {
  const brain = defaultBrain();
  const a = summarizeTest([step('memory', 1000), step('logic', 1000), step('numeric', 1000), step('visual', 1000)]);
  const r1 = recordTest(brain, a, 1);
  assert.equal(r1.isRecord, true);
  const b = summarizeTest([step('memory', 1500), step('logic', 500), step('numeric', 500), step('visual', 500)]);
  const r2 = recordTest(brain, b, 2);
  assert.equal(r2.isRecord, false);
  assert.equal(brain.best.total, 4000);
  assert.equal(brain.best.cats.memory, 1000, 'rekor kaydı rekor testin dağılımını tutar');
  assert.equal(brain.catBest.memory, 1500);
  assert.equal(brain.history.length, 2);
  assert.equal(brain.tests, 2);
  assert.deepEqual(r2.unlocked, [{ category: 'memory', gameId: 'missingSymbol' }]);
});

test('kupalar: koşul sağlanınca bir kez verilir', () => {
  const brain = defaultBrain();
  const t = summarizeTest([step('memory', 1100), step('logic', 1000), step('numeric', 1200), step('visual', 1000, {}, 21)]);
  const r = recordTest(brain, t, 5);
  const ids = r.newTrophies.map((x) => x.id).sort();
  assert.deepEqual(ids, ['all1000', 'first', 'flawless2500', 'g3000', 'g4000', 'streak20']);
  assert.deepEqual(recordTest(brain, t, 6).newTrophies.map((x) => x.id), []);
  assert.equal(TROPHIES.length, 8);
});

test('kayıt: v1 kaydı v2’ye dönüştürülür; beyin testi kaydı korunur ve temizlenir', () => {
  const store = createMemoryStore();
  store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: { sound: false }, games: {}, sessions: [], options: {} }));
  const repo = createProgressRepository(store);
  assert.equal(repo.data.version, SCHEMA_VERSION);
  assert.equal(repo.settings.sound, false);
  assert.equal(repo.data.brain.tests, 0);
  const r = repo.recordBrainTest(summarizeTest([step('memory', 900), step('logic', 900), step('numeric', 900), step('visual', 900)]));
  assert.equal(r.isRecord, true);
  const again = createProgressRepository(store);
  assert.equal(again.data.brain.best.total, 3600);
  again.setBrainChoice('memory', 'missingSymbol');
  again.setBrainChoice('logic', 'bilinmeyen');
  assert.equal(again.data.brain.choice.memory, 'missingSymbol');
  assert.equal(again.data.brain.choice.logic, 'random');
  const dirty = sanitize({ brain: { tests: -5, best: { total: 1e9, cats: { memory: -3 } }, trophies: { first: 1, sahte: 2 }, history: [{ at: 1, total: 5 }, 'x'] } });
  assert.equal(dirty.brain.tests, 0);
  assert.equal(dirty.brain.best.total, 40000);
  assert.equal(dirty.brain.best.cats.memory, 0);
  assert.deepEqual(Object.keys(dirty.brain.trophies), ['first']);
  assert.equal(dirty.brain.history.length, 1);
});

// ---------- Oyunlara özel tek-cevap doğrulamaları ----------
test('Deseni Vur: hedef kareler tekil, nesneler farklı; kısmi seçim kontrolü', () => {
  for (const { level, round } of rounds(patternShoot)) {
    const cfg = patternShoot.levelConfig(level);
    assert.equal(round.cells.length, cfg.count);
    assert.equal(new Set(round.cells).size, cfg.count);
    assert.equal(new Set(round.objects).size, cfg.count);
  }
  const r = { cells: [1, 5, 9] };
  assert.equal(patternShoot.checkPicks(r, [5]), 'continue');
  assert.equal(patternShoot.checkPicks(r, [9, 1, 5]), 'correct');
  assert.equal(patternShoot.checkPicks(r, [2]), 'wrong');
});

test('Kayıp Sembol: seçeneklerden yalnızca biri ilk grupta vardı ve ikinci grupta yok', () => {
  for (const { round } of rounds(missingSymbol)) {
    assert.equal(round.remaining.length, round.shown.length - 1);
    assert.ok(!round.remaining.includes(round.missing));
    const inFirst = round.options.filter((o) => round.shown.includes(o));
    assert.deepEqual(inFirst, [round.missing]);
    assert.equal(round.options[round.answer], round.missing);
    assert.equal(new Set(round.options).size, 4);
  }
});

test('Dişli Çark: iki dişli aynı (döndürülmüş), biri farklı', () => {
  for (const { round } of rounds(gearWheel)) {
    const forms = round.gears.map((g) => gearWheel.canonical(g.bits));
    const odd = forms.filter((f, i) => forms.indexOf(f) === i && forms.lastIndexOf(f) === i);
    assert.equal(odd.length, 1);
    assert.equal(forms.indexOf(odd[0]), round.answer);
  }
});

test('ABC Sırala: Türk alfabesi sırası; harfler tekil', () => {
  assert.deepEqual(alphaSort.sortTr(['Ş', 'S', 'Ç', 'C', 'İ', 'I']), ['C', 'Ç', 'I', 'İ', 'S', 'Ş']);
  for (const { round } of rounds(alphaSort)) {
    assert.equal(new Set(round.letters).size, round.letters.length);
    assert.equal(new Set(round.slots).size, round.slots.length);
    assert.deepEqual(round.order, alphaSort.sortTr(round.letters));
  }
});

test('Düşürme!: ekrandaki cevaplar birbirinin öneki olmaz; girdi eşleşmesi', () => {
  for (let level = 1; level <= 10; level++) {
    const rng = createRng(`dd-${level}`);
    const onScreen = [];
    for (let i = 0; i < 6; i++) {
      const b = dontDrop.makeBall(rng, level, onScreen);
      if (!b) continue;
      assert.ok(Number.isInteger(b.value) && b.value >= 0);
      assert.ok(!onScreen.some((v) => dontDrop.conflicts(v, b.value)));
      onScreen.push(b.value);
    }
  }
  assert.deepEqual(dontDrop.matchInput([12, 7], '1'), { status: 'partial' });
  assert.deepEqual(dontDrop.matchInput([12, 7], '12'), { status: 'pop', index: 0 });
  assert.deepEqual(dontDrop.matchInput([12, 7], '9'), { status: 'wrong' });
  assert.ok(dontDrop.levelConfig(10).fallMs < dontDrop.levelConfig(1).fallMs);
});

test('Sayı Avı: hedefe ulaşan tek bir sayı grubu var', () => {
  let fallbacks = 0;
  for (const { round } of rounds(numberHunt)) {
    if (round.key === 'fallback') fallbacks += 1;
    const all = numberHunt.subsetsWithSum(round.numbers, round.target);
    assert.equal(all.length, 1, round.key);
    assert.deepEqual(all[0], round.solution);
    assert.equal(numberHunt.checkPicks(round, round.solution), 'correct');
  }
  assert.ok(fallbacks < 30, `yedek soru sayısı ${fallbacks}`);
});

test('Uzaylıyı Dondur: hedef bayrağı nesneyle tutarlı; hedef oranı makul', () => {
  const rng = createRng('fa');
  let targets = 0;
  for (let i = 0; i < 1000; i++) {
    const level = 1 + (i % 10);
    const target = freezeAlien.pickTarget(rng, level);
    const a = freezeAlien.makeAlien(rng, level, target);
    assert.equal(a.object === target, a.isTarget);
    if (a.isTarget) targets += 1;
  }
  assert.ok(targets > 330 && targets < 470, `${targets}`);
  assert.notEqual(freezeAlien.pickTarget(createRng(2), 1, 'butterfly'), 'butterfly');
});

test('Baloncuklar: boyutlar seviye farkıyla ayrışık, sıra küçükten büyüğe', () => {
  for (const { level, round } of rounds(bubbles)) {
    const sizes = round.order.map((i) => round.bubbles[i].r);
    for (let i = 1; i < sizes.length; i++) {
      assert.ok(sizes[i] / sizes[i - 1] >= 1 + bubbles.levelConfig(level).minStep - 0.02, `${sizes}`);
    }
    for (const b of round.bubbles) assert.ok(b.x - b.r >= -0.01 && b.x + b.r <= 100.01 && b.y + b.r <= 70.01);
  }
});
