// Beyin Testi oyunlarında kullanılan nesne simgeleri (Unicode emoji; ayrı görsel dosyası yok).
// Ad, ekran okuyucu ve renk/şekil dışı ipucu içindir.

export const OBJECTS = Object.freeze([
  { id: 'butterfly', icon: '🦋', name: 'kelebek' },
  { id: 'mushroom', icon: '🍄', name: 'mantar' },
  { id: 'bell', icon: '🔔', name: 'zil' },
  { id: 'key', icon: '🔑', name: 'anahtar' },
  { id: 'apple', icon: '🍎', name: 'elma' },
  { id: 'fish', icon: '🐟', name: 'balık' },
  { id: 'star', icon: '⭐', name: 'yıldız' },
  { id: 'moon', icon: '🌙', name: 'ay' },
  { id: 'gem', icon: '💎', name: 'elmas' },
  { id: 'rocket', icon: '🚀', name: 'roket' },
  { id: 'clover', icon: '🍀', name: 'yonca' },
  { id: 'balloon', icon: '🎈', name: 'balon' },
  { id: 'cherry', icon: '🍒', name: 'kiraz' },
  { id: 'snail', icon: '🐌', name: 'salyangoz' },
  { id: 'flower', icon: '🌻', name: 'ayçiçeği' },
  { id: 'crown', icon: '👑', name: 'taç' },
  { id: 'cactus', icon: '🌵', name: 'kaktüs' },
  { id: 'umbrella', icon: '☂️', name: 'şemsiye' },
]);

export const OBJECT_IDS = OBJECTS.map((o) => o.id);
export const objectInfo = (id) => OBJECTS.find((o) => o.id === id);
