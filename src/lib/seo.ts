/**
 * Serialises JSON-LD for a <script type="application/ld+json"> tag.
 * Escaping "<" prevents "</script>" in content from closing the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

export function absoluteUrl(base: string, path: string): string {
  return new URL(path, base + '/').toString()
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trimEnd() + '…'
}
