import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRng } from '../src/core/rng.js';
import { createSession } from '../src/core/session.js';
import { OUTCOME } from '../src/core/score.js';
import { GAMES, CATEGORIES } from '../src/games/index.js';
import * as memoryGrid from '../src/games/memoryGrid.js';
import * as quickMatch from '../src/games/quickMatch.js';
import * as mentalMath from '../src/games/mentalMath.js';
import * as dualFocus from '../src/games/dualFocus.js';
import * as patternShift from '../src/games/patternShift.js';
import * as logicCircuit from '../src/games/logicCircuit.js';
import * as seq from '../src/games/sequenceDetective.js';
import * as wordSort from '../src/games/wordSort.js';
import * as rotation from '../src/games/mentalRotation.js';
import { fakeClock, correctInput, wrongInput } from './helpers.mjs';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SEEDS = 25;

function* rounds(game, { seeds = SEEDS, perSeed = 4, options = {} } = {}) {
  for (const level of LEVELS) {
    for (let s = 0; s < seeds; s++) {
      const rng = createRng(`${game.definition.id}-${level}-${s}`);
      const state = game.createState({ rng, options });
      for (let i = 0; i < perSeed; i++) yield { level, rng, state, round: game.nextRound(state, { rng, level }) };
    }
  }
}

// ---------- Ortak arayüz ----------
test('kayıt: tüm oyunlar ortak arayüzü uygular, kimlikler tekil, kategoriler tanımlı', () => {
  const ids = new Set();
  for (const g of GAMES) {
    const d = g.definition;
    assert.ok(d.id && d.name && d.description && d.icon, d.id);
    assert.ok(Array.isArray(d.howTo) && d.howTo.length >= 2, `${d.id} howTo`);
    assert.ok(Number.isFinite(d.targetRtMs) && d.targetRtMs > 0, `${d.id} targetRtMs`);
    assert.ok(d.category in CATEGORIES, `${d.id} kategori`);
    for (const fn of ['createState', 'nextRound', 'evaluate', 'render']) assert.equal(typeof g[fn], 'function', `${d.id}.${fn}`);
    assert.ok(!ids.has(d.id));
    ids.add(d.id);
  }
  // 7.1'deki sekiz kategorinin her biri en az bir oyunla temsil edilir
  for (const cat of Object.keys(CATEGORIES)) assert.ok(GAMES.some((g) => g.definition.category === cat), cat);
});

test('tüm oyunlar: her seviyede doğru cevap CORRECT, yanlış cevap ceza alan bir sonuç verir', () => {
  for (const game of GAMES) {
    const id = game.definition.id;
    for (const { state, round } of rounds(game, { seeds: 6, perSeed: 3 })) {
      assert.ok(typeof round.key === 'string' && round.key.length, `${id} key`);
      // evaluate durum değiştirebilir (ör. Değişen Örüntü); kopyayla deneriz
      const ok = game.evaluate(structuredClone(state.guard ? { ...state, guard: null } : state), round, correctInput(id, round));
      if (id === 'dualFocus' && !round.target) assert.equal(ok.outcome, OUTCOME.IGNORE);
      else assert.equal(ok.outcome, OUTCOME.CORRECT, `${id}: ${round.key}`);
      const bad = game.evaluate(structuredClone(state.guard ? { ...state, guard: null } : state), round, wrongInput(id, round));
      assert.ok([OUTCOME.WRONG, OUTCOME.FALSE_ALARM, OUTCOME.MISS].includes(bad.outcome), `${id}: ${bad.outcome}`);
      const late = game.evaluate(structuredClone(state.guard ? { ...state, guard: null } : state), round, { timeout: true });
      assert.ok([OUTCOME.TIMEOUT, OUTCOME.MISS, OUTCOME.IGNORE].includes(late.outcome), `${id}: zaman aşımı`);
    }
  }
});

test('tüm oyunlar: aynı tohum aynı soruları üretir (deterministik)', () => {
  for (const game of GAMES) {
    const run = () => {
      const rng = createRng('sabit');
      const state = game.createState({ rng });
      return Array.from({ length: 8 }, (_, i) => game.nextRound(state, { rng, level: 1 + (i % 10) }).key);
    };
    assert.deepEqual(run(), run(), game.definition.id);
  }
});

