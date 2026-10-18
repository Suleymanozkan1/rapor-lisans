// ProgressRepository: ayarlar, kişisel rekorlar, istatistikler. Yalnızca yerel kayıt.
// Şema sürümlüdür; eski kayıt migrate() ile dönüştürülür, bozuk kayıt yedeklenip
// varsayılana dönülür. Hiçbir veri dış servise gönderilmez.

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'zihin-molasi:v';
export const HISTORY_LIMIT = 30;
export const SESSION_LIMIT = 500;

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  reducedMotion: 'auto', // 'auto' | 'on' | 'off'
  relaxed: false, // süre baskısı kapalı: süresiz, turlu oturum
  adaptive: true, // otomatik zorluk
  startLevel: 'auto', // 'auto' | 1..10
  durationSec: 60,
  theme: 'auto', // 'auto' | 'light' | 'dark'
  seed: '', // boş değilse içerik deterministik
});

export function defaultData() {
  return { version: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS }, games: {}, sessions: [], options: {} };
}

export function defaultGameRecord() {
  return { plays: 0, best: null, lastLevel: 1, history: [], tutorialSeen: false };
}

// Sürüm n'den n+1'e dönüştürücüler.
export const MIGRATIONS = {
  // 0: sürüm alanı olmayan ilk taslak kayıtlar ({ settings, bestScores: { oyunId: skor } })
  0(old) {
    const data = defaultData();
    if (old.settings && typeof old.settings === 'object') data.settings = { ...data.settings, ...old.settings };
    if (old.bestScores && typeof old.bestScores === 'object') {
      for (const [id, value] of Object.entries(old.bestScores)) {
        if (Number.isFinite(value)) {
          data.games[id] = { ...defaultGameRecord(), best: { score: value, accuracy: null, avgRtMs: null } };
        }
      }
    }
    data.version = 1;
    return data;
  },
};

