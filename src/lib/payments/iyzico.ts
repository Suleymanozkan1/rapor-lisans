import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/*
 * iyzico Checkout Form (hosted payment page) over plain fetch.
 * Spec: docs.iyzico.com (HMACSHA256 auth, CF initialize/retrieve, response
 * signature validation, webhook) and the iyzipay-node source; see
 * docs/ARCHITECTURE.md. Card data never touches this site: the buyer pays
 * on iyzico's page and comes back to the callback with a token, which is
 * then checked server-to-server with a signed Retrieve call.
 */

export type IyzicoConfig = { apiKey: string; secretKey: string; baseUrl: string }

export const IYZICO_LIVE = 'https://api.iyzipay.com'
export const IYZICO_SANDBOX = 'https://sandbox-api.iyzipay.com'

export function iyzicoConfig(): IyzicoConfig | null {
  const { IYZICO_API_KEY: apiKey, IYZICO_SECRET_KEY: secretKey } = process.env
  const baseUrl = (process.env.IYZICO_BASE_URL || '').replace(/\/+$/, '')
  if (!apiKey || !secretKey || !baseUrl) return null
  const mockAllowed = process.env.E2E_LOCAL_STORE === '1' && !process.env.VERCEL && /^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)
  if (baseUrl !== IYZICO_LIVE && baseUrl !== IYZICO_SANDBOX && !mockAllowed) return null
  return { apiKey, secretKey, baseUrl }
}

/** Authorization header value: "IYZWSv2 " + base64("apiKey:..&randomKey:..&signature:<hex>"). */
export function authorization(cfg: Pick<IyzicoConfig, 'apiKey' | 'secretKey'>, path: string, body: string, randomKey: string): string {
  const signature = createHmac('sha256', cfg.secretKey).update(randomKey + path + body).digest('hex')
  return 'IYZWSv2 ' + Buffer.from(`apiKey:${cfg.apiKey}&randomKey:${randomKey}&signature:${signature}`, 'utf8').toString('base64')
}

/** Request prices are dot-decimal strings ("149.9", "150.0"), as the official SDK sends them. */
export function requestPrice(kurus: number): string {
  if (!Number.isInteger(kurus) || kurus <= 0) throw new Error('Geçersiz tutar')
  const s = (kurus / 100).toString()
  return s.includes('.') ? s : `${s}.0`
}

/** Prices inside signatures drop trailing zeros: 10.0 -> "10", 10.50 -> "10.5". */
export function signaturePrice(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return String(v)
  return String(Math.round(n * 1e8) / 1e8)
}

export function hmacHex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function safeHexEqual(a: unknown, b: string): boolean {
  if (typeof a !== 'string' || !/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a.toLowerCase()), Buffer.from(b.toLowerCase()))
}

/** Response signature: HMAC-SHA256(secret, fields joined with ":"), hex. */
export function responseSignature(secret: string, fields: unknown[]): string {
  return hmacHex(secret, fields.map((f) => String(f ?? '')).join(':'))
}

export class IyzicoError extends Error {}

type Fetch = typeof fetch

export async function iyzicoPost<T extends Record<string, unknown>>(cfg: IyzicoConfig, path: string, body: Record<string, unknown>, f: Fetch = fetch): Promise<T> {
  const json = JSON.stringify(body)
  const rnd = `${Date.now()}${randomBytes(6).toString('hex')}`
  let res: Response
  try {
    res = await f(cfg.baseUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-iyzi-rnd': rnd, Authorization: authorization(cfg, path, json, rnd) },
      body: json,
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
  } catch {
    throw new IyzicoError('Ödeme sağlayıcısına ulaşılamadı.')
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new IyzicoError(`Ödeme sağlayıcısından okunamayan yanıt (HTTP ${res.status}).`)
  }
  if (!data || typeof data !== 'object') throw new IyzicoError('Ödeme sağlayıcısından geçersiz yanıt.')
  return data as T
}

export type CheckoutInput = {
  orderId: string
  orderNo: string
  amountKurus: number
  callbackUrl: string
  product: { slug: string; title: string }
  buyer: { name: string; surname: string; email: string; phone: string; city: string; address: string; ip: string }
}

/**
 * iyzico requires buyer.identityNumber; its FAQ allows a placeholder when the
 * merchant does not collect TC kimlik numbers. This site does not ask for it
 * (data minimisation), so the documented placeholder is sent.
 */
export const IDENTITY_PLACEHOLDER = '11111111111'

export function checkoutRequest(i: CheckoutInput) {
  const price = requestPrice(i.amountKurus)
  const contactName = `${i.buyer.name} ${i.buyer.surname}`
  return {
    locale: 'tr',
    conversationId: i.orderId,
    price,
    paidPrice: price,
    currency: 'TRY',
    basketId: i.orderNo,
    paymentGroup: 'PRODUCT',
    callbackUrl: i.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: i.orderId,
      name: i.buyer.name,
      surname: i.buyer.surname,
      gsmNumber: i.buyer.phone,
      email: i.buyer.email,
      identityNumber: IDENTITY_PLACEHOLDER,
      registrationAddress: i.buyer.address,
      ip: i.buyer.ip,
      city: i.buyer.city,
      country: 'Turkey',
    },
    // All items are VIRTUAL, so no shippingAddress (docs: "not required").
    billingAddress: { contactName, city: i.buyer.city, country: 'Turkey', address: i.buyer.address },
    basketItems: [{ id: i.product.slug, name: i.product.title.slice(0, 200), category1: 'Dijital doküman', itemType: 'VIRTUAL', price }],
  }
}

