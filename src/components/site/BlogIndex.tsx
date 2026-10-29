import Link from 'next/link'
import type { Category, Post } from '@/lib/types'
import { allTags, paginate } from '@/lib/posts'
import { PostList, EmptyPosts } from './PostList'
import { Pagination } from './Pagination'

type Props = {
  title: string
  intro?: string
  posts: Post[]
  allPublished: Post[]
  categories: Category[]
  page: number
  basePath: string
  activeCategory?: string
  activeTag?: string
}

/** Shared by /blog, /kategori/[slug] and /etiket/[slug] (all statically generated). */
export function BlogIndex({ title, intro, posts, allPublished, categories, page, basePath, activeCategory, activeTag }: Props) {
  const { items, totalPages } = paginate(posts, page)
  const tags = allTags(allPublished).slice(0, 30)
  const usedCats = categories.filter((c) => allPublished.some((p) => p.category === c.slug))
  return (
    <div className="wrap">
      <header className="page-head">
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
      </header>

      <div className="filters">
        <form className="search-form" action="/ara" method="get" role="search">
          <label htmlFor="blog-q" className="visually-hidden">
            Yazılarda ara
          </label>
          <input id="blog-q" type="search" name="q" placeholder="Yazılarda ara" />
          <button className="button" type="submit">
            Ara
          </button>
        </form>
        <div>
          {usedCats.length > 0 ? (
            <nav aria-label="Kategoriler">
              <ul className="filter-links">
                <li>
                  <Link href="/blog" aria-current={!activeCategory && !activeTag ? 'page' : undefined}>
                    Tümü
                  </Link>
                </li>
                {usedCats.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/kategori/${c.slug}`} aria-current={activeCategory === c.slug ? 'page' : undefined}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {tags.length > 0 ? (
            <details className="tag-filter" open={Boolean(activeTag)}>
              <summary>Etiketler</summary>
              <ul className="filter-links">
                {tags.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/etiket/${t.slug}`} aria-current={activeTag === t.slug ? 'page' : undefined}>
                      {t.label} ({t.count})
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>

      {items.length > 0 ? (
        <PostList posts={items} categories={categories} headingLevel={2} />
      ) : (
        <EmptyPosts title="Henüz yayımlanmış yazı yok.">
          <p>Yeni yazılar eklendiğinde burada listelenecek.</p>
        </EmptyPosts>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={(n) => (n === 1 ? basePath : `${basePath}/sayfa/${n}`)} />
    </div>
  )
}

export function pageParams(count: number, size = 10): { sayfa: string }[] {
  const total = Math.ceil(count / size)
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ sayfa: String(i + 2) }))
}

export function parsePage(raw: string, count: number, size = 10): number | null {
  if (!/^[1-9][0-9]{0,4}$/.test(raw)) return null
  const n = Number(raw)
  return n >= 2 && n <= Math.ceil(count / size) ? n : null
}
