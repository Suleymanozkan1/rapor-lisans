import type { Metadata } from 'next'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { BlogIndex } from '@/components/site/BlogIndex'

export const metadata: Metadata = {
  title: 'Yazılar',
  description: 'İş sağlığı ve güvenliği üzerine tüm yazılar: risk değerlendirmesi, mevzuat, eğitim ve saha uygulamaları.',
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  const posts = getPublishedPosts()
  return <BlogIndex title="Yazılar" posts={posts} allPublished={posts} categories={getCategories()} page={1} basePath="/blog" />
}