export const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
export const RETRIEVE_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail'

export async function initializeCheckout(cfg: IyzicoConfig, input: CheckoutInput, f: Fetch = fetch): Promise<{ token: string; paymentPageUrl: string }> {
  const r = await iyzicoPost<Record<string, unknown>>(cfg, INIT_PATH, checkoutRequest(input), f)
  if (r.status !== 'success' || typeof r.token !== 'string' || typeof r.paymentPageUrl !== 'string') {
    throw new IyzicoError(`Ödeme başlatılamadı${typeof r.errorMessage === 'string' ? `: ${r.errorMessage.slice(0, 200)}` : '.'}`)
  }
  if (!safeHexEqual(r.signature, responseSignature(cfg.secretKey, [r.conversationId, r.token])) || r.conversationId !== input.orderId) {
    throw new IyzicoError('Ödeme sağlayıcısının yanıtı doğrulanamadı.')
  }
  const page = new URL(r.paymentPageUrl)
  const mock = cfg.baseUrl.startsWith('http://127.0.0.1') && page.origin.startsWith('http://127.0.0.1')
  if (!mock && (page.protocol !== 'https:' || !page.hostname.endsWith('.iyzipay.com'))) throw new IyzicoError('Beklenmeyen ödeme sayfası adresi.')
  return { token: r.token, paymentPageUrl: page.toString() }
}

export async function retrieveCheckout(cfg: IyzicoConfig, token: string, conversationId: string, f: Fetch = fetch) {
  return iyzicoPost<Record<string, unknown>>(cfg, RETRIEVE_PATH, { locale: 'tr', conversationId, token }, f)
}

export type Verdict = { outcome: 'paid'; paymentId: string } | { outcome: 'failed'; reason: string } | { outcome: 'pending'; reason: string }

/**
 * Decides an order's fate from a CF Retrieve response. Only a signed,
 * matching, fraud-approved SUCCESS for the exact amount marks it paid.
 * A response that fails verification never changes the order.
 */
export function judgeRetrieve(
  secret: string,
  order: { id: string; orderNo: string; amountKurus: number; currency: string },
  token: string,
  r: Record<string, unknown>,
): Verdict {
  // An error response is unsigned and may be transient (outage, rate limit, abandoned form):
  // it never fails an order. Only a signed FAILURE or a fraud rejection does.
  if (r.status !== 'success') {
    return { outcome: 'pending', reason: typeof r.errorMessage === 'string' ? r.errorMessage.slice(0, 200) : 'Sonuç alınamadı' }
  }
  const expected = responseSignature(secret, [
    r.paymentStatus,
    r.paymentId,
    r.currency,
    r.basketId,
    r.conversationId,
    signaturePrice(r.paidPrice),
    signaturePrice(r.price),
    r.token,
  ])
  if (!safeHexEqual(r.signature, expected)) return { outcome: 'pending', reason: 'İmza doğrulanamadı' }
  if (r.conversationId !== order.id || r.basketId !== order.orderNo || r.token !== token) return { outcome: 'pending', reason: 'Sipariş eşleşmedi' }
  if (r.paymentStatus !== 'SUCCESS') return { outcome: 'failed', reason: `Ödeme durumu: ${String(r.paymentStatus).slice(0, 40)}` }
  const amount = order.amountKurus / 100
  if (Math.abs(Number(r.paidPrice) - amount) > 0.001 || Math.abs(Number(r.price) - amount) > 0.001 || r.currency !== order.currency) {
    return { outcome: 'pending', reason: 'Tutar eşleşmedi' }
  }
  if (Number(r.fraudStatus) === -1) return { outcome: 'failed', reason: 'Ödeme risk kontrolünde reddedildi' }
  if (Number(r.fraudStatus) !== 1) return { outcome: 'pending', reason: 'Ödeme risk incelemesinde' }
  if (typeof r.paymentId !== 'string' && typeof r.paymentId !== 'number') return { outcome: 'pending', reason: 'Ödeme numarası yok' }
  return { outcome: 'paid', paymentId: String(r.paymentId) }
}

/** X-IYZ-SIGNATURE-V3 for Checkout Form notifications (no separator; the secret is also the first part). */
export function webhookSignature(secret: string, p: Record<string, unknown>): string {
  return hmacHex(secret, `${secret}${p.iyziEventType ?? ''}${p.iyziPaymentId ?? ''}${p.token ?? ''}${p.paymentConversationId ?? ''}${p.status ?? ''}`)
}
