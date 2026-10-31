import type { SiteData } from '@/components/builder/site-data'
import { markdownWordCount, readingMinutes } from '../markdown'
import type { MediaItem } from '../media'
import type { Category, Post, Product, Settings } from '../types'

/** SiteData from already loaded content (site build or content store); bodies are dropped to keep it small. */
export function makeSiteData(input: { settings: Settings; posts: Post[]; products: Product[]; categories: Category[]; media: MediaItem[] }): SiteData {
  const minutes: Record<string, number> = {}
  for (const p of input.posts) minutes[p.slug] = readingMinutes(markdownWordCount(p.body))
  const counts: Record<string, number> = {}
  for (const p of input.posts) if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
  return {
    settings: input.settings,
    posts: input.posts.map((p) => ({ ...p, body: '' })),
    minutes,
    products: input.products.map((p) => ({ ...p, body: '' })),
    categories: input.categories,
    counts,
    media: input.media.map((m) => ({ src: m.src, alt: m.alt, width: m.width, height: m.height })),
  }
}