export function migrate(raw) {
  let data = raw;
  let version = Number.isInteger(data.version) ? data.version : 0;
  if (version > SCHEMA_VERSION) throw new Error(`Kayıt sürümü (${version}) bu uygulamadan yeni`);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Sürüm ${version} için dönüştürücü yok`);
    data = step(data);
    version = data.version;
  }
  return sanitize(data);
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const finiteOrNull = (v) => (Number.isFinite(v) ? v : null);

// Yüklenen veriyi beklenen biçime zorlar; bilinmeyen alanları atar.
export function sanitize(data) {
  const clean = defaultData();
  if (isObj(data.settings)) {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key in data.settings && typeof data.settings[key] === typeof DEFAULT_SETTINGS[key]) {
        clean.settings[key] = data.settings[key];
      } else if (key === 'startLevel' && Number.isInteger(data.settings[key])) {
        clean.settings[key] = Math.min(10, Math.max(1, data.settings[key]));
      }
    }
    const s = clean.settings;
    if (![45, 60, 90].includes(s.durationSec)) s.durationSec = 60;
    if (!['auto', 'on', 'off'].includes(s.reducedMotion)) s.reducedMotion = 'auto';
    if (!['auto', 'light', 'dark'].includes(s.theme)) s.theme = 'auto';
    if (s.startLevel !== 'auto' && !Number.isInteger(s.startLevel)) s.startLevel = 'auto';
    s.seed = s.seed.slice(0, 40);
  }
  if (isObj(data.games)) {
    for (const [id, rec] of Object.entries(data.games)) {
      if (!isObj(rec) || !/^[a-z][a-zA-Z0-9-]{0,40}$/.test(id)) continue;
      const out = defaultGameRecord();
      out.plays = Number.isInteger(rec.plays) && rec.plays >= 0 ? rec.plays : 0;
      out.lastLevel = Number.isInteger(rec.lastLevel) ? Math.min(10, Math.max(1, rec.lastLevel)) : 1;
      out.tutorialSeen = rec.tutorialSeen === true;
      if (isObj(rec.best) && Number.isFinite(rec.best.score)) {
        out.best = {
          score: rec.best.score,
          accuracy: finiteOrNull(rec.best.accuracy),
          avgRtMs: finiteOrNull(rec.best.avgRtMs),
        };
      }
      if (Array.isArray(rec.history)) {
        out.history = rec.history
          .filter((h) => isObj(h) && Number.isFinite(h.score) && Number.isFinite(h.at))
          .slice(-HISTORY_LIMIT)
          .map((h) => ({
            at: h.at,
            score: h.score,
            accuracy: finiteOrNull(h.accuracy) ?? 0,
            avgRtMs: finiteOrNull(h.avgRtMs),
            level: Number.isInteger(h.level) ? h.level : 1,
          }));
      }
      clean.games[id] = out;
    }
  }
  if (Array.isArray(data.sessions)) {
    clean.sessions = data.sessions
      .filter((s) => isObj(s) && Number.isFinite(s.at) && typeof s.gameId === 'string')
      .slice(-SESSION_LIMIT)
      .map((s) => ({
        at: s.at,
        gameId: s.gameId,
        category: typeof s.category === 'string' ? s.category : '',
        score: finiteOrNull(s.score) ?? 0,
        accuracy: finiteOrNull(s.accuracy) ?? 0,
        answered: Number.isInteger(s.answered) ? s.answered : 0,
      }));
  }
  if (isObj(data.options)) {
    for (const [id, opts] of Object.entries(data.options)) {
      if (!isObj(opts)) continue;
      clean.options[id] = Object.fromEntries(
        Object.entries(opts).filter(([, v]) => typeof v === 'string' && v.length < 40),
      );
    }
  }
  return clean;
}

export function createMemoryStore() {
  const map = new Map();
  return {
    persistent: false,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

// Tarayıcı deposu; erişilemiyorsa (gizli pencere, engelli site verisi) bellek deposu.
export function createBrowserStore() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__zm_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      getItem: (k) => {
        try {
          return ls.getItem(k);
        } catch {
          return null;
        }
      },
      setItem: (k, v) => {
        try {
          ls.setItem(k, v);
          return true;
        } catch {
          return false;
        }
      },
      removeItem: (k) => {
        try {
          ls.removeItem(k);
        } catch {
          /* yok say */
        }
      },
    };
  } catch {
    return createMemoryStore();
  }
}

export function createProgressRepository(store = createMemoryStore()) {
  let data = defaultData();
  const warnings = [];

  const load = () => {
    const raw = store.getItem(STORAGE_KEY);
    if (raw == null) {
      data = defaultData();
      return data;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isObj(parsed)) throw new Error('Kayıt bir nesne değil');
      data = migrate(parsed);
    } catch (err) {
      store.setItem(`${STORAGE_KEY}:bozuk`, raw);
      warnings.push(`Kayıt okunamadı ve sıfırlandı (${err.message}). Eski veri yedeklendi.`);
      data = defaultData();
    }
    save();
    return data;
  };

  const save = () => {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const game = (id) => {
    if (!data.games[id]) data.games[id] = defaultGameRecord();
    return data.games[id];
  };

  load();

  return {
    get data() {
      return data;
    },
    get settings() {
      return data.settings;
    },
    get persistent() {
      return store.persistent !== false;
    },
    warnings,
    load,
    save,
    game,
    getOptions(id) {
      return data.options[id] || {};
    },
    setOption(id, key, value) {
      data.options[id] = { ...(data.options[id] || {}), [key]: String(value) };
      save();
    },
    updateSettings(patch) {
      data = sanitize({ ...data, settings: { ...data.settings, ...patch } });
      save();
      return data.settings;
    },
    markTutorialSeen(id) {
      game(id).tutorialSeen = true;
      save();
    },
    // GameResult kaydeder; önceki rekoru döndürür.
    recordResult(result, { category = '' } = {}) {
      const rec = game(result.gameId);
      const previousBest = rec.best ? { ...rec.best } : null;
      rec.plays += 1;
      rec.lastLevel = result.level;
      if (result.answered > 0) {
        const best = rec.best || { score: 0, accuracy: null, avgRtMs: null };
        rec.best = {
          score: Math.max(best.score, result.score),
          accuracy: best.accuracy == null ? result.accuracy : Math.max(best.accuracy, result.accuracy),
          avgRtMs:
            result.avgRtMs == null
              ? best.avgRtMs
              : best.avgRtMs == null
                ? result.avgRtMs
                : Math.min(best.avgRtMs, result.avgRtMs),
        };
      }
      rec.history.push({
        at: result.startedAt ?? Date.now(),
        score: result.score,
        accuracy: result.accuracy,
        avgRtMs: result.avgRtMs,
        level: result.level,
      });
      if (rec.history.length > HISTORY_LIMIT) rec.history.splice(0, rec.history.length - HISTORY_LIMIT);
      data.sessions.push({
        at: result.startedAt ?? Date.now(),
        gameId: result.gameId,
        category,
        score: result.score,
        accuracy: result.accuracy,
        answered: result.answered,
      });
      if (data.sessions.length > SESSION_LIMIT) data.sessions.splice(0, data.sessions.length - SESSION_LIMIT);
      save();
      return previousBest;
    },
    resetStats() {
      data = { ...defaultData(), settings: data.settings };
      save();
    },
    exportJson() {
      return JSON.stringify(data, null, 2);
    },
    importJson(text) {
      const parsed = JSON.parse(text);
      if (!isObj(parsed)) throw new Error('Geçersiz dosya');
      data = migrate(parsed);
      save();
      return data;
    },
    deleteAll() {
      store.removeItem(STORAGE_KEY);
      store.removeItem(`${STORAGE_KEY}:bozuk`);
      data = defaultData();
    },
  };
}
