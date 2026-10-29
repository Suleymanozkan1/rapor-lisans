import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getPublishedPost, getPublishedPosts, getSettings, mediaFor } from '@/lib/content'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'
import { relatedPosts, categoryName } from '@/lib/posts'
import { siteUrl } from '@/lib/env'
import { absoluteUrl, clip, jsonLd } from '@/lib/seo'
import { ArticleView } from '@/components/site/ArticleView'

export const dynamicParams = false

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const post = getPublishedPost((await params).slug)
  if (!post) return {}
  const s = getSettings()
  const description = post.seoDescription || post.excerpt || clip(markdownToPlainText(post.body), 160)
  const image = post.cover?.src || s.seo.defaultOgImage || undefined
  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: s.author.name, url: '/hakkimda' }],
    openGraph: {
      type: 'article',
      title: post.seoTitle || post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [s.author.name],
      tags: post.tags,
      images: image ? [{ url: image, alt: post.cover?.alt }] : undefined,
    },
  }
}

export default async function PostPage({ params }: PageProps<'/blog/[slug]'>) {
  const post = getPublishedPost((await params).slug)
  if (!post) notFound()
  const settings = getSettings()
  const categories = getCategories()
  const rendered = await renderMarkdown(post.body)
  const base = siteUrl()
  const url = absoluteUrl(base, `/blog/${post.slug}`)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: url,
    url,
    inLanguage: 'tr-TR',
    articleSection: categoryName(categories, post.category),
    keywords: post.tags.length ? post.tags.join(', ') : undefined,
    image: post.cover ? absoluteUrl(base, post.cover.src) : undefined,
    author: { '@type': 'Person', name: settings.author.name, url: absoluteUrl(base, '/hakkimda') },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <ArticleView
        post={post}
        rendered={rendered}
        settings={settings}
        categories={categories}
        cover={mediaFor(post.cover?.src)}
        related={relatedPosts(post, getPublishedPosts())}
        shareUrl={url}
      />
    </>
  )
}
