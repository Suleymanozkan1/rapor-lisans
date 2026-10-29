import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, getAdminSettings, listAdminPosts, recentActivity } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'Özet' }

export default async function Dashboard() {
  await requireAdmin()
  const r = await safeLoad(async () => {
    const [posts, settings, categories, activity] = await Promise.all([listAdminPosts(), getAdminSettings(), getAdminCategories(), recentActivity(8)])
    return { posts, settings: settings.value, categories: categories.value, activity }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { posts, settings, categories, activity } = r.data
  const published = posts.posts.filter((p) => p.status === 'published').length
  const drafts = posts.posts.length - published

  const missing: { label: string; href: string }[] = []
  if (!settings.author.shortBio) missing.push({ label: 'Kısa biyografi (ana sayfa)', href: '/admin/ayarlar#yazar' })
  if (!settings.author.bio) missing.push({ label: 'Hakkımda metni', href: '/admin/ayarlar#yazar' })
  if (!settings.contact.email && !settings.contact.phone) missing.push({ label: 'İletişim bilgisi', href: '/admin/ayarlar#iletisim' })
  if (!settings.description) missing.push({ label: 'Site açıklaması (SEO)', href: '/admin/ayarlar#site' })
  if (categories.length === 0) missing.push({ label: 'Kategoriler', href: '/admin/kategoriler' })

  return (
    <>
      <h1>Özet</h1>
      <dl className="admin-stats">
        <div>
          <dt>Yayında</dt>
          <dd>{published}</dd>
        </div>
        <div>
          <dt>Taslak</dt>
          <dd>{drafts}</dd>
        </div>
        <div>
          <dt>Kategori</dt>
          <dd>{categories.length}</dd>
        </div>
      </dl>
      <p>
        <Link className="button" href="/admin/yazilar/yeni">
          Yeni yazı
        </Link>
      </p>

      {posts.broken.length > 0 ? (
        <div className="notice notice--danger" role="alert">
          <p>Okunamayan içerik dosyaları var:</p>
          <ul>
            {posts.broken.map((b) => (
              <li key={b.path}>
                <code>{b.path}</code>: {b.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <section className="admin-section">
          <h2>Eksik bilgiler</h2>
          <p className="admin-muted">Bu alanlar boşken sitede ilgili bölümler gizlenir. Yalnızca doğrulanmış bilgileri girin.</p>
          <ul>
            {missing.map((m) => (
              <li key={m.label}>
                <Link href={m.href}>{m.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-section">
        <h2>Son işlemler</h2>
        {activity.length === 0 ? (
          <p className="admin-muted">Henüz kayıt yok.</p>
        ) : (
          <ul className="admin-log">
            {activity.map((a) => (
              <li key={a.sha}>
                <time dateTime={a.date}>{formatDateTime(a.date)}</time> {a.message.split('\n')[0]}
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/kayitlar">Tüm kayıtlar</Link>
      </section>
    </>
  )
}
