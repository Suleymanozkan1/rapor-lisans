import type { MetadataRoute } from 'next'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { allTags } from '@/lib/posts'
import { siteUrl } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const posts = getPublishedPosts()
  const latest = posts[0]?.updatedAt ?? posts[0]?.publishedAt
  const usedCats = getCategories().filter((c) => posts.some((p) => p.category === c.slug))
  return [
    { url: `${base}/`, lastModified: latest },
    { url: `${base}/blog`, lastModified: latest },
    { url: `${base}/hakkimda` },
    { url: `${base}/iletisim` },
    { url: `${base}/gizlilik` },
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt })),
    ...usedCats.map((c) => ({ url: `${base}/kategori/${c.slug}` })),
    ...allTags(posts).map((t) => ({ url: `${base}/etiket/${t.slug}` })),
  ]
}
