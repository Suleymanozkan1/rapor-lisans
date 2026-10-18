// Sözel kategori: kelimeyi doğru gruba ayır; ileri seviyede "hangisi farklı?" sorulur.
// Kelime listeleri birbirinden ayrıktır; her kelimenin tek bir kategorisi vardır (testle doğrulanır).

import { OUTCOME } from '../core/score.js';
import { createRepeatGuard } from '../core/rng.js';
import { h, choiceGrid } from '../ui/dom.js';

export const CATEGORIES = {
  meyve: { name: 'Meyve', words: ['elma', 'armut', 'kiraz', 'muz', 'çilek', 'karpuz', 'kavun', 'şeftali', 'erik', 'üzüm', 'incir', 'nar', 'ayva', 'vişne'] },
  sebze: { name: 'Sebze', words: ['havuç', 'ıspanak', 'pırasa', 'patlıcan', 'kabak', 'lahana', 'brokoli', 'bezelye', 'enginar', 'turp', 'kereviz', 'bamya'] },
  memeli: { name: 'Memeli', words: ['kedi', 'köpek', 'aslan', 'kaplan', 'zürafa', 'fil', 'tavşan', 'kurt', 'ayı', 'at', 'inek', 'koyun', 'tilki', 'yunus'] },
  kus: { name: 'Kuş', words: ['serçe', 'kartal', 'güvercin', 'papağan', 'baykuş', 'leylek', 'karga', 'martı', 'şahin', 'kumru', 'flamingo', 'penguen'] },
  meslek: { name: 'Meslek', words: ['doktor', 'öğretmen', 'aşçı', 'pilot', 'hemşire', 'avukat', 'mimar', 'terzi', 'berber', 'çiftçi', 'marangoz', 'itfaiyeci'] },
  renk: { name: 'Renk', words: ['mavi', 'yeşil', 'kırmızı', 'sarı', 'mor', 'turuncu', 'pembe', 'gri', 'siyah', 'beyaz', 'lacivert', 'kahverengi'] },
  ulke: { name: 'Ülke', words: ['Türkiye', 'Japonya', 'Mısır', 'Brezilya', 'Kanada', 'İtalya', 'Almanya', 'Hindistan', 'Meksika', 'Norveç', 'Fas', 'Peru'] },
  muzik: { name: 'Müzik aleti', words: ['bağlama', 'gitar', 'keman', 'piyano', 'davul', 'flüt', 'ney', 'kanun', 'ud', 'zurna', 'trompet', 'akordeon'] },
  tasit: { name: 'Taşıt', words: ['otobüs', 'tren', 'uçak', 'gemi', 'bisiklet', 'kamyon', 'tramvay', 'metro', 'motosiklet', 'helikopter', 'vapur', 'taksi'] },
  mutfak: { name: 'Mutfak eşyası', words: ['tencere', 'tava', 'kaşık', 'çatal', 'bıçak', 'rende', 'kepçe', 'süzgeç', 'oklava', 'cezve', 'çaydanlık', 'tabak'] },
  spor: { name: 'Spor dalı', words: ['futbol', 'basketbol', 'voleybol', 'tenis', 'yüzme', 'güreş', 'okçuluk', 'boks', 'eskrim', 'kayak', 'judo', 'hentbol'] },
};

// Anlamca yakın, ayırt etmesi daha zor kategori çiftleri (ileri seviye)
export const CLOSE_PAIRS = [['meyve', 'sebze'], ['memeli', 'kus'], ['tasit', 'spor'], ['muzik', 'mutfak']];

export const CATEGORY_IDS = Object.keys(CATEGORIES);

export const categoryOf = (word) => CATEGORY_IDS.filter((id) => CATEGORIES[id].words.includes(word));

export const definition = {
  id: 'wordSort',
  name: 'Kelime Kutuları',
  category: 'verbal',
  icon: 'Aa',
  description: 'Kelimeyi doğru kutuya at; sonra farklı olanı bul.',
  howTo: [
    'Ortada bir kelime görünür. Hangi kutuya ait olduğunu seç.',
    'Klavyede 1, 2, 3 veya ← → ok tuşlarını kullanabilirsin.',
    'İleri seviyede dört kelimeden farklı olanı bulursun.',
  ],
  targetRtMs: 1800,
};

