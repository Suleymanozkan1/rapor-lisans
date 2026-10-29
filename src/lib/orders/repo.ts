import { randomBytes, randomUUID } from 'node:crypto'
import type { Db } from './db'

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type Order = {
  id: string
  orderNo: string
  status: OrderStatus
  productSlug: string
  productTitle: string
  filePathname: string
  fileName: string
  fileSha256: string | null
  amountKurus: number
  currency: string
  buyer: { name: string; surname: string; email: string; phone: string; city: string; address: string; ip: string }
  contractVersion: string
  contractText: string
  consentAt: string
  providerToken: string | null
  paymentId: string | null
  failureReason: string | null
  downloadVersion: number
  downloadCount: number
  downloadLimit: number
  downloadExpiresAt: string | null
  emailSentAt: string | null
  invoiceNo: string | null
  createdAt: string
  paidAt: string | null
}

export type OrderEvent = { at: string; type: string; detail: Record<string, unknown> }

type Row = Record<string, unknown>

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString())

function toOrder(r: Row): Order {
  return {
    id: String(r.id),
    orderNo: String(r.order_no),
    status: r.status as OrderStatus,
    productSlug: String(r.product_slug),
    productTitle: String(r.product_title),
    filePathname: String(r.file_pathname),
    fileName: String(r.file_name),
    fileSha256: (r.file_sha256 as string | null) ?? null,
    amountKurus: Number(r.amount_kurus),
    currency: String(r.currency),
    buyer: {
      name: String(r.buyer_name),
      surname: String(r.buyer_surname),
      email: String(r.buyer_email),
      phone: String(r.buyer_phone),
      city: String(r.buyer_city),
      address: String(r.buyer_address),
      ip: String(r.buyer_ip),
    },
    contractVersion: String(r.contract_version),
    contractText: String(r.contract_text),
    consentAt: iso(r.consent_at)!,
    providerToken: (r.provider_token as string | null) ?? null,
    paymentId: (r.payment_id as string | null) ?? null,
    failureReason: (r.failure_reason as string | null) ?? null,
    downloadVersion: Number(r.download_version),
    downloadCount: Number(r.download_count),
    downloadLimit: Number(r.download_limit),
    downloadExpiresAt: iso(r.download_expires_at),
    emailSentAt: iso(r.email_sent_at),
    invoiceNo: (r.invoice_no as string | null) ?? null,
    createdAt: iso(r.created_at)!,
    paidAt: iso(r.paid_at),
  }
}

const one = (rows: Row[]) => (rows[0] ? toOrder(rows[0]) : null)

/** Readable, unguessable enough for support ("GC-20261029-K7Q2XM"); the id stays the real key. */
export function newOrderNo(now = new Date()): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  const suffix = [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
  return `GC-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`
}

export type NewOrder = Omit<
  Order,
  | 'id'
  | 'orderNo'
  | 'status'
  | 'providerToken'
  | 'paymentId'
  | 'failureReason'
  | 'downloadVersion'
  | 'downloadCount'
  | 'downloadExpiresAt'
  | 'emailSentAt'
  | 'invoiceNo'
  | 'createdAt'
  | 'paidAt'
>

export async function createOrder(db: Db, o: NewOrder): Promise<Order> {
  const rows = await db.query(
    `INSERT INTO orders (id, order_no, status, product_slug, product_title, file_pathname, file_name, amount_kurus, currency,
       buyer_name, buyer_surname, buyer_email, buyer_phone, buyer_city, buyer_address, buyer_ip,
       contract_version, contract_text, consent_at, download_limit, file_sha256)
     VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      randomUUID(),
      newOrderNo(),
      o.productSlug,
      o.productTitle,
      o.filePathname,
      o.fileName,
      o.amountKurus,
      o.currency,
      o.buyer.name,
      o.buyer.surname,
      o.buyer.email,
      o.buyer.phone,
      o.buyer.city,
      o.buyer.address,
      o.buyer.ip,
      o.contractVersion,
      o.contractText,
      o.consentAt,
      o.downloadLimit,
      o.fileSha256,
    ],
  )
  const order = one(rows)!
  await addEvent(db, order.id, 'created', { amountKurus: o.amountKurus, product: o.productSlug })
  return order
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getOrder(db: Db, id: string): Promise<Order | null> {
  if (!UUID.test(id)) return null
  return one(await db.query('SELECT * FROM orders WHERE id = $1', [id]))
}

export async function getOrderByToken(db: Db, token: string): Promise<Order | null> {
  if (!token || token.length > 200) return null
  return one(await db.query('SELECT * FROM orders WHERE provider_token = $1', [token]))
}

export async function setProviderToken(db: Db, id: string, token: string) {
  await db.query('UPDATE orders SET provider_token = $2, updated_at = now() WHERE id = $1 AND status = $3', [id, token, 'pending'])
}

/**
 * pending (or failed) -> paid, exactly once. Returns the order only for the
 * caller that made the transition, so the e-mail is sent once even when the
 * browser callback and the webhook race. "failed" is included because a
 * failure can be recorded from an error response; a later *verified*
 * SUCCESS for the same token must still deliver. Refunded orders never
 * return to paid.
 */
export async function markPaid(db: Db, id: string, paymentId: string, validDays: number): Promise<Order | null> {
  const order = one(
    await db.query(
      `UPDATE orders SET status = 'paid', payment_id = $2, paid_at = now(), updated_at = now(),
         download_expires_at = now() + make_interval(days => $3::int)
       WHERE id = $1 AND status IN ('pending', 'failed') RETURNING *`,
      [id, paymentId, validDays],
    ),
  )
  if (order) await addEvent(db, id, 'paid', { paymentId })
  return order
}

export async function markFailed(db: Db, id: string, reason: string): Promise<Order | null> {
  const order = one(
    await db.query(
      `UPDATE orders SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id, reason.slice(0, 300)],
    ),
  )
  if (order) await addEvent(db, id, 'failed', { reason: reason.slice(0, 300) })
  return order
}

