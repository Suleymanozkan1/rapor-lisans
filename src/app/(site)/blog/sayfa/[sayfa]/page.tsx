import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPosts } from '@/lib/content'
import { BlogIndex, pageParams, parsePage } from '@/components/site/BlogIndex'

export const dynamicParams = false

export function generateStaticParams() {
  return pageParams(getPublishedPosts().length)
}

export async function generateMetadata({ params }: PageProps<'/blog/sayfa/[sayfa]'>): Promise<Metadata> {
  const { sayfa } = await params
  return { title: `Yazılar, sayfa ${sayfa}`, alternates: { canonical: `/blog/sayfa/${sayfa}` } }
}

export default async function BlogPaged({ params }: PageProps<'/blog/sayfa/[sayfa]'>) {
  const posts = getPublishedPosts()
  const page = parsePage((await params).sayfa, posts.length)
  if (!page) notFound()
  return <BlogIndex title="Yazılar" posts={posts} allPublished={posts} categories={getCategories()} page={page} basePath="/blog" />
}
