import type { MetadataRoute } from 'next'
import { getCategories, getPublishedPosts, getPublishedProducts } from '@/lib/content'
import { allTags } from '@/lib/posts'
import { siteUrl } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const posts = getPublishedPosts()
  const latest = posts[0]?.updatedAt ?? posts[0]?.publishedAt
  // Demo products are noindex, so they stay out of the sitemap.
  const products = getPublishedProducts().filter((p) => !p.sample)
  const usedCats = getCategories().filter((c) => posts.some((p) => p.category === c.slug))
  return [
    { url: `${base}/`, lastModified: latest },
    { url: `${base}/blog`, lastModified: latest },
    { url: `${base}/magaza` },
    { url: `${base}/hakkimda` },
    { url: `${base}/iletisim` },
    { url: `${base}/gizlilik` },
    { url: `${base}/satis-bilgileri` },
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt })),
    ...products.map((p) => ({ url: `${base}/magaza/${p.slug}`, lastModified: p.updatedAt ?? p.createdAt })),
    ...usedCats.map((c) => ({ url: `${base}/kategori/${c.slug}` })),
    ...allTags(posts).map((t) => ({ url: `${base}/etiket/${t.slug}` })),
  ]
}