test('tüm oyunlar: aynı oturumda sorular sürekli yinelenmez', () => {
  for (const game of GAMES) {
    if (game === dualFocus) continue; // akış oyunu: uyaranların tekrarı doğası gereği serbest
    const rng = createRng('tekrar');
    const state = game.createState({ rng });
    const keys = Array.from({ length: 12 }, () => game.nextRound(state, { rng, level: 5 }).key);
    assert.equal(new Set(keys).size, keys.length, game.definition.id);
  }
});

test('tüm oyunlar: tam bir oturum her seviyede sorunsuz biter', () => {
  for (const game of GAMES) {
    const now = fakeClock();
    const session = createSession({ game, rng: createRng(9), now, durationMs: Infinity, rounds: 30, startLevel: 1 });
    let round = session.start();
    let guard = 0;
    while (round && guard++ < 500) {
      session.presented();
      now.advance(300);
      session.submit(correctInput(game.definition.id, round));
      round = session.nextRound();
    }
    const res = session.result();
    assert.equal(res.accuracy, 100, game.definition.id);
    assert.ok(res.maxLevel >= 5, `${game.definition.id} seviye ${res.maxLevel}`);
  }
});

// ---------- Oyuna özel doğrulamalar ----------
test('Hafıza Izgarası: hedefler tekil ve ızgara içinde; kısmi seçim kontrolü', () => {
  for (const { level, round } of rounds(memoryGrid)) {
    const cfg = memoryGrid.levelConfig(level);
    assert.equal(round.targets.length, cfg.count);
    assert.equal(new Set(round.targets).size, cfg.count);
    assert.ok(round.targets.every((t) => t >= 0 && t < cfg.size * cfg.size));
  }
  const round = { variant: 'order', targets: [4, 1, 7] };
  assert.equal(memoryGrid.checkPicks(round, [4]), 'continue');
  assert.equal(memoryGrid.checkPicks(round, [1]), 'wrong');
  assert.equal(memoryGrid.checkPicks(round, [4, 1, 7]), 'correct');
  const pos = { variant: 'position', targets: [4, 1, 7] };
  assert.equal(memoryGrid.checkPicks(pos, [7, 4, 1]), 'correct');
  assert.equal(memoryGrid.checkPicks(pos, [7, 7]), 'wrong');
  assert.equal(memoryGrid.evaluate(null, { ...pos, count: 3 }, { picks: [7] }).outcome, OUTCOME.SKIP);
});

test('Hafıza Izgarası: "Sıra" varyantı seçenekten okunur', () => {
  const rng = createRng(1);
  const state = memoryGrid.createState({ rng, options: { variant: 'order' } });
  assert.equal(memoryGrid.nextRound(state, { rng, level: 3 }).variant, 'order');
  assert.equal(memoryGrid.createState({ options: { variant: 'kötü' } }).variant, 'position');
});

test('Hızlı Eşleştirme: tam olarak bir hedef, çeldiriciler birbirinden farklı', () => {
  for (const { level, round } of rounds(quickMatch)) {
    const cfg = quickMatch.levelConfig(level);
    assert.equal(round.items.length, cfg.options);
    const same = round.items.filter((o) => o.shape === round.target.shape && o.color === round.target.color);
    assert.equal(same.length, 1);
    assert.equal(round.items.indexOf(same[0]), round.answer);
    assert.equal(new Set(round.items.map((o) => `${o.shape}/${o.color}`)).size, round.items.length);
  }
});

test('Zihinden Hesap: sonuç doğru, seçenekler tekil ve negatif değil', () => {
  for (const { round } of rounds(mentalMath)) {
    const expr = round.text.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
    assert.equal(Function(`return (${expr})`)(), round.value, round.text);
    assert.ok(Number.isInteger(round.value) && round.value >= 0, round.text);
    assert.equal(new Set(round.options).size, 4);
    assert.ok(round.options.every((o) => o >= 0));
    assert.equal(round.options[round.answer], round.value);
  }
});

test('Çift Odak: uyaran hedef bayrağıyla tutarlı; hedef oranı makul; akış en fazla 5 hedefsiz uyaran', () => {
  let targets = 0;
  let total = 0;
  for (const { round, state } of rounds(dualFocus, { seeds: 10, perSeed: 30 })) {
    assert.equal(dualFocus.isTarget(round.rule, round.stim), round.target);
    assert.ok(state.sinceTarget <= 5);
    total += 1;
    if (round.target) targets += 1;
  }
  const rate = targets / total;
  assert.ok(rate > 0.3 && rate < 0.5, `hedef oranı ${rate}`);
});

