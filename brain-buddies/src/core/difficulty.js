// Zorluk ayarı: yalnızca toplam skora değil; son cevapların doğruluğuna ve
// tepki süresine bakar. Her değişiklik bir açıklama (reason) ile döner.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

export const DEFAULT_DIFFICULTY = Object.freeze({
  window: 4, // son kaç cevaba bakılır
  upAccuracy: 0.75, // pencerede en az bu doğrulukla yüksel
  upRtRatio: 1.2, // ve ortalama tepki süresi hedefin en fazla 1.2 katıysa
  downAccuracy: 0.5, // pencerede en fazla bu doğrulukta düş
  minAnswersBetweenChanges: 3, // iki değişiklik arasında en az bu kadar cevap (küçük adımlar)
});

const clampLevel = (level) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));

export function createDifficultyController({
  startLevel = 1,
  adaptive = true,
  cfg = DEFAULT_DIFFICULTY,
} = {}) {
  let level = clampLevel(startLevel);
  let maxLevel = level;
  let history = [];
  let sinceChange = 0;

  return {
    get level() {
      return level;
    },
    get maxLevel() {
      return maxLevel;
    },
    get adaptive() {
      return adaptive;
    },
    // answer: { correct: boolean, rtMs?: number, targetRtMs?: number }
    // Dönen değer: { level, changed: -1 | 0 | 1, reason }
    record({ correct, rtMs, targetRtMs }) {
      history.push({ correct: !!correct, rtMs, targetRtMs });
      if (history.length > cfg.window) history.shift();
      sinceChange += 1;
      if (!adaptive) return { level, changed: 0, reason: 'Uyarlama kapalı' };
      if (sinceChange < cfg.minAnswersBetweenChanges || history.length < cfg.minAnswersBetweenChanges) {
        return { level, changed: 0, reason: '' };
      }
      const acc = history.filter((h) => h.correct).length / history.length;
      const timed = history.filter((h) => h.correct && Number.isFinite(h.rtMs) && h.targetRtMs > 0);
      const rtRatio = timed.length
        ? timed.reduce((sum, h) => sum + h.rtMs / h.targetRtMs, 0) / timed.length
        : 1;
      const last = history[history.length - 1];

      if (acc >= cfg.upAccuracy && last.correct && rtRatio <= cfg.upRtRatio && level < MAX_LEVEL) {
        level += 1;
        maxLevel = Math.max(maxLevel, level);
        sinceChange = 0;
        history = [];
        return {
          level,
          changed: 1,
          reason: `Son cevaplarda %${Math.round(acc * 100)} doğruluk ve hızlı tepki`,
        };
      }
      if (acc <= cfg.downAccuracy && !last.correct && level > MIN_LEVEL) {
        level -= 1;
        sinceChange = 0;
        history = [];
        return {
          level,
          changed: -1,
          reason: `Son cevaplarda %${Math.round(acc * 100)} doğruluk; biraz kolaylaştı`,
        };
      }
      return { level, changed: 0, reason: '' };
    },
  };
}
