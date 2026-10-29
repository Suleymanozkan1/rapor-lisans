import Link from 'next/link'
import type { Category, Post } from '@/lib/types'
import { categoryName } from '@/lib/posts'
import { formatDate, isoDay } from '@/lib/format'

export function PostList({ posts, categories, headingLevel = 3 }: { posts: Post[]; categories: Category[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <ol className="post-list">
      {posts.map((p) => {
        const cat = categoryName(categories, p.category)
        return (
          <li key={p.slug} className="post-row">
            <div className="post-row__meta">
              <time dateTime={isoDay(p.publishedAt)}>{formatDate(p.publishedAt)}</time>
              {cat ? (
                <Link className="post-row__cat" href={`/kategori/${p.category}`}>
                  {cat}
                </Link>
              ) : null}
            </div>
            <div>
              <H>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </H>
              {p.excerpt ? <p>{p.excerpt}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
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