test('Çift Odak: seviyeyle kural tek koşuldan iki koşula çıkar', () => {
  const rng = createRng(2);
  assert.equal(dualFocus.makeRule(rng, 1).conds.length, 1);
  assert.equal(dualFocus.makeRule(rng, 1).conds[0].type, 'shape');
  assert.equal(dualFocus.makeRule(rng, 3).conds.length, 2);
  assert.ok(dualFocus.levelConfig(10).showMs < dualFocus.levelConfig(1).showMs);
  assert.ok(dualFocus.levelConfig(9).distractors > 0);
});

test('Değişen Örüntü: her kural için tam olarak bir seçenek eşleşir', () => {
  for (const { level, round } of rounds(patternShift)) {
    for (const dim of patternShift.levelConfig(level).dims) {
      assert.equal(patternShift.matchingChoices(round, dim).length, 1, `${dim}`);
    }
    assert.equal(patternShift.matchingChoices(round, round.rule)[0], round.answer);
  }
});

test('Değişen Örüntü: yeterli doğrudan sonra kural değişir; hızlı fark etme bonusu ve "eski kural" hatası', () => {
  const rng = createRng(11);
  const state = patternShift.createState();
  let round = patternShift.nextRound(state, { rng, level: 3 });
  const first = round.rule;
  for (let i = 0; i < state.needed; i++) {
    patternShift.evaluate(state, round, { choice: round.answer });
    round = patternShift.nextRound(state, { rng, level: 3 });
  }
  assert.notEqual(round.rule, first);
  assert.equal(round.ruleChanged, true);
  assert.equal(round.previousRule, first);
  // Eski kurala göre seçim
  const oldIdx = patternShift.matchingChoices(round, first)[0];
  const err = patternShift.evaluate(state, round, { choice: oldIdx });
  assert.equal(err.outcome, OUTCOME.WRONG);
  assert.equal(err.perseverative, true);

  // Değişimden hemen sonra doğru → bonus
  const s2 = patternShift.createState();
  let r2 = patternShift.nextRound(s2, { rng, level: 3 });
  for (let i = 0; i < s2.needed; i++) {
    patternShift.evaluate(s2, r2, { choice: r2.answer });
    r2 = patternShift.nextRound(s2, { rng, level: 3 });
  }
  const quick = patternShift.evaluate(s2, r2, { choice: r2.answer });
  assert.equal(quick.extraBonus, patternShift.SWITCH_BONUS);
});

test('Mantık Devresi: cevap devrenin gerçek çıkışıyla uyumlu ve tek', () => {
  for (const { round } of rounds(logicCircuit)) {
    const { circuit } = round;
    if (round.type === 'output') {
      assert.equal(logicCircuit.evaluateCircuit(circuit, round.inputs).OUT, round.answer);
    } else if (round.type === 'missing') {
      const fits = [0, 1].filter((v) => logicCircuit.evaluateCircuit(circuit, { ...round.inputs, [round.hidden]: v }).OUT === round.out);
      assert.deepEqual(fits, [round.answer]);
    } else {
      const fits = round.options.filter((o) => {
        const [a, b] = o.match(/\d/g).map(Number);
        return logicCircuit.evaluateCircuit(circuit, { ...round.inputs, A: a, B: b }).OUT === round.want;
      });
      assert.deepEqual(fits, [round.answer]);
    }
    assert.equal(round.options.filter((o) => o === round.answer).length, 1);
  }
});

test('Mantık Devresi: kapı doğruluk tabloları ve açıklama', () => {
  const { GATES } = logicCircuit;
  const table = (op) => [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => GATES[op].fn(a, b));
  assert.deepEqual(table('AND'), [0, 0, 0, 1]);
  assert.deepEqual(table('OR'), [0, 1, 1, 1]);
  assert.deepEqual(table('XOR'), [0, 1, 1, 0]);
  assert.deepEqual(table('NAND'), [1, 1, 1, 0]);
  assert.deepEqual([0, 1].map((a) => GATES.NOT.fn(a)), [1, 0]);
  const steps = logicCircuit.explain({ inputs: ['A', 'B'], gates: [{ id: 'OUT', op: 'AND', args: ['A', 'B'] }] }, { A: 1, B: 0 });
  assert.deepEqual(steps, ['ÇIKIŞ = VE(A=1, B=0) = 0']);
});

