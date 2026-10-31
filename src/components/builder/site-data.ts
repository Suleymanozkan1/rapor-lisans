import type { Category, Post, Product, Settings } from '@/lib/types'
import type { SiteLookup } from '@/components/site/views/lookup'

/**
 * Everything the data-driven blocks (latest posts, products, slider, …)
 * read. Built on the server from the content files for the site, and from
 * the content store for the editor, then handed to Puck as `metadata`.
 */
export type SiteData = {
  settings: Settings
  /** Published posts, newest first; bodies dropped (reading time is in `minutes`). */
  posts: Post[]
  minutes: Record<string, number>
  products: Product[]
  categories: Category[]
  /** Published posts per category slug. */
  counts: Record<string, number>
  media: { src: string; alt: string; width?: number; height?: number }[]
}

export function lookupFrom(d: SiteData): SiteLookup {
  return {
    dims: (src) => d.media.find((m) => m.src === src),
    logo: d.settings.logo,
    minutes: (p) => d.minutes[p.slug] ?? 1,
  }
}
