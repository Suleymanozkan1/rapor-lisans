import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminSettings, listAdminProducts } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { formatPrice } from '@/lib/products'
import { shopStatus } from '@/lib/shop'
import { isForSale } from '@/lib/types'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'

export const metadata = { title: 'Ürünler' }

export default async function AdminProducts({ searchParams }: PageProps<'/admin/urunler'>) {
  await requireAdmin()
  const sp = await searchParams
  const r = await safeLoad(async () => {
    const [list, settings] = await Promise.all([listAdminProducts(), getAdminSettings()])
    return { list, settings: settings.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { products, broken } = r.data.list
  const status = shopStatus(r.data.settings)
  return (
    <>
      <div className="admin-head">
        <h1>Ürünler</h1>
        <Link className="button" href="/admin/urunler/yeni">
          Yeni ürün
        </Link>
      </div>
      <StatusBanner code={sp.durum} />
      <p className="admin-muted">
        Ürünler sitede satılır: alıcı iyzico’nun ödeme sayfasında öder, ödeme onaylanınca dosyayı indirme bağlantısı e-postayla
        gönderilir. Fiyatı ve dosyası olmayan ürün “Yakında” olarak görünür.
      </p>
      {status.ready ? null : (
        <div className="notice notice--warn" role="status">
          <p>
            Satış kapalı. Eksikler: {status.missing.join('; ')}. <Link href="/admin/siparisler">Siparişler</Link> sayfasında da
            görünür.
          </p>
        </div>
      )}
      {broken.length > 0 ? (
        <div className="notice notice--danger" role="alert">
          <p>Okunamayan ürün dosyaları: {broken.map((b) => `${b.path} (${b.error})`).join('; ')}</p>
        </div>
      ) : null}
      {products.length === 0 ? (
        <p className="admin-muted">Henüz ürün yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Ürün</th>
              <th scope="col">Durum</th>
              <th scope="col">Fiyat</th>
              <th scope="col">Son değişiklik</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.slug}>
                <td>
                  <Link href={`/admin/urunler/${p.slug}`}>{p.title}</Link>
                  <div className="admin-muted">
                    /magaza/{p.slug}
                    {p.sample ? ' (örnek ürün)' : ''}
                  </div>
                </td>
                <td>
                  <span className={`pill pill--${p.status}`}>{p.status === 'published' ? 'Yayında' : 'Taslak'}</span>
                </td>
                <td>
                  {formatPrice(p.price) ?? 'Fiyat yok'}
                  <div className="admin-muted">{isForSale(p) ? 'Satışta' : p.sample ? 'Örnek, satılamaz' : !p.file ? 'Dosya yok' : 'Fiyat yok'}</div>
                </td>
                <td>{formatDateTime(p.updatedAt ?? p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
