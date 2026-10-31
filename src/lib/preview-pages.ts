/*
 * Which pages of a product are shown before purchase: the first page and one
 * page picked at random from the middle of the document.
 *
 * The pick is made once, when the preview is generated, and stored with the
 * product. Picking on every visit would let anyone reload the page until they
 * had seen the whole document.
 */

/** Documents this short show only their first page; a second page would give most of it away. */
export const MIN_PAGES_FOR_MIDDLE = 4

export function pickPreviewPages(total: number, random: () => number = Math.random): number[] {
  if (!Number.isInteger(total) || total < 1) throw new Error('Geçersiz sayfa sayısı')
  if (total < MIN_PAGES_FOR_MIDDLE) return [1]
  // The middle half of the document, never the first or the last page.
  const lo = Math.max(2, Math.ceil(total * 0.25))
  const hi = Math.min(total - 1, Math.floor(total * 0.75))
  const r = Math.min(Math.max(random(), 0), 0.999999)
  return [1, lo + Math.floor(r * (hi - lo + 1))]
}
