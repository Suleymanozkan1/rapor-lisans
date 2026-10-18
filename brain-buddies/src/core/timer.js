// Geri sayım zamanlayıcısı. Saat enjekte edilebilir (testlerde sahte saat).
// Zamanlayıcı kendi kendine tik atmaz; arayüz döngüsü remaining()/expired() sorar.

export function createTimer({ durationMs, now = () => performance.now() }) {
  let startedAt = null;
  let pausedAt = null;
  let pausedTotal = 0;
  const unlimited = !Number.isFinite(durationMs);

  const elapsed = () => {
    if (startedAt == null) return 0;
    const end = pausedAt ?? now();
    return Math.max(0, end - startedAt - pausedTotal);
  };

  return {
    get unlimited() {
      return unlimited;
    },
    get running() {
      return startedAt != null && pausedAt == null;
    },
    get paused() {
      return pausedAt != null;
    },
    start() {
      startedAt = now();
      pausedAt = null;
      pausedTotal = 0;
    },
    pause() {
      if (startedAt != null && pausedAt == null) pausedAt = now();
    },
    resume() {
      if (pausedAt != null) {
        pausedTotal += now() - pausedAt;
        pausedAt = null;
      }
    },
    elapsed,
    remaining() {
      if (unlimited) return Infinity;
      return Math.max(0, durationMs - elapsed());
    },
    expired() {
      return !unlimited && startedAt != null && elapsed() >= durationMs;
    },
    fraction() {
      if (unlimited) return 1;
      return Math.max(0, Math.min(1, 1 - elapsed() / durationMs));
    },
  };
}

// Tek bir tur için sayaç (ör. Dual Focus uyaran süresi). Aynı arayüz.
export const createRoundTimer = (durationMs, now) => createTimer({ durationMs, now });
