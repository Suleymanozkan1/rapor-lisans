import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminSettings, listAdminProducts } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { formatPrice } from '@/lib/products'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'

export const metadata = { title: 'Ürünler' }

export default async function AdminProducts({ searchParams }: PageProps<'/admin/urunler'>) {
  await requireAdmin()
  const sp = await searchParams
  const r = await safeLoad(async () => ({ list: await listAdminProducts(), settings: (await getAdminSettings()).value }))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { products, broken } = r.data.list
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
        Ürünler sitede vitrin olarak listelenir; “Shopier’de satın al” düğmesi ürünün Shopier sayfasını açar. Ödeme, teslimat,
        fatura ve iade Shopier’de yürür, site sipariş bilgisi tutmaz.
        {r.data.settings.shop.url ? null : (
          <>
            {' '}
            Mağaza adresini <Link href="/admin/ayarlar#magaza">site ayarlarından</Link> ekleyebilirsiniz.
          </>
        )}
      </p>
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
                <td>{formatPrice(p.price) ?? 'Shopier’de'}</td>
                <td>{formatDateTime(p.updatedAt ?? p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
