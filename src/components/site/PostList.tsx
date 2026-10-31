import Link from 'next/link'
import type { Category, Post } from '@/lib/types'
import { categoryName } from '@/lib/posts'
import { formatDate, isoDay } from '@/lib/format'
import { markdownWordCount, readingMinutes } from '@/lib/markdown'
import { SignMark } from '@/lib/visuals'
import { mediaFor } from '@/lib/content'

type Props = { posts: Post[]; categories: Category[]; headingLevel?: 2 | 3 }

function Meta({ post: p }: { post: Post }) {
  return (
    <p className="post-meta">
      <time dateTime={isoDay(p.publishedAt)}>{formatDate(p.publishedAt)}</time>
      <span>{readingMinutes(markdownWordCount(p.body))} dk okuma</span>
    </p>
  )
}

function Topic({ post: p, categories }: { post: Post; categories: Category[] }) {
  const cat = categoryName(categories, p.category)
  if (!cat) return null
  return (
    <Link className="post-topic" href={`/kategori/${p.category}`}>
      <SignMark slug={p.category} />
      {cat}
    </Link>
  )
}

function Cover({ post: p, eager = false, sizes }: { post: Post; eager?: boolean; sizes?: string }) {
  if (!p.cover) return null
  const m = mediaFor(p.cover.src)
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.cover.src} alt={p.cover.alt} width={m?.width} height={m?.height} sizes={sizes} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

/** Index rows separated by rules: lists of posts on /blog, categories, tags and related posts. */
export function PostList({ posts, categories, headingLevel = 3 }: Props) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <ul className="post-index">
      {posts.map((p) => (
        <li key={p.slug}>
          <article className="post-card post-row">
            <div className="post-row__body">
              <Topic post={p} categories={categories} />
              <H className="post-row__title">
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </H>
              {p.excerpt ? <p className="post-row__excerpt">{p.excerpt}</p> : null}
              <Meta post={p} />
            </div>
            {p.cover ? (
              <div className="post-row__media">
                <Cover post={p} />
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  )
}

/** Home "Gündem": one lead story with its photo, the next headlines as a compact list beside it. */
export function LeadStories({ posts, categories }: { posts: Post[]; categories: Category[] }) {
  const [lead, ...rest] = posts
  if (!lead) return null
  return (
    <div className="lead-stories">
      <article className="post-card lead-story">
        {lead.cover ? (
          <div className="lead-story__media">
            <Cover post={lead} sizes="(min-width: 60rem) 55vw, 100vw" />
          </div>
        ) : null}
        <Topic post={lead} categories={categories} />
        <h3 className="lead-story__title">
          <Link href={`/blog/${lead.slug}`}>{lead.title}</Link>
        </h3>
        {lead.excerpt ? <p className="lead-story__excerpt">{lead.excerpt}</p> : null}
        <Meta post={lead} />
      </article>
      {rest.length > 0 ? (
        <ul className="headline-list">
          {rest.map((p) => (
            <li key={p.slug}>
              <article className={`post-card headline${p.cover ? ' headline--thumb' : ''}`}>
                {p.cover ? (
                  <span className="headline__thumb">
                    <Cover post={p} />
                  </span>
                ) : null}
                <Topic post={p} categories={categories} />
                <h3 className="headline__title">
                  <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                </h3>
                <Meta post={p} />
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function EmptyPosts({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty" role="status">
      <strong>{title}</strong>
      {children}
    </div>
  )
}
