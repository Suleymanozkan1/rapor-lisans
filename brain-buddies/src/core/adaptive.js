// F. Adaptive Challenge — Uyarlanabilir Mücadele planlayıcısı.
// Güçlü ve zayıf alanları dengeli sınayan kısa bir oyun listesi seçer ve
// her seçimin nedenini oyuncuya gösterilecek biçimde açıklar.

import { categoryStrengths } from './stats.js';

export const CHALLENGE_STEPS = 5;
export const STEP_DURATION_MS = 30000;

// games: [{ definition }], categories: { id: { name } }, data: ProgressRepository.data
// adaptive=false: uyarlama kapalı; kategoriler rastgele seçilir, seviyeler sabit kalır.
export function planChallenge({ games, categories, data, rng, steps = CHALLENGE_STEPS, adaptive = true, fixedLevel = null }) {
  const catIds = Object.keys(categories).filter((c) => games.some((g) => g.definition.category === c));
  if (!adaptive) {
    return rng.sample(catIds, steps).map((category) => {
      const game = rng.pick(games.filter((g) => g.definition.category === category));
      return {
        gameId: game.definition.id,
        category,
        categoryName: categories[category].name,
        startLevel: fixedLevel ?? 1,
        durationMs: STEP_DURATION_MS,
        reason: 'Rastgele seçim (otomatik uyarlama kapalı)',
      };
    });
  }
  const strengths = categoryStrengths(data.sessions, catIds);
  const played = strengths.filter((s) => s.accuracy != null);
  const unplayed = rng.shuffle(strengths.filter((s) => s.accuracy == null));
  const picks = [];
  const take = (entry, reason) => {
    if (!entry || picks.some((p) => p.category === entry.category) || picks.length >= steps) return;
    picks.push({ category: entry.category, reason });
  };
  const pct = (e) => `%${Math.round(e.accuracy)}`;

  // 1) Isınma: en güçlü alan
  if (played.length) take(played[0], `En güçlü alanın (${pct(played[0])}): ısınma turu`);
  // 2) En zayıf iki alan
  const weakest = played.slice(1).reverse();
  weakest.slice(0, 2).forEach((e) => take(e, `Gelişime açık alan (${pct(e)} doğruluk)`));
  // 3) Hiç oynanmamış alanlar
  unplayed.forEach((e) => take(e, 'Henüz denemediğin bir alan'));
  // 4) Kalanlar rastgele, denge için
  rng.shuffle(played).forEach((e) => take(e, `Denge için (${pct(e)} doğruluk)`));

  return picks.map(({ category, reason }) => {
    const options = games.filter((g) => g.definition.category === category);
    const game = rng.pick(options);
    const id = game.definition.id;
    const rec = data.games[id];
    return {
      gameId: id,
      category,
      categoryName: categories[category].name,
      startLevel: fixedLevel ?? (rec ? rec.lastLevel : 1),
      durationMs: STEP_DURATION_MS,
      reason,
    };
  });
}

// Adım sonuçlarını tek bir özet hâline getirir.
export function summarizeChallenge(results) {
  const total = results.reduce((sum, r) => sum + r.score, 0);
  const answered = results.reduce((sum, r) => sum + r.answered, 0);
  const correct = results.reduce((sum, r) => sum + r.counts.correct, 0);
  return {
    score: total,
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 1000) / 10 : 0,
    steps: results,
  };
}
