// İstatistik hesapları: günlük/haftalık oturum sayısı, oyun bazında gelişim, güçlü alanlar.

// Son 7 günün (bugün dahil) gün gün oturum sayısı, en eski gün başta.
export function dailyCounts(sessions, now = Date.now(), days = 7) {
  const d = new Date(now);
  const out = [];
  // Gün sınırları takvimden alınır; yaz saati geçişlerinde 23/25 saatlik günler doğru sayılır.
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i).getTime();
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i + 1).getTime();
    out.push({ dayStart, count: sessions.filter((s) => s.at >= dayStart && s.at < dayEnd).length });
  }
  return out;
}

export function sessionSummary(sessions, now = Date.now()) {
  const days = dailyCounts(sessions, now, 7);
  return {
    today: days[days.length - 1].count,
    week: days.reduce((sum, d) => sum + d.count, 0),
    total: sessions.length,
    days,
  };
}

const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

// Son 5 oyunun ortalaması ile önceki 5 oyunun ortalaması arasındaki fark.
export function trend(history, key = 'score', span = 5) {
  if (history.length < 2) return null;
  const recent = history.slice(-span).map((h) => h[key]);
  const before = history.slice(-2 * span, -span).map((h) => h[key]);
  if (!before.length) return null;
  return Math.round(mean(recent) - mean(before));
}

// Kategori bazında, cevap sayısıyla ağırlıklı doğruluk. En güçlü başta.
export function categoryStrengths(sessions, categories) {
  const acc = new Map(categories.map((c) => [c, { category: c, answered: 0, correctWeighted: 0, sessions: 0 }]));
  for (const s of sessions) {
    const entry = acc.get(s.category);
    if (!entry || !s.answered) continue;
    entry.answered += s.answered;
    entry.correctWeighted += (s.accuracy / 100) * s.answered;
    entry.sessions += 1;
  }
  return [...acc.values()]
    .map((e) => ({
      category: e.category,
      sessions: e.sessions,
      answered: e.answered,
      accuracy: e.answered ? Math.round((e.correctWeighted / e.answered) * 1000) / 10 : null,
    }))
    .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
}
