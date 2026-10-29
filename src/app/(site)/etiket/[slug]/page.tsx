import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { allTags, hasTag, tagLabelFor } from '@/lib/posts'
import { BlogIndex } from '@/components/site/BlogIndex'

export const dynamicParams = false

export function generateStaticParams() {
  return allTags(getPublishedPosts()).map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: PageProps<'/etiket/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  return { title: `Etiket: ${tagLabelFor(getPublishedPosts(), slug)}`, alternates: { canonical: `/etiket/${slug}` } }
}

export default async function TagPage({ params }: PageProps<'/etiket/[slug]'>) {
  const { slug } = await params
  const all = getPublishedPosts()
  const posts = all.filter((p) => hasTag(p, slug))
  if (posts.length === 0) notFound()
  return (
    <BlogIndex title={`Etiket: ${tagLabelFor(getPublishedPosts(), slug)}`} posts={posts} allPublished={all} categories={getCategories()} page={1} basePath={`/etiket/${slug}`} activeTag={slug} />
  )
}
