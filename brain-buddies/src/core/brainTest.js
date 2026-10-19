// Beyin Testi: Brain Buddies'in ana döngüsü.
// Bir test = 4 kategori × 1 mini oyun × 60 sn. Her oyun gram cinsinden puan verir;
// toplam "beyin ağırlığı"dır. Rekor yalnızca toplam rekor geçildiğinde kaydedilir.
// Kaynaklar ve hangi kuralın gözlemlendiği/tahmin edildiği: docs/REFERENCE_GAPS.md

export const STEP_MS = 60000;
export const BONUS_EVERY = 10; // art arda 10 doğru → ek süre (oyuncu anlatımı)
export const BONUS_MS = 5000;
export const HISTORY_LIMIT = 50;

export const TEST_CATEGORIES = Object.freeze([
  { id: 'memory', name: 'Hafıza', icon: '🧠', games: ['patternShoot', 'missingSymbol'] },
  { id: 'logic', name: 'Mantık', icon: '⚙', games: ['gearWheel', 'alphaSort'] },
  { id: 'numeric', name: 'Hesap', icon: '123', games: ['dontDrop', 'numberHunt'] },
  { id: 'visual', name: 'Görsel', icon: '👁', games: ['freezeAlien', 'bubbles'] },
]);

export const CATEGORY_IDS = TEST_CATEGORIES.map((c) => c.id);
export const categoryById = (id) => TEST_CATEGORIES.find((c) => c.id === id);

// Gram puanlaması: doğru cevap oyunun gram değeri kadar (seviyeyle %5 artar, hızla en fazla %25 bonus),
// hatalar doğru cevabın 1,5 katı kadar düşürür ("hatalar puanı çok düşürür").
export function scoringFor(definition) {
  const base = definition.gramsPerCorrect;
  return {
    base,
    levelStep: 0.05,
    speedBonusMax: 0.25,
    streakStep: 0,
    streakCap: 0,
    extraBonusMax: 0,
    penalties: {
      wrong: Math.round(base * 1.5),
      falseAlarm: Math.round(base * 1.5),
      miss: base,
      timeout: base,
      skip: 0,
    },
  };
}

export function defaultBrain() {
  return {
    tests: 0,
    best: null, // { total, cats: { memory, logic, numeric, visual }, at }
    catBest: Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])),
    history: [],
    choice: Object.fromEntries(CATEGORY_IDS.map((c) => [c, 'random'])),
    trophies: {},
  };
}

// Her kategorinin iki oyunu da baştan açık. Seçim yapılmamışsa ikisinden biri rastgele gelir (orijinaldeki gibi).
export function pickGame(categoryId, choice, rng) {
  const games = categoryById(categoryId).games;
  if (choice && choice !== 'random' && games.includes(choice)) return choice;
  return rng.pick(games);
}

// steps: [{ category, gameId, result }] — result session.result()'tan gelir; score = gram
export function summarizeTest(steps) {
  const cats = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0]));
  let errors = 0;
  let bestStreak = 0;
  for (const s of steps) {
    cats[s.category] = Math.round(s.result.score);
    const c = s.result.counts;
    errors += c.wrong + c.falseAlarm + c.miss + c.timeout;
    bestStreak = Math.max(bestStreak, s.result.bestStreak || 0);
  }
  const total = CATEGORY_IDS.reduce((sum, c) => sum + cats[c], 0);
  return { total, cats, errors, bestStreak, complete: steps.length === CATEGORY_IDS.length };
}

export const TROPHIES = Object.freeze([
  { id: 'first', name: 'İlk tartı', desc: 'İlk beyin testini bitir.', check: ({ brain }) => brain.tests >= 1 },
  { id: 'g3000', name: '3 kiloluk beyin', desc: 'Bir testte 3000 g’a ulaş.', check: ({ test }) => test.total >= 3000 },
  { id: 'g4000', name: '4 kiloluk beyin', desc: 'Bir testte 4000 g’a ulaş.', check: ({ test }) => test.total >= 4000 },
  { id: 'g5000', name: 'Dev beyin', desc: 'Bir testte 5000 g’a ulaş.', check: ({ test }) => test.total >= 5000 },
  { id: 'flawless2500', name: 'Hatasız 2500', desc: 'Hiç hata yapmadan 2500 g’a ulaş.', check: ({ test }) => test.total >= 2500 && test.errors === 0 },
  { id: 'all1000', name: 'Dengeli beyin', desc: 'Aynı testte her kategoride 1000 g’a ulaş.', check: ({ test }) => CATEGORY_IDS.every((c) => test.cats[c] >= 1000) },
  { id: 'streak20', name: 'Seri', desc: 'Bir oyunda art arda 20 doğru yap.', check: ({ test }) => test.bestStreak >= 20 },
  { id: 'played30', name: 'Müdavim', desc: '30 test bitir.', check: ({ brain }) => brain.tests >= 30 },
]);

// Testi beyin kaydına işler (yalnızca tamamlanan testler). Kaydı yerinde değiştirir.
export function recordTest(brain, test, at = Date.now()) {
  if (!test.complete) return { isRecord: false, previousBest: brain.best, newTrophies: [] };
  brain.tests += 1;
  const previousBest = brain.best ? { ...brain.best, cats: { ...brain.best.cats } } : null;
  const isRecord = !brain.best || test.total > brain.best.total;
  if (isRecord) brain.best = { total: test.total, cats: { ...test.cats }, at };
  for (const c of CATEGORY_IDS) brain.catBest[c] = Math.max(brain.catBest[c] || 0, test.cats[c]);
  brain.history.push({ at, total: test.total, cats: { ...test.cats } });
  if (brain.history.length > HISTORY_LIMIT) brain.history.splice(0, brain.history.length - HISTORY_LIMIT);
  const newTrophies = [];
  for (const t of TROPHIES) {
    if (!brain.trophies[t.id] && t.check({ brain, test })) {
      brain.trophies[t.id] = at;
      newTrophies.push(t);
    }
  }
  return { isRecord, previousBest, newTrophies };
}

// Profesör Gram'ın yorumları (özgün metin)
export function weightComment(total) {
  if (total >= 5000) return 'İnanılmaz! Bu beyin terazimi zorluyor.';
  if (total >= 4000) return 'Ağır sıklet bir beyin! Arkadaşların seni kıskanacak.';
  if (total >= 3000) return 'Sağlam bir beyin. Biraz daha antrenmanla 4 kiloyu geçersin.';
  if (total >= 2000) return 'Fena değil! Her test beynini biraz daha ağırlaştırır.';
  if (total >= 1000) return 'Isınma turu sayılır. Tekrar dene, daha hızlı olacaksın.';
  return 'Terazi daha yeni uyanıyor. Hadi bir daha!';
}

export function stepComment(grams, catBest) {
  if (catBest > 0 && grams > catBest) return 'Bu kategoride yeni rekor!';
  if (grams >= 1000) return 'Harika bir sonuç!';
  if (grams >= 600) return 'İyi gidiyorsun.';
  return 'Sonraki oyunda telafi edersin.';
}
