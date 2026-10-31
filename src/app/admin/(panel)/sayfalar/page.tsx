import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { listAdminPages } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { pagePath } from '@/lib/pages/model'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { NewPageForm } from './NewPageForm'

export const metadata = { title: 'Sayfalar' }

export default async function AdminPages({ searchParams }: PageProps<'/admin/sayfalar'>) {
  const session = await requireAdmin()
  const sp = await searchParams
  const r = await safeLoad(() => listAdminPages())
  if (r.error !== undefined) return <LoadError message={r.error} />
  return (
    <>
      <div className="admin-head">
        <h1>Sayfalar</h1>
      </div>
      <StatusBanner code={sp.durum} />
      <p className="admin-muted">
        Sayfaları bloklarla sürükle-bırak düzenleyin: bölümler, sütunlar, başlık, metin, görsel, düğmeler, kartlar, sık sorulanlar,
        sekmeler, video, galeri ve sitenin kendi blokları (vitrin slaytı, son yazılar, ürünler, konu dizini). Kaydettiğiniz sayfa
        yaklaşık bir dakika içinde sitede güncellenir. Yazılar ve ürünler kendi bölümlerinden düzenlenir.
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Sayfa</th>
            <th scope="col">Adres</th>
            <th scope="col">Durum</th>
            <th scope="col">
              <span className="visually-hidden">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {r.data.map((p) => (
            <tr key={p.key}>
              <td>
                <Link href={`/admin/duzenleyici/${p.key}`}>{p.meta.title}</Link>
                {p.system ? <span className="admin-muted"> (sistem sayfası)</span> : null}
              </td>
              <td>
                <code>{pagePath(p.key)}</code>
              </td>
              <td>
                {p.system ? (p.saved ? 'Yayında' : 'Yayında (varsayılan düzen)') : p.meta.status === 'published' ? 'Yayında' : 'Taslak'}
                {p.meta.menu ? ', menüde' : ''}
              </td>
              <td className="admin-table__actions">
                <Link className="button button--quiet" href={`/admin/duzenleyici/${p.key}`}>
                  Düzenle
                </Link>
                {p.system ? null : (
                  <Link className="button button--quiet" href={`/admin/sayfalar/${p.key}/sil`}>
                    Sil
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <NewPageForm csrf={session.csrf} />
    </>
  )
}