/** Counts a download if the order is paid, unexpired and under its limit; atomic. */
export async function consumeDownload(db: Db, id: string, version: number): Promise<Order | null> {
  return one(
    await db.query(
      `UPDATE orders SET download_count = download_count + 1, updated_at = now()
       WHERE id = $1 AND status = 'paid' AND download_version = $2 AND download_count < download_limit
         AND download_expires_at > now()
       RETURNING *`,
      [id, version],
    ),
  )
}

/** Admin: issue a fresh link (old links stop working), reset the counter, extend the expiry. */
export async function renewDownload(db: Db, id: string, validDays: number): Promise<Order | null> {
  const order = one(
    await db.query(
      `UPDATE orders SET download_version = download_version + 1, download_count = 0, updated_at = now(),
         download_expires_at = now() + make_interval(days => $2::int)
       WHERE id = $1 AND status = 'paid' RETURNING *`,
      [id, validDays],
    ),
  )
  if (order) await addEvent(db, id, 'link_renewed', {})
  return order
}

/** Admin, after refunding in the iyzico panel: the download stops working. */
export async function markRefunded(db: Db, id: string): Promise<Order | null> {
  const order = one(
    await db.query(`UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1 AND status = 'paid' RETURNING *`, [id]),
  )
  if (order) await addEvent(db, id, 'refunded', {})
  return order
}

export async function setInvoiceNo(db: Db, id: string, invoiceNo: string) {
  const v = invoiceNo.trim().slice(0, 40)
  await db.query('UPDATE orders SET invoice_no = $2, updated_at = now() WHERE id = $1', [id, v || null])
  await addEvent(db, id, 'invoice', { invoiceNo: v })
}

export async function markEmailSent(db: Db, id: string) {
  await db.query('UPDATE orders SET email_sent_at = now(), updated_at = now() WHERE id = $1', [id])
}

export async function addEvent(db: Db, id: string, type: string, detail: Record<string, unknown>) {
  await db.query('INSERT INTO order_events (order_id, type, detail) VALUES ($1, $2, $3::jsonb)', [id, type, JSON.stringify(detail)])
}

export async function listEvents(db: Db, id: string): Promise<OrderEvent[]> {
  const rows = await db.query('SELECT at, type, detail FROM order_events WHERE order_id = $1 ORDER BY at, id', [id])
  return rows.map((r) => ({ at: iso(r.at)!, type: String(r.type), detail: (typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail) as Record<string, unknown> }))
}

export async function listOrders(db: Db, opts: { status?: OrderStatus; limit?: number; offset?: number } = {}): Promise<Order[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)
  const offset = Math.max(opts.offset ?? 0, 0)
  const rows = opts.status
    ? await db.query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [opts.status, limit, offset])
    : await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset])
  return rows.map(toOrder)
}

export async function orderStats(db: Db): Promise<{ paidCount: number; paidKurus: number; pendingCount: number }> {
  const [r] = await db.query(
    `SELECT count(*) FILTER (WHERE status = 'paid') AS paid_count,
            coalesce(sum(amount_kurus) FILTER (WHERE status = 'paid'), 0) AS paid_kurus,
            count(*) FILTER (WHERE status = 'pending') AS pending_count
     FROM orders`,
  )
  return { paidCount: Number(r.paid_count), paidKurus: Number(r.paid_kurus), pendingCount: Number(r.pending_count) }
}
