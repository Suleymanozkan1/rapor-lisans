const TR_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX = 80

/** Reserved slugs that would collide with static route segments. */
export const RESERVED_SLUGS = new Set(['sayfa', 'yeni', 'admin', 'api'])

export function slugify(input: string): string {
  return input
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)
}

/**
 * File-name part of a storage path: a slug, shortened without leaving a
 * trailing hyphen (an upload path ending in "-.pdf" is rejected).
 */
export function fileBaseName(name: string, max = 50): string {
  return (
    slugify(name.replace(/\.[^.]+$/, ''))
      .slice(0, max)
      .replace(/-+$/g, '') || 'dosya'
  )
}
