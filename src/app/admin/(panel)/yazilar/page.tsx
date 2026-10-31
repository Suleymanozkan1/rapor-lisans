import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, listAdminPosts } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { categoryName } from '@/lib/posts'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'

export const metadata = { title: 'Yazılar' }

export default async function AdminPosts({ searchParams }: PageProps<'/admin/yazilar'>) {
  await requireAdmin()
  const sp = await searchParams
  const filter = sp.durum === 'taslak' ? 'draft' : sp.durum === 'yayinda' ? 'published' : null
  const r = await safeLoad(async () => {
    const [posts, categories] = await Promise.all([listAdminPosts(), getAdminCategories()])
    return { posts, categories: categories.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const posts = r.data.posts.posts.filter((p) => !filter || p.status === filter)
  return (
    <>
      <div className="admin-head">
        <h1>Yazılar</h1>
        <Link className="button" href="/admin/yazilar/yeni">
          Yeni yazı
        </Link>
      </div>
      <StatusBanner code={sp.durum} />
      <nav aria-label="Duruma göre süz">
        <ul className="filter-links">
          <li>
            <Link href="/admin/yazilar" aria-current={!filter ? 'page' : undefined}>
              Tümü
            </Link>
          </li>
          <li>
            <Link href="/admin/yazilar?durum=yayinda" aria-current={filter === 'published' ? 'page' : undefined}>
              Yayında
            </Link>
          </li>
          <li>
            <Link href="/admin/yazilar?durum=taslak" aria-current={filter === 'draft' ? 'page' : undefined}>
              Taslak
            </Link>
          </li>
        </ul>
      </nav>
      {posts.length === 0 ? (
        <p className="admin-muted">Bu görünümde yazı yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Başlık</th>
              <th scope="col">Durum</th>
              <th scope="col">Kategori</th>
              <th scope="col">Son değişiklik</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.slug}>
                <td>
                  <Link href={`/admin/yazilar/${p.slug}`}>{p.title}</Link>
                  <div className="admin-muted">/{p.slug}</div>
                </td>
                <td>
                  <span className={`pill pill--${p.status}`}>{p.status === 'published' ? 'Yayında' : 'Taslak'}</span>
                </td>
                <td>{categoryName(r.data.categories, p.category) ?? 'Yok'}</td>
                <td>{formatDateTime(p.updatedAt ?? p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
