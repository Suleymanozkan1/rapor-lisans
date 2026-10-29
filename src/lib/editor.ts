import type { AdminPost } from './admin-content'
import { isoDay } from './format'

/** Shapes a stored post for the editor form (kept out of the client bundle's types). */
export function toEditorPost(p: AdminPost) {
  return {
    slug: p.slug,
    sha: p.sha,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    status: p.status,
    category: p.category ?? '',
    tags: p.tags.join(', '),
    coverSrc: p.cover?.src ?? '',
    coverAlt: p.cover?.alt ?? '',
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    references: p.references.map((r) => (r.url ? `${r.title} | ${r.url}` : r.title)).join('\n'),
    updatedAt: isoDay(p.updatedAt),
  }
}
