// Tohumlu, deterministik rastgele sayı üreteci (mulberry32) ve yardımcılar.
// Aynı tohum her zaman aynı soruları üretir; testler buna dayanır.

export function createRng(seed = Date.now()) {
  let state = hashSeed(seed) >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    seed,
    next,
    // [min, max] aralığında tam sayı (iki uç dahil)
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(list) {
      if (!list.length) throw new Error('pick: boş liste');
      return list[Math.floor(next() * list.length)];
    },
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    sample(list, count) {
      return rng.shuffle(list).slice(0, count);
    },
    fork(label) {
      return createRng(`${seed}:${label}`);
    },
  };
  return rng;
}

export function hashSeed(seed) {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Aynı oturumda aynı soru anahtarının tekrar çıkmasını sınırlar.
// generate() aday üretir, keyOf() adayın kimliğini verir. Denemeler biterse
// en az kullanılmış aday kabul edilir; oyun asla kilitlenmez.
export function createRepeatGuard({ memory = 30, attempts = 25 } = {}) {
  const recent = [];
  const seen = new Set();
  return {
    take(generate, keyOf) {
      let candidate = null;
      for (let i = 0; i < attempts; i++) {
        candidate = generate();
        if (!seen.has(keyOf(candidate))) break;
      }
      const key = keyOf(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        recent.push(key);
        if (recent.length > memory) seen.delete(recent.shift());
      }
      return candidate;
    },
    has(key) {
      return seen.has(key);
    },
    get size() {
      return seen.size;
    },
  };
}
