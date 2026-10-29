'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { searchDocs, type SearchDoc } from '@/lib/search'
import { formatDate, isoDay } from '@/lib/format'

const PAGE = 10

export function SearchClient({ categories }: { categories: { slug: string; name: string }[] }) {
  const params = useSearchParams()
  const router = useRouter()
  const q = params.get('q') ?? ''
  const category = params.get('kategori') ?? ''
  const tag = params.get('etiket') ?? ''
  const page = Math.max(1, Number.parseInt(params.get('sayfa') ?? '1', 10) || 1)
  const [docs, setDocs] = useState<SearchDoc[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SearchDoc[]) => alive && setDocs(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const results = useMemo(
    () => (docs ? searchDocs(docs, q, { category: category || undefined, tag: tag || undefined }) : []),
    [docs, q, category, tag],
  )
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE))
  const current = Math.min(page, totalPages)
  const shown = results.slice((current - 1) * PAGE, current * PAGE)
  const active = q.trim() !== '' || category !== '' || tag !== ''

  const href = (n: number) => {
    const sp = new URLSearchParams(params.toString())
    if (n === 1) sp.delete('sayfa')
    else sp.set('sayfa', String(n))
    return `/ara?${sp.toString()}`
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const sp = new URLSearchParams()
    for (const key of ['q', 'kategori']) {
      const v = String(fd.get(key) ?? '').trim()
      if (v) sp.set(key, v)
    }
    if (tag) sp.set('etiket', tag)
    router.push(`/ara${sp.size ? `?${sp}` : ''}`)
  }

  return (
    <>
      <form className="filters" role="search" onSubmit={onSubmit} key={`${q}|${category}`}>
        <div className="search-form">
          <label htmlFor="q" className="visually-hidden">
            Aranacak kelime
          </label>
          <input id="q" type="search" name="q" defaultValue={q} placeholder="Örneğin: yüksekte çalışma" maxLength={200} />
          <button className="button" type="submit">
            Ara
          </button>
        </div>
        {categories.length > 0 ? (
          <div>
            <label htmlFor="kategori">Kategori</label>
            <select id="kategori" name="kategori" defaultValue={category}>
              <option value="">Tüm kategoriler</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </form>

      <div aria-live="polite">
        {failed ? (
          <div className="notice notice--danger" role="alert">
            <p>Arama dizini yüklenemedi. Lütfen sayfayı yenileyin.</p>
          </div>
        ) : docs === null ? (
          <p>Yükleniyor…</p>
        ) : !active ? (
          <p className="pagination__status">Aramak istediğiniz kelimeyi yazın veya bir kategori seçin.</p>
        ) : results.length === 0 ? (
          <div className="empty" role="status">
            <strong>Sonuç bulunamadı.</strong>
            <p>Farklı ya da daha az kelimeyle tekrar deneyin veya kategori filtresini kaldırın.</p>
          </div>
        ) : (
          <>
            <p className="pagination__status">{results.length} sonuç bulundu.</p>
            <ol className="post-list">
              {shown.map((d) => (
                <li key={d.slug} className="post-row">
                  <div className="post-row__meta">
                    <time dateTime={isoDay(d.publishedAt)}>{formatDate(d.publishedAt)}</time>
                    {d.categoryName ? <span className="post-row__cat">{d.categoryName}</span> : null}
                  </div>
                  <div>
                    <h2 className="post-row__title">
                      <Link href={`/blog/${d.slug}`}>{d.title}</Link>
                    </h2>
                    {d.excerpt ? <p>{d.excerpt}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
            {totalPages > 1 ? (
              <nav className="pagination" aria-label="Sayfalama">
                {current > 1 ? (
                  <Link className="button button--quiet" href={href(current - 1)}>
                    Önceki sayfa
                  </Link>
                ) : (
                  <span />
                )}
                <span className="pagination__status">
                  Sayfa {current} / {totalPages}
                </span>
                {current < totalPages ? (
                  <Link className="button button--quiet" href={href(current + 1)}>
                    Sonraki sayfa
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
