import 'server-only'
import { getDb } from './db'
import * as repo from './repo'
import { downloadPath, orderPagePath } from './links'
import { initializeCheckout, iyzicoConfig, judgeRetrieve, retrieveCheckout, IyzicoError } from '../payments/iyzico'
import { DOWNLOAD_DAYS, DOWNLOAD_LIMIT, downloadSecret } from '../shop'
import { sendMail } from '../mail'
import { siteUrl } from '../env'
import { formatPrice } from '../products'
import type { Product, Settings } from '../types'

export type BuyerInput = { name: string; surname: string; email: string; phone: string; city: string; address: string }

function log(type: string, data: Record<string, unknown>) {
  // Order ids and outcomes only: no buyer names, e-mails, addresses or tokens in logs.
  console.info(JSON.stringify({ type, at: new Date().toISOString(), ...data }))
}

export function orderLinks(o: Pick<repo.Order, 'id' | 'downloadVersion'>) {
  const secret = downloadSecret()
  if (!secret) throw new Error('DOWNLOAD_SECRET yapılandırılmamış')
  const base = siteUrl()
  return { page: base + orderPagePath(secret, o.id, o.downloadVersion), download: base + downloadPath(secret, o.id, o.downloadVersion) }
}

/** Creates the order, opens an iyzico checkout form for it and returns the payment page URL. */
export async function startCheckout(a: {
  product: Product
  buyer: BuyerInput
  ip: string
  contract: { version: string; text: string }
}): Promise<{ order: repo.Order; paymentPageUrl: string }> {
  const cfg = iyzicoConfig()
  if (!cfg || !a.product.file || a.product.price === undefined) throw new IyzicoError('Bu ürün şu an satışta değil.')
  const db = await getDb()
  const order = await repo.createOrder(db, {
    productSlug: a.product.slug,
    productTitle: a.product.title,
    filePathname: a.product.file.pathname,
    fileName: a.product.file.name,
    fileSha256: a.product.file.sha256 ?? null,
    amountKurus: Math.round(a.product.price * 100),
    currency: 'TRY',
    buyer: { ...a.buyer, ip: a.ip },
    contractVersion: a.contract.version,
    contractText: a.contract.text,
    consentAt: new Date().toISOString(),
    downloadLimit: DOWNLOAD_LIMIT,
  })
  try {
    const r = await initializeCheckout(cfg, {
      orderId: order.id,
      orderNo: order.orderNo,
      amountKurus: order.amountKurus,
      callbackUrl: `${siteUrl()}/odeme/iyzico`,
      product: { slug: order.productSlug, title: order.productTitle },
      buyer: { ...a.buyer, ip: a.ip },
    })
    await repo.setProviderToken(db, order.id, r.token)
    log('order_checkout_started', { order: order.id })
    return { order, paymentPageUrl: r.paymentPageUrl }
  } catch (e) {
    await repo.markFailed(db, order.id, e instanceof Error ? e.message : 'Ödeme başlatılamadı')
    throw e
  }
}

/**
 * Settles an order from an iyzico token (browser callback or webhook):
 * asks iyzico for the signed result and applies it. Idempotent.
 */
export async function settleByToken(token: string): Promise<repo.Order | null> {
  const cfg = iyzicoConfig()
  if (!cfg) return null
  const db = await getDb()
  const order = await repo.getOrderByToken(db, token)
  if (!order) return null
  if (order.status === 'refunded') return order
  if (order.status === 'paid') {
    // A confirmation that failed earlier is retried by any later callback, webhook or refresh.
    if (!order.emailSentAt) await sendConfirmationOnce(order.id)
    return repo.getOrder(db, order.id)
  }
  const result = await retrieveCheckout(cfg, token, order.id)
  const verdict = judgeRetrieve(cfg.secretKey, order, token, result)
  if (verdict.outcome === 'paid') {
    const paid = await repo.markPaid(db, order.id, verdict.paymentId, DOWNLOAD_DAYS)
    if (paid) log('order_paid', { order: order.id })
    // Throws if the e-mail fails: the webhook then answers 503 and iyzico retries.
    await sendConfirmationOnce(order.id)
  } else if (verdict.outcome === 'failed') {
    await repo.markFailed(db, order.id, verdict.reason)
    log('order_failed', { order: order.id, reason: verdict.reason })
  } else {
    await repo.addEvent(db, order.id, 'pending', { reason: verdict.reason })
    log('order_pending', { order: order.id, reason: verdict.reason })
  }
  return repo.getOrder(db, order.id)
}

export function confirmationMail(o: repo.Order, settings: Pick<Settings, 'siteName' | 'seller'>) {
  const links = orderLinks(o)
  const text = [
    `Merhaba ${o.buyer.name},`,
    '',
    `${settings.siteName} siparişiniz alındı ve ödemeniz onaylandı.`,
    '',
    `Sipariş numarası: ${o.orderNo}`,
    `Ürün: ${o.productTitle}`,
    `Tutar: ${formatPrice(o.amountKurus / 100)} (KDV dahil)`,
    '',
    `Dosyanızı sipariş sayfanızdan indirebilirsiniz (${DOWNLOAD_DAYS} gün ve en fazla ${o.downloadLimit} indirme):`,
    links.page,
    '',
    'Bağlantının süresi dolarsa veya sorun yaşarsanız bu e-postayı yanıtlayarak sipariş numaranızla bize yazabilirsiniz.',
    '',
    'Aşağıda, siparişi verirken onayladığınız ön bilgilendirme formu ve mesafeli satış sözleşmesinin metni yer alır. Lütfen bu e-postayı saklayın.',
    '',
    '----------------------------------------',
    o.contractText,
  ].join('\n')
  return { to: o.buyer.email, subject: `Siparişiniz: ${o.orderNo} (${o.productTitle})`, text, replyTo: settings.seller.email || undefined }
}

async function deliver(o: repo.Order) {
  const { getSettings } = await import('../content')
  await sendMail(confirmationMail(o, getSettings()))
  await repo.markEmailSent(await getDb(), o.id)
  log('order_mail_sent', { order: o.id })
}

/** First confirmation e-mail: claimed atomically so racing callers send it once; released on failure. */
async function sendConfirmationOnce(id: string) {
  const db = await getDb()
  const claimed = await repo.claimEmail(db, id)
  if (!claimed) return
  try {
    await deliver(claimed)
  } catch (e) {
    await repo.releaseEmail(db, id)
    log('order_mail_failed', { order: id, error: (e as Error).message })
    throw e
  }
}

/** Admin: send the confirmation (with a fresh link) again. */
export async function resendConfirmation(id: string, renew: boolean): Promise<repo.Order | null> {
  const db = await getDb()
  const order = renew ? await repo.renewDownload(db, id, DOWNLOAD_DAYS) : await repo.getOrder(db, id)
  if (!order || order.status !== 'paid') return null
  await deliver(order)
  return order
}
