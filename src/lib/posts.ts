import type { Category, Post } from './types'
import { slugify } from './slug'

/** The only visibility rule for public output (pages, sitemap, RSS, search). */
export function isPublic(post: Post, now = new Date()): boolean {
  if (post.status !== 'published' || !post.publishedAt) return false
  return new Date(post.publishedAt).getTime() <= now.getTime()
}

export function sortByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
}

export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      score: (p.category && p.category === post.category ? 2 : 0) + p.tags.filter((t) => hasTag(post, slugify(t))).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.publishedAt ?? '').localeCompare(a.p.publishedAt ?? ''))
    .slice(0, n)
    .map((x) => x.p)
}

export const PAGE_SIZE = 10

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  return { items: items.slice((page - 1) * size, page * size), page, totalPages }
}

export function categoryName(categories: Category[], slug?: string): string | undefined {
  return categories.find((c) => c.slug === slug)?.name
}

export function hasTag(post: Pick<Post, 'tags'>, slug: string): boolean {
  return post.tags.some((t) => slugify(t) === slug)
}

export type TagInfo = { slug: string; label: string; count: number }

/** Tags grouped by URL slug; the first spelling seen is used as the label. */
export function allTags(posts: Post[]): TagInfo[] {
  const m = new Map<string, TagInfo>()
  for (const p of posts)
    for (const t of p.tags) {
      const slug = slugify(t)
      const cur = m.get(slug)
      if (cur) cur.count += 1
      else m.set(slug, { slug, label: t, count: 1 })
    }
  return [...m.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'))
}

export function tagLabelFor(posts: Post[], slug: string): string {
  return allTags(posts).find((t) => t.slug === slug)?.label ?? slug
}
