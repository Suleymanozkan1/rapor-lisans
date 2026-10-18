// Ortak şekil ve renk kataloğu. Her rengin kendine ait bir dolgu deseni vardır;
// böylece renk körlüğünde de iki öğe yalnızca renkle ayırt edilmek zorunda kalmaz.

export const SHAPES = Object.freeze([
  { id: 'circle', name: 'Daire' },
  { id: 'square', name: 'Kare' },
  { id: 'triangle', name: 'Üçgen' },
  { id: 'star', name: 'Yıldız' },
  { id: 'diamond', name: 'Baklava' },
  { id: 'hexagon', name: 'Altıgen' },
]);

export const COLORS = Object.freeze([
  { id: 'red', name: 'Kırmızı', hex: '#e5484d', pattern: 'solid', patternName: 'düz' },
  { id: 'blue', name: 'Mavi', hex: '#2f7ae5', pattern: 'stripes', patternName: 'çizgili' },
  { id: 'green', name: 'Yeşil', hex: '#1f9d63', pattern: 'dots', patternName: 'noktalı' },
  { id: 'yellow', name: 'Sarı', hex: '#b58100', pattern: 'grid', patternName: 'kareli' },
  { id: 'purple', name: 'Mor', hex: '#8b5cf6', pattern: 'hollow', patternName: 'içi boş' },
  { id: 'orange', name: 'Turuncu', hex: '#cf6a00', pattern: 'half', patternName: 'yarım' },
]);

export const SHAPE_IDS = SHAPES.map((s) => s.id);
export const COLOR_IDS = COLORS.map((c) => c.id);

export const shapeName = (id) => SHAPES.find((s) => s.id === id)?.name ?? id;
export const colorInfo = (id) => COLORS.find((c) => c.id === id);
export const colorName = (id) => colorInfo(id)?.name ?? id;

// Ekran okuyucu ve renk-dışı ipucu için metin: "Mavi çizgili üçgen"
export function describeItem({ shape, color, count }) {
  const c = colorInfo(color);
  const base = `${c ? `${c.name} ${c.patternName} ` : ''}${shapeName(shape).toLocaleLowerCase('tr')}`;
  return count && count > 1 ? `${count} adet ${base}` : base;
}
