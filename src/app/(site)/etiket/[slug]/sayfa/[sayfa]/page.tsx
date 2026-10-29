import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { allTags, hasTag, tagLabelFor } from '@/lib/posts'
import { BlogIndex, pageParams, parsePage } from '@/components/site/BlogIndex'

export const dynamicParams = false

export function generateStaticParams() {
  return allTags(getPublishedPosts()).flatMap((t) => pageParams(t.count).map((x) => ({ slug: t.slug, ...x })))
}

export async function generateMetadata({ params }: PageProps<'/etiket/[slug]/sayfa/[sayfa]'>): Promise<Metadata> {
  const { slug, sayfa } = await params
  return { title: `Etiket: ${tagLabelFor(getPublishedPosts(), slug)}, sayfa ${sayfa}`, alternates: { canonical: `/etiket/${slug}/sayfa/${sayfa}` } }
}

export default async function TagPaged({ params }: PageProps<'/etiket/[slug]/sayfa/[sayfa]'>) {
  const { slug, sayfa } = await params
  const all = getPublishedPosts()
  const posts = all.filter((p) => hasTag(p, slug))
  const page = parsePage(sayfa, posts.length)
  if (!page) notFound()
  return (
    <BlogIndex title={`Etiket: ${tagLabelFor(getPublishedPosts(), slug)}`} posts={posts} allPublished={all} categories={getCategories()} page={page} basePath={`/etiket/${slug}`} activeTag={slug} />
  )
}