test('Dizi Dedektifi: dizi kurala uyar, çeldiricilerin hiçbiri bir kurala uymaz', () => {
  const fitsFor = { number: seq.fitsAnyNumberRule, arrow: seq.fitsArrowRule, shape: seq.fitsShapeRule };
  const kinds = new Set();
  for (const { round } of rounds(seq)) {
    kinds.add(round.kind);
    const fits = fitsFor[round.kind];
    assert.ok(fits(round.full), round.key);
    assert.equal(new Set(round.options).size, 4);
    round.options.forEach((opt, i) => {
      const filled = round.terms.map((v) => (v == null ? opt : v));
      assert.equal(fits(filled), i === round.answer, `${round.key} seçenek ${opt}`);
    });
    assert.equal(round.terms.filter((v) => v == null).length, 1);
  }
  assert.deepEqual([...kinds].sort(), ['arrow', 'number', 'shape']);
});

test('Dizi Dedektifi: kural tanıyıcılar', () => {
  assert.ok(seq.NUMBER_RULES.arithmetic([2, 5, 8, 11]));
  assert.ok(seq.NUMBER_RULES.geometric([3, 6, 12, 24]));
  assert.ok(!seq.NUMBER_RULES.geometric([0, 0, 0, 0]));
  assert.ok(seq.NUMBER_RULES.alternating([1, 30, 3, 28, 5, 26]));
  assert.ok(seq.NUMBER_RULES.squares([4, 9, 16, 25]));
  assert.ok(seq.NUMBER_RULES.fibonacci([1, 2, 3, 5, 8]));
  assert.ok(seq.NUMBER_RULES.secondOrder([1, 3, 6, 10, 15]));
  assert.ok(!seq.fitsAnyNumberRule([1, 2, 4, 7, 12]));
  assert.ok(seq.fitsArrowRule([315, 0, 45, 90]));
  assert.ok(seq.fitsShapeRule(['a', 'b', 'c', 'a', 'b', 'c']));
  assert.ok(!seq.fitsShapeRule(['a', 'b', 'c', 'a', 'c', 'c']));
});

test('Kelime Kutuları: her kelimenin tek bir kategorisi var; cevap doğru kutu', () => {
  const all = Object.values(wordSort.CATEGORIES).flatMap((c) => c.words);
  assert.equal(new Set(all).size, all.length, 'kelime listeleri ayrık');
  for (const w of all) assert.equal(wordSort.categoryOf(w).length, 1, w);
  for (const { round } of rounds(wordSort)) {
    if (round.mode === 'sort') {
      assert.deepEqual(wordSort.categoryOf(round.word), [round.bins[round.answer]]);
      assert.equal(new Set(round.bins).size, round.bins.length);
    } else {
      const cats = round.words.map((w) => wordSort.categoryOf(w)[0]);
      const odd = cats.filter((c) => c === round.odd);
      assert.equal(odd.length, 1);
      assert.equal(cats.filter((c) => c === round.main).length, 3);
      assert.equal(cats[round.answer], round.odd);
    }
  }
});

test('Döndür ya da Aynala: tam olarak bir seçenek parçanın dönüşüdür', () => {
  for (const { level, round } of rounds(rotation)) {
    assert.ok(rotation.isChiral(round.piece));
    assert.equal(round.piece.length, rotation.levelConfig(level).cells);
    const rotKeys = new Set(rotation.rotations(round.piece).map(rotation.keyOf));
    const hits = round.options.map((o, i) => (rotKeys.has(rotation.keyOf(o)) ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(hits, [round.answer]);
    assert.equal(new Set(round.options.map(rotation.keyOf)).size, round.options.length);
  }
  assert.ok(!rotation.isChiral([[0, 0], [0, 1], [1, 0], [1, 1]]), 'kare kiral değil');
  assert.ok(rotation.isChiral([[0, 0], [1, 0], [2, 0], [2, 1]]), 'L kiral');
});
