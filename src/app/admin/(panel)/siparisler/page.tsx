import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { getDb, orderDbKind } from '@/lib/orders/db'
import { listOrders, orderStats, type OrderStatus } from '@/lib/orders/repo'
import { STATUS_LABEL } from '@/lib/orders/labels'
import { formatPrice } from '@/lib/products'
import { formatDateTime } from '@/lib/format'
import { getAdminSettings } from '@/lib/admin-content'
import { shopStatus } from '@/lib/shop'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'Siparişler' }

const FILTERS: { key: string; status?: OrderStatus; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'odendi', status: 'paid', label: 'Ödendi' },
  { key: 'bekliyor', status: 'pending', label: 'Bekliyor' },
  { key: 'basarisiz', status: 'failed', label: 'Başarısız' },
  { key: 'iade', status: 'refunded', label: 'İade' },
]

export default async function AdminOrders({ searchParams }: PageProps<'/admin/siparisler'>) {
  await requireAdmin()
  const sp = await searchParams
  const filter = FILTERS.find((f) => f.key === sp.durum) ?? FILTERS[0]
  const settings = await safeLoad(async () => (await getAdminSettings()).value)
  const status = settings.error === undefined ? shopStatus(settings.data) : null
  if (orderDbKind() === 'none') {
    return (
      <>
        <h1>Siparişler</h1>
        <div className="notice notice--warn" role="alert">
          <p>Sipariş veritabanı yapılandırılmamış. README’deki “Mağaza kurulumu” adımlarını izleyin.</p>
        </div>
        {status ? <MissingList missing={status.missing} /> : null}
      </>
    )
  }
  const r = await safeLoad(async () => {
    const db = await getDb()
    return { orders: await listOrders(db, { status: filter.status, limit: 100 }), stats: await orderStats(db) }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { orders, stats } = r.data
  return (
    <>
      <div className="admin-head">
        <h1>Siparişler</h1>
      </div>
      {status && !status.ready ? <MissingList missing={status.missing} /> : null}
      <p className="admin-muted">
        Ödenen: {stats.paidCount} sipariş, toplam {formatPrice(stats.paidKurus / 100) ?? '₺0'}. Bekleyen: {stats.pendingCount}. İadeler iyzico
        panelinden yapılır; burada yalnızca kaydı işaretlenir.
      </p>
      <nav aria-label="Duruma göre süz">
        <ul className="filter-links">
          {FILTERS.map((f) => (
            <li key={f.key}>
              <Link href={f.key ? `/admin/siparisler?durum=${f.key}` : '/admin/siparisler'} aria-current={f === filter ? 'page' : undefined}>
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {orders.length === 0 ? (
        <p className="admin-muted">Bu görünümde sipariş yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Sipariş</th>
              <th scope="col">Alıcı</th>
              <th scope="col">Ürün</th>
              <th scope="col">Tutar</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/siparisler/${o.id}`}>{o.orderNo}</Link>
                  <div className="admin-muted">{formatDateTime(o.createdAt)}</div>
                </td>
                <td>
                  {o.buyer.name} {o.buyer.surname}
                  <div className="admin-muted">{o.buyer.email}</div>
                </td>
                <td>{o.productTitle}</td>
                <td>{formatPrice(o.amountKurus / 100)}</td>
                <td>
                  <span className={`pill pill--order-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function MissingList({ missing }: { missing: string[] }) {
  return (
    <div className="notice notice--warn" role="status">
      <p>Satış kapalı. Açmak için eksikler:</p>
      <ul>
        {missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  )
}
