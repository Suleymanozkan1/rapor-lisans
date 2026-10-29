import Link from 'next/link'

/** hrefFor(1) must return the unpaginated URL. */
export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (n: number) => string }) {
  if (totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label="Sayfalama">
      {page > 1 ? (
        <Link className="button button--quiet" href={hrefFor(page - 1)} rel="prev">
          Önceki sayfa
        </Link>
      ) : (
        <span />
      )}
      <span className="pagination__status">
        Sayfa {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link className="button button--quiet" href={hrefFor(page + 1)} rel="next">
          Sonraki sayfa
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
