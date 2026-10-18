// AudioManager: Web Audio ile sentezlenen kısa sesler. Ses dosyası yoktur.
// AudioContext ilk kullanıcı etkileşiminden sonra, ilk çalmada oluşturulur.

const TONES = {
  correct: [[660, 0, 0.08], [880, 0.07, 0.12]],
  wrong: [[196, 0, 0.18, 'square']],
  tick: [[1200, 0, 0.03]],
  level: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.14]],
  start: [[440, 0, 0.06], [660, 0.1, 0.1]],
  end: [[784, 0, 0.1], [659, 0.12, 0.1], [523, 0.24, 0.2]],
  count: [[520, 0, 0.06]],
};

export function createAudio(isEnabled = () => true) {
  let ctx = null;
  const ensure = () => {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  };
  return {
    play(name) {
      if (!isEnabled()) return;
      const tones = TONES[name];
      const ac = tones && ensure();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const t0 = ac.currentTime + 0.01;
      for (const [freq, at, dur, type = 'sine'] of tones) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + at);
        gain.gain.exponentialRampToValueAtTime(type === 'square' ? 0.05 : 0.12, t0 + at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0 + at);
        osc.stop(t0 + at + dur + 0.02);
      }
    },
  };
}
