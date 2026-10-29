import Link from 'next/link'
import { CalendarBlank, Clock } from '@phosphor-icons/react/ssr'
import type { Category, Post } from '@/lib/types'
import { categoryName } from '@/lib/posts'
import { formatDate, isoDay } from '@/lib/format'
import { markdownWordCount, readingMinutes } from '@/lib/markdown'
import { CategoryIcon } from '@/lib/visuals'
import { mediaFor } from '@/lib/content'

type Props = {
  posts: Post[]
  categories: Category[]
  headingLevel?: 2 | 3
  /** First post becomes a large feature card (home page). */
  featured?: boolean
}

export function PostList({ posts, categories, headingLevel = 3, featured = false }: Props) {
  return (
    <ul className={`post-grid${featured ? ' post-grid--featured' : ''}`}>
      {posts.map((p, i) => (
        <li key={p.slug} className="reveal">
          <PostCard post={p} categories={categories} headingLevel={headingLevel} feature={featured && i === 0} />
        </li>
      ))}
    </ul>
  )
}

export function PostCard({ post: p, categories, headingLevel, feature }: { post: Post; categories: Category[]; headingLevel: 2 | 3; feature?: boolean }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  const cat = categoryName(categories, p.category)
  const cover = p.cover ? mediaFor(p.cover.src) : undefined
  return (
    <article className={`post-card${feature ? ' post-card--feature' : ''}`}>
      {p.cover ? (
        <div className="post-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.cover.src} alt={p.cover.alt} width={cover?.width} height={cover?.height} loading="lazy" decoding="async" />
        </div>
      ) : feature ? (
        <span className="post-card__watermark">
          <CategoryIcon slug={p.category} size={260} />
        </span>
      ) : null}
      <div className="post-card__body">
        {cat ? (
          <Link className="chip post-card__cat" href={`/kategori/${p.category}`}>
            <CategoryIcon slug={p.category} size={16} />
            {cat}
          </Link>
        ) : null}
        <H>
          <Link href={`/blog/${p.slug}`}>{p.title}</Link>
        </H>
        {p.excerpt ? <p>{p.excerpt}</p> : null}
        <div className="post-card__meta">
          <span>
            <CalendarBlank size={16} aria-hidden="true" />
            <time dateTime={isoDay(p.publishedAt)}>{formatDate(p.publishedAt)}</time>
          </span>
          <span>
            <Clock size={16} aria-hidden="true" />
            {readingMinutes(markdownWordCount(p.body))} dk okuma
          </span>
        </div>
      </div>
    </article>
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
