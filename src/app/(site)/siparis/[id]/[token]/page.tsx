import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle, ClockCountdown, DownloadSimple, WarningCircle, XCircle } from '@phosphor-icons/react/ssr'
import { getDb } from '@/lib/orders/db'
import { getOrder } from '@/lib/orders/repo'
import { verifyLinkToken } from '@/lib/orders/links'
import { downloadSecret } from '@/lib/shop'
import { getSettings } from '@/lib/content'
import { formatPrice } from '@/lib/products'
import { formatDateTime } from '@/lib/format'
import { refreshOrderAction } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Siparişiniz', robots: { index: false, follow: false }, referrer: 'no-referrer' }

/** Request-time page: comparing with the current time is intended here. */
function isPast(iso: string | null): boolean {
  return iso ? new Date(iso).getTime() < Date.now() : false
}

export default async function OrderPage({ params, searchParams }: PageProps<'/siparis/[id]/[token]'>) {
  const { id, token } = await params
  const sp = await searchParams
  const secret = downloadSecret()
  const db = await getDb().catch(() => null)
  const order = secret && db ? await getOrder(db, id) : null
  if (!secret || !order || !verifyLinkToken(secret, order.id, order.downloadVersion, token)) notFound()
  const s = getSettings()
  const left = Math.max(order.downloadLimit - order.downloadCount, 0)
  const expired = isPast(order.downloadExpiresAt)
  const canDownload = order.status === 'paid' && left > 0 && !expired

  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1>
            {order.status === 'paid' ? 'Siparişiniz tamamlandı' : order.status === 'pending' ? 'Ödemeniz doğrulanıyor' : order.status === 'refunded' ? 'Sipariş iade edildi' : 'Ödeme tamamlanmadı'}
          </h1>
          <p>Sipariş numarası: {order.orderNo}</p>
        </div>
      </header>
      <div className="wrap order">
        <section className="order-card" aria-labelledby="order-summary">
          <h2 id="order-summary" className="visually-hidden">
            Sipariş özeti
          </h2>
          <p className={`order-state order-state--${order.status}`}>
            {order.status === 'paid' ? <CheckCircle size={26} weight="fill" aria-hidden="true" /> : null}
            {order.status === 'pending' ? <ClockCountdown size={26} weight="fill" aria-hidden="true" /> : null}
            {order.status === 'failed' ? <XCircle size={26} weight="fill" aria-hidden="true" /> : null}
            {order.status === 'refunded' ? <WarningCircle size={26} weight="fill" aria-hidden="true" /> : null}
            <span>
              {order.status === 'paid'
                ? order.emailSentAt
                  ? `Ödemeniz onaylandı. Onay e-postası ${order.buyer.email} adresine gönderildi.`
                  : 'Ödemeniz onaylandı. Dosyanızı aşağıdan indirebilirsiniz; onay e-postası birazdan gönderilecek.'
                : order.status === 'pending'
                  ? 'Ödeme sağlayıcısından sonuç bekleniyor. Bu genellikle birkaç dakika sürer.'
                  : order.status === 'refunded'
                    ? 'Bu siparişin ödemesi iade edildi; dosya indirilemez.'
                    : 'Ödeme sağlayıcısı ödemenin alınmadığını bildirdi. Tekrar deneyebilirsiniz.'}
            </span>
          </p>
          <dl className="order-facts">
            <div>
              <dt>Ürün</dt>
              <dd>{order.productTitle}</dd>
            </div>
            <div>
              <dt>Tutar</dt>
              <dd>{formatPrice(order.amountKurus / 100)} (KDV dahil)</dd>
            </div>
            <div>
              <dt>Sipariş tarihi</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
            {order.status === 'paid' && order.downloadExpiresAt ? (
              <div>
                <dt>İndirme</dt>
                <dd>
                  {left} hak kaldı, son gün {formatDateTime(order.downloadExpiresAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          {sp.indirme === 'olmadi' ? (
            <div className="notice notice--warn" role="alert">
              <p>Dosya indirilemedi: indirme hakkı bitmiş, süresi dolmuş veya dosyaya ulaşılamıyor olabilir. Bize sipariş numaranızla yazın, yeni bağlantı gönderelim.</p>
            </div>
          ) : null}

          {canDownload ? (
            <form method="post" action={`/indir/${order.id}/${token}`}>
              <button className="button buy-box__button" type="submit">
                <DownloadSimple size={22} weight="bold" aria-hidden="true" />
                {order.fileName} dosyasını indir
              </button>
            </form>
          ) : order.status === 'paid' ? (
            <p>İndirme hakkınız bitti veya süresi doldu. Yeni bağlantı için aşağıdaki adrese sipariş numaranızla yazın.</p>
          ) : null}

          {order.status === 'pending' || (order.status === 'paid' && !order.emailSentAt) ? (
            <form action={refreshOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="token" value={token} />
              <button className="button button--ink" type="submit">
                Durumu yenile
              </button>
            </form>
          ) : null}
          {order.status === 'failed' ? (
            <Link className="button button--ink" href={`/magaza/${order.productSlug}`}>
              Ürüne dön ve tekrar dene
            </Link>
          ) : null}
          {s.seller.email ? (
            <p className="order-help">
              Sorunuz için: <a href={`mailto:${s.seller.email}?subject=${encodeURIComponent(`Sipariş ${order.orderNo}`)}`}>{s.seller.email}</a>
            </p>
          ) : null}
        </section>

        <details className="order-contract">
          <summary>Onayladığınız ön bilgilendirme formu ve mesafeli satış sözleşmesi</summary>
          <pre>{order.contractText}</pre>
        </details>
      </div>
    </>
  )
}
