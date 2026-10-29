import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { BlogIndex } from '@/components/site/BlogIndex'

export const dynamicParams = false

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps<'/kategori/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const c = getCategories().find((x) => x.slug === slug)
  if (!c) return {}
  return { title: c.name, description: c.description || undefined, alternates: { canonical: `/kategori/${slug}` } }
}

export default async function CategoryPage({ params }: PageProps<'/kategori/[slug]'>) {
  const { slug } = await params
  const c = getCategories().find((x) => x.slug === slug)
  if (!c) notFound()
  const all = getPublishedPosts()
  return (
    <BlogIndex
      title={c.name}
      intro={c.description}
      posts={all.filter((p) => p.category === slug)}
      allPublished={all}
      categories={getCategories()}
      page={1}
      basePath={`/kategori/${slug}`}
      activeCategory={slug}
    />
  )
}
