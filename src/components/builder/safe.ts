/*
 * Value checks shared by the block renderers (defence in depth) and the
 * server-side validation of saved pages (src/lib/pages/validate.ts).
 */

/** Site paths, in-page anchors, web, e-mail and phone links. Anything else (javascript:, data:, //host) is refused. */
export function safeHref(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (!s || s.length > 500) return undefined
  if (/^\/(?!\/)[^\s<>"'`]*$/.test(s)) return s
  if (/^#[\p{L}\p{N}_-]{1,60}$/u.test(s)) return s
  if (/^mailto:[^\s<>"'`@]+@[^\s<>"'`]+$/i.test(s)) return s
  if (/^tel:\+?[\d\s()-]{3,25}$/i.test(s)) return s
  try {
    const u = new URL(s)
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href
  } catch {
    // not a URL
  }
  return undefined
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href)

/** Images from the media library or the site's own photos. */
export function safeImage(v: unknown): string | undefined {
  return typeof v === 'string' && /^\/(uploads|images)\/[a-z0-9/_.-]+\.(jpe?g|png|webp|avif|gif|svg)$/i.test(v) && !v.includes('..') ? v : undefined
}

/** HTML id for in-page links: letters, digits and hyphens, not one the page template uses. */
export function safeAnchor(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().toLowerCase()
  if (!/^[a-z][a-z0-9-]{0,40}$/.test(s)) return undefined
  if (['icerik', 'panel-icerik', 'intro-title', 'latest-title', 'store-title', 'topics-title', 'contact-title'].includes(s)) return undefined
  return s
}

/** YouTube or Vimeo video id from a share or watch link. */
export function videoEmbed(url: unknown): { provider: 'youtube' | 'vimeo'; id: string; src: string } | null {
  if (typeof url !== 'string') return null
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') id = u.searchParams.get('v') ?? /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[1] ?? null
  if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return { provider: 'youtube', id, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = /(\d{5,12})/.exec(u.pathname)?.[1]
    if (v) return { provider: 'vimeo', id: v, src: `https://player.vimeo.com/video/${v}?autoplay=1&dnt=1` }
  }
  return null
}
