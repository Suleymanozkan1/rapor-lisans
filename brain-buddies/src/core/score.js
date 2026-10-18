// Puanlama: arayüzden bağımsız, saf fonksiyonlar. Formül GAMEPLAY_SPEC.md'de anlatılır.

export const OUTCOME = Object.freeze({
  CORRECT: 'correct',
  WRONG: 'wrong',
  FALSE_ALARM: 'falseAlarm', // hedef değilken cevap vermek
  MISS: 'miss', // hedef varken cevap vermemek
  TIMEOUT: 'timeout', // tur süresi doldu
  SKIP: 'skip', // oyuncu turu boş bıraktı
  IGNORE: 'ignore', // hedef değildi ve oyuncu doğru biçimde bekledi; sayılmaz
});

export const COUNTED_OUTCOMES = [
  OUTCOME.CORRECT,
  OUTCOME.WRONG,
  OUTCOME.FALSE_ALARM,
  OUTCOME.MISS,
  OUTCOME.TIMEOUT,
  OUTCOME.SKIP,
];

export const DEFAULT_SCORING = Object.freeze({
  base: 100,
  levelStep: 0.1, // her seviye tabana %10 ekler (seviye 10 = x1.9)
  speedBonusMax: 0.5, // hız bonusu tabanın en fazla %50'si
  streakStep: 10, // seri başına +10
  streakCap: 50, // seri bonusu en fazla +50
  extraBonusMax: 0.5, // oyuna özel ek bonus tabanın en fazla %50'si
  penalties: Object.freeze({
    wrong: 25,
    falseAlarm: 30,
    miss: 20,
    timeout: 15,
    skip: 0,
  }),
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function levelMultiplier(level, cfg = DEFAULT_SCORING) {
  const safeLevel = clamp(Math.round(level || 1), 1, 10);
  return 1 + cfg.levelStep * (safeLevel - 1);
}

// Tepki süresi hedefin yarısı veya daha kısaysa tam bonus, 1.5 katı veya daha uzunsa sıfır.
export function speedFraction(rtMs, targetRtMs) {
  if (!Number.isFinite(rtMs) || !Number.isFinite(targetRtMs) || targetRtMs <= 0) return 0;
  const ratio = rtMs / targetRtMs;
  return clamp(1.5 - ratio, 0, 1);
}

// Tek bir cevabın puanı. streak: bu cevaptan ÖNCEKİ art arda doğru sayısı.
export function scoreAnswer(
  { outcome, level = 1, rtMs, targetRtMs, streak = 0, extraBonus = 0 },
  cfg = DEFAULT_SCORING,
) {
  const breakdown = { base: 0, speed: 0, streak: 0, extra: 0, penalty: 0 };
  if (outcome === OUTCOME.CORRECT) {
    const base = cfg.base * levelMultiplier(level, cfg);
    breakdown.base = Math.round(base);
    breakdown.speed = Math.round(base * cfg.speedBonusMax * speedFraction(rtMs, targetRtMs));
    breakdown.streak = Math.min(cfg.streakCap, cfg.streakStep * Math.max(0, streak));
    breakdown.extra = Math.round(clamp(extraBonus, 0, base * cfg.extraBonusMax));
  } else if (outcome in cfg.penalties) {
    breakdown.penalty = -cfg.penalties[outcome];
  } else if (outcome !== OUTCOME.IGNORE) {
    throw new Error(`Bilinmeyen sonuç türü: ${outcome}`);
  }
  const points = breakdown.base + breakdown.speed + breakdown.streak + breakdown.extra + breakdown.penalty;
  return { points, breakdown };
}

// Doğruluk yüzdesi = doğru / toplam cevap × 100, tek ondalık. Toplam 0 ise 0.
export function accuracyPercent(counts) {
  const total = COUNTED_OUTCOMES.reduce((sum, key) => sum + (counts[key] || 0), 0);
  if (total === 0) return 0;
  return Math.round(((counts.correct || 0) / total) * 1000) / 10;
}

export function emptyCounts() {
  return Object.fromEntries(COUNTED_OUTCOMES.map((key) => [key, 0]));
}

export function createScoreCalculator(cfg = DEFAULT_SCORING) {
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let counts = emptyCounts();
  let correctRts = [];

  return {
    record({ outcome, level, rtMs, targetRtMs, extraBonus }) {
      const result = scoreAnswer({ outcome, level, rtMs, targetRtMs, streak, extraBonus }, cfg);
      // Toplam skor sıfırın altına inmez; uygulanan değişim geri döndürülür.
      const before = score;
      score = Math.max(0, score + result.points);
      if (outcome === OUTCOME.CORRECT) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        if (Number.isFinite(rtMs)) correctRts.push(rtMs);
      } else if (outcome !== OUTCOME.IGNORE) {
        streak = 0;
      }
      if (outcome in counts) counts[outcome] += 1;
      return { ...result, applied: score - before, score, streak };
    },
    get score() {
      return score;
    },
    get streak() {
      return streak;
    },
    summary() {
      const avgRtMs = correctRts.length
        ? Math.round(correctRts.reduce((a, b) => a + b, 0) / correctRts.length)
        : null;
      const answered = COUNTED_OUTCOMES.reduce((sum, key) => sum + counts[key], 0);
      return {
        score,
        counts: { ...counts },
        answered,
        accuracy: accuracyPercent(counts),
        avgRtMs,
        bestStreak,
      };
    },
    reset() {
      score = 0;
      streak = 0;
      bestStreak = 0;
      counts = emptyCounts();
      correctRts = [];
    },
  };
}

// Oturum sonu sonucu ve kişisel rekor karşılaştırması.
// best: { score, accuracy, avgRtMs } veya null.
export function buildResult({ gameId, summary, durationMs, startedAt, level, maxLevel, best = null }) {
  // Sıfır puan ya da sıfır doğruluk rekor sayılmaz.
  const isScoreBest = summary.score > 0 && (!best || summary.score > (best.score ?? -1));
  const isAccuracyBest = summary.accuracy > 0 && (!best || summary.accuracy > (best.accuracy ?? -1));
  const isRtBest =
    summary.avgRtMs != null && (!best || best.avgRtMs == null || summary.avgRtMs < best.avgRtMs);
  return {
    gameId,
    startedAt,
    durationMs: Math.max(0, Math.round(durationMs)),
    level,
    maxLevel,
    ...summary,
    records: {
      score: summary.answered > 0 && isScoreBest,
      accuracy: isAccuracyBest,
      avgRtMs: isRtBest,
    },
    // Rekora kalan fark (yeni rekor değilse)
    toBest: best && !isScoreBest ? Math.max(0, best.score - summary.score) : 0,
  };
}
