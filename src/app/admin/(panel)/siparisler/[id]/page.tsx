import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getDb } from '@/lib/orders/db'
import { getOrder, listEvents } from '@/lib/orders/repo'
import { orderLinks } from '@/lib/orders/service'
import { formatPrice } from '@/lib/products'
import { formatDateTime } from '@/lib/format'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { Csrf } from '@/components/admin/Csrf'
import { orderAction } from '../../../order-actions'
import { STATUS_LABEL } from '@/lib/orders/labels'

export const metadata = { title: 'Sipariş' }

export default async function AdminOrder({ params, searchParams }: PageProps<'/admin/siparisler/[id]'>) {
  const session = await requireAdmin()
  const { id } = await params
  const sp = await searchParams
  const r = await safeLoad(async () => {
    const db = await getDb()
    const order = await getOrder(db, id)
    return order ? { order, events: await listEvents(db, id) } : null
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  if (!r.data) notFound()
  const { order: o, events } = r.data
  let pageLink: string | null = null
  try {
    pageLink = orderLinks(o).page
  } catch {
    // DOWNLOAD_SECRET missing: the panel still shows the order.
  }
  return (
    <>
      <div className="admin-head">
        <h1>Sipariş {o.orderNo}</h1>
        <Link href="/admin/siparisler">Tüm siparişler</Link>
      </div>
      <StatusBanner code={sp.durum} />
      <dl className="admin-facts">
        <dt>Durum</dt>
        <dd>
          <span className={`pill pill--order-${o.status}`}>{STATUS_LABEL[o.status]}</span>
          {o.failureReason ? ` (${o.failureReason})` : ''}
        </dd>
        <dt>Ürün</dt>
        <dd>
          <Link href={`/admin/urunler/${o.productSlug}`}>{o.productTitle}</Link> ({o.fileName})
        </dd>
        <dt>Tutar</dt>
        <dd>{formatPrice(o.amountKurus / 100)}</dd>
        <dt>Alıcı</dt>
        <dd>
          {o.buyer.name} {o.buyer.surname}, <a href={`mailto:${o.buyer.email}`}>{o.buyer.email}</a>, {o.buyer.phone}
        </dd>
        <dt>Fatura adresi</dt>
        <dd>
          {o.buyer.address}, {o.buyer.city}
        </dd>
        <dt>Oluşturma</dt>
        <dd>{formatDateTime(o.createdAt)}</dd>
        <dt>Ödeme</dt>
        <dd>{o.paidAt ? `${formatDateTime(o.paidAt)}, iyzico ödeme no: ${o.paymentId}` : 'Yok'}</dd>
        <dt>İndirme</dt>
        <dd>
          {o.downloadCount} / {o.downloadLimit}
          {o.downloadExpiresAt ? `, son gün ${formatDateTime(o.downloadExpiresAt)}` : ''}
        </dd>
        <dt>E-posta</dt>
        <dd>{o.emailSentAt ? `Gönderildi (${formatDateTime(o.emailSentAt)})` : 'Gönderilmedi'}</dd>
        <dt>Teslim edilen dosya</dt>
        <dd>
          {o.fileName}
          {o.fileSha256 ? (
            <>
              , SHA-256 <code>{o.fileSha256}</code>
            </>
          ) : null}
        </dd>
        <dt>Fatura</dt>
        <dd>{o.invoiceNo ? `e-Arşiv fatura no: ${o.invoiceNo}` : 'Kaydedilmedi'}</dd>
        <dt>Onay</dt>
        <dd>
          Sözleşme sürümü {o.contractVersion}, onay zamanı {formatDateTime(o.consentAt)}, IP {o.buyer.ip}
        </dd>
      </dl>

      <div className="admin-actions">
        {o.status === 'paid' ? (
          <>
            <Act csrf={session.csrf} id={o.id} intent="eposta" label="Onay e-postasını yeniden gönder" />
            <Act csrf={session.csrf} id={o.id} intent="yeni-baglanti" label="Yeni indirme bağlantısı gönder" quiet={false} />
          </>
        ) : null}
        {o.status === 'pending' || o.status === 'failed' ? <Act csrf={session.csrf} id={o.id} intent="sorgula" label="iyzico’dan durumu sorgula" /> : null}
      </div>
      {o.status === 'paid' && pageLink ? (
        <p className="admin-muted">
          Alıcının sipariş sayfası (e-posta ulaşmazsa elle iletebilirsiniz): <code>{pageLink}</code>
        </p>
      ) : null}

      {o.status === 'paid' ? (
        <form action={orderAction} className="admin-form">
          <Csrf token={session.csrf} />
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="intent" value="fatura" />
          <h2>e-Arşiv fatura</h2>
          <p className="admin-muted">
            Bu satış için e-Arşiv fatura düzenleyip alıcının e-posta adresine gönderin (GİB e-Arşiv Portal veya entegratörünüz). Faturada
            “Bu satış internet üzerinden yapılmıştır.” ibaresi, web adresi, ödeme şekli (kredi/banka kartı), ödeme tarihi ve teslim
            tarihi yer almalıdır. Kesin kurallar için mali müşavirinize danışın.
          </p>
          <div className="field">
            <label htmlFor="invoiceNo">Fatura numarası</label>
            <input id="invoiceNo" name="invoiceNo" type="text" maxLength={40} defaultValue={o.invoiceNo ?? ''} />
          </div>
          <button className="button button--quiet" type="submit">
            Fatura numarasını kaydet
          </button>
        </form>
      ) : null}

      {o.status === 'paid' ? (
        <form action={orderAction} className="admin-form">
          <Csrf token={session.csrf} />
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="intent" value="iade" />
          <h2>İade kaydı</h2>
          <p className="admin-muted">Önce ödemeyi iyzico panelinden iade edin. Burada işaretlemek indirme bağlantısını kapatır.</p>
          <div className="field">
            <label htmlFor="confirm">
              Onaylamak için sipariş numarasını yazın: <code>{o.orderNo}</code>
            </label>
            <input id="confirm" name="confirm" type="text" required autoComplete="off" />
          </div>
          <button className="button button--danger" type="submit">
            İade edildi olarak işaretle
          </button>
        </form>
      ) : null}

      <h2>Olaylar</h2>
      <ul className="admin-events">
        {events.map((e, i) => (
          <li key={i}>
            {formatDateTime(e.at)}: {e.type}
            {Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : ''}
          </li>
        ))}
      </ul>

      <details>
        <summary>Alıcının onayladığı metin</summary>
        <pre className="admin-code admin-pre">{o.contractText}</pre>
      </details>
    </>
  )
}

function Act({ csrf, id, intent, label, quiet = true }: { csrf: string; id: string; intent: string; label: string; quiet?: boolean }) {
  return (
    <form action={orderAction}>
      <Csrf token={csrf} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <button className={`button${quiet ? ' button--quiet' : ''}`} type="submit">
        {label}
      </button>
    </form>
  )
}
