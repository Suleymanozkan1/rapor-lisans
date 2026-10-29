import { getCategories, getPublishedPosts } from '@/lib/content'
import { markdownToPlainText } from '@/lib/markdown'
import { categoryName } from '@/lib/posts'
import type { SearchDoc } from '@/lib/search'

export const dynamic = 'force-static'

/** Only published posts are indexed; drafts never reach this file. */
export function GET() {
  const categories = getCategories()
  const docs: SearchDoc[] = getPublishedPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    categoryName: categoryName(categories, p.category),
    tags: p.tags,
    publishedAt: p.publishedAt,
    text: markdownToPlainText(p.body).slice(0, 5000),
  }))
  return Response.json(docs, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
}