export function levelConfig(level) {
  const l = Math.min(10, Math.max(1, level));
  return { mode: l <= 5 ? 'sort' : 'odd', bins: l <= 3 ? 2 : 3, close: l >= 8 || l === 3 };
}

export const createState = () => ({ guard: createRepeatGuard({ memory: 40 }) });

function pickCategories(rng, count, close) {
  if (close) {
    const pair = rng.pick(CLOSE_PAIRS);
    const rest = rng.sample(CATEGORY_IDS.filter((c) => !pair.includes(c)), Math.max(0, count - 2));
    return rng.shuffle([...pair, ...rest]).slice(0, count);
  }
  return rng.sample(CATEGORY_IDS, count);
}

export function nextRound(state, { rng, level }) {
  const cfg = levelConfig(level);
  return state.guard.take(
    () => {
      if (cfg.mode === 'sort') {
        const bins = pickCategories(rng, cfg.bins, cfg.close);
        const correct = rng.pick(bins);
        const word = rng.pick(CATEGORIES[correct].words);
        return { mode: 'sort', word, bins, answer: bins.indexOf(correct), key: word };
      }
      const [main, odd] = pickCategories(rng, 2, cfg.close);
      const words = rng.shuffle([...rng.sample(CATEGORIES[main].words, 3), rng.pick(CATEGORIES[odd].words)]);
      const oddWord = words.find((w) => CATEGORIES[odd].words.includes(w));
      return { mode: 'odd', words, main, odd, answer: words.indexOf(oddWord), key: `odd:${oddWord}` };
    },
    (r) => r.key,
  );
}

export function evaluate(_state, round, input) {
  if (input.timeout) return { outcome: OUTCOME.TIMEOUT };
  if (input.choice === round.answer) return { outcome: OUTCOME.CORRECT };
  const explanation =
    round.mode === 'sort'
      ? `“${round.word}” bir ${CATEGORIES[round.bins[round.answer]].name.toLocaleLowerCase('tr')}.`
      : `“${round.words[round.answer]}” ${CATEGORIES[round.odd].name.toLocaleLowerCase('tr')}; diğerleri ${CATEGORIES[round.main].name.toLocaleLowerCase('tr')}.`;
  return { outcome: OUTCOME.WRONG, explanation };
}

export function render(ctx) {
  const { round } = ctx;
  if (round.mode === 'sort') {
    ctx.root.append(h('div', { class: 'ws-word', 'aria-live': 'polite' }, round.word));
    const grid = choiceGrid(
      ctx,
      round.bins.map((id, i) => ({ content: h('span', { class: 'ws-bin' }, CATEGORIES[id].name), label: CATEGORIES[id].name, value: i })),
      (choice, i) => {
        grid.mark(round.answer, 'is-correct');
        if (i !== round.answer) grid.mark(i, 'is-wrong');
        ctx.answer({ choice });
      },
      { columns: round.bins.length, className: 'ws-bins' },
    );
    ctx.root.append(grid.el);
    ctx.onKey((e) => {
      if (round.bins.length !== 2) return false;
      if (e.key === 'ArrowLeft') grid.buttons[0].click();
      else if (e.key === 'ArrowRight') grid.buttons[1].click();
      else return false;
      return true;
    });
    ctx.status('Hangi kutuya ait?');
  } else {
    const grid = choiceGrid(
      ctx,
      round.words.map((w, i) => ({ content: h('span', { class: 'ws-bin' }, w), label: w, value: i })),
      (choice, i) => {
        grid.mark(round.answer, 'is-correct');
        if (i !== round.answer) grid.mark(i, 'is-wrong');
        ctx.answer({ choice });
      },
      { columns: 2 },
    );
    ctx.root.append(grid.el);
    ctx.status('Hangisi farklı?');
  }
  ctx.presented();
}
