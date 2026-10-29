import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { BlogIndex, pageParams, parsePage } from '@/components/site/BlogIndex'

export const dynamicParams = false

export function generateStaticParams() {
  const all = getPublishedPosts()
  return getCategories().flatMap((c) => pageParams(all.filter((p) => p.category === c.slug).length).map((x) => ({ slug: c.slug, ...x })))
}

export async function generateMetadata({ params }: PageProps<'/kategori/[slug]/sayfa/[sayfa]'>): Promise<Metadata> {
  const { slug, sayfa } = await params
  const c = getCategories().find((x) => x.slug === slug)
  return { title: `${c?.name ?? slug}, sayfa ${sayfa}`, alternates: { canonical: `/kategori/${slug}/sayfa/${sayfa}` } }
}

export default async function CategoryPaged({ params }: PageProps<'/kategori/[slug]/sayfa/[sayfa]'>) {
  const { slug, sayfa } = await params
  const c = getCategories().find((x) => x.slug === slug)
  if (!c) notFound()
  const all = getPublishedPosts()
  const posts = all.filter((p) => p.category === slug)
  const page = parsePage(sayfa, posts.length)
  if (!page) notFound()
  return (
    <BlogIndex title={c.name} intro={c.description} posts={posts} allPublished={all} categories={getCategories()} page={page} basePath={`/kategori/${slug}`} activeCategory={slug} />
  )
}
