'use server'

import { redirect } from 'next/navigation'
import { buyerSchema } from '@/lib/checkout'
import { getPublishedProduct, getSettings } from '@/lib/content'
import { buildContract } from '@/lib/legal'
import { startCheckout } from '@/lib/orders/service'
import { DOWNLOAD_DAYS, DOWNLOAD_LIMIT, shopStatus } from '@/lib/shop'
import { isForSale } from '@/lib/types'
import { siteUrl } from '@/lib/env'
import { clientIp } from '@/lib/auth/guard'
import { consume } from '@/lib/auth/rate-limit'
import { IyzicoError } from '@/lib/payments/iyzico'

export type CheckoutState = { error?: string; fields?: Record<string, string> }

/**
 * Public Server Action (no session). Next.js rejects cross-origin calls by
 * comparing Origin and Host. The price and the file come from the build's
 * product data, never from the form; rate limits slow down abuse.
 */
export async function checkoutAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const slug = String(fd.get('slug') ?? '')
  const product = getPublishedProduct(slug)
  const settings = getSettings()
  if (!product || !isForSale(product) || !shopStatus(settings).ready) return { error: 'Bu ürün şu an satışta değil.' }

  const parsed = buyerSchema.safeParse({
    name: fd.get('name'),
    surname: fd.get('surname'),
    email: fd.get('email'),
    phone: fd.get('phone'),
    city: fd.get('city'),
    address: fd.get('address'),
  })
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message
    return { error: 'Lütfen işaretli alanları düzeltin.', fields }
  }
  const missing = ['preInfo', 'contract', 'digital'].filter((k) => fd.get(k) !== 'on')
  if (missing.length) return { error: 'Siparişi verebilmek için üç onay kutusunu da işaretleyin.', fields: Object.fromEntries(missing.map((k) => [k, 'Onay gerekli'])) }

  // Without a trusted client IP (only off Vercel without TRUST_PROXY) all buyers would share one
  // bucket, so the per-IP limit is skipped and the per-e-mail limit remains.
  const trustedIp = await clientIp()
  const ip = trustedIp ?? '0.0.0.0'
  const perIp = trustedIp ? await consume(`checkout:ip:${trustedIp}`, 10, 3600) : { allowed: true }
  const perEmail = await consume(`checkout:email:${parsed.data.email.toLowerCase()}`, 5, 900)
  if (!perIp.allowed || !perEmail.allowed) return { error: 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.' }

  const contract = buildContract({
    seller: settings.seller,
    siteName: settings.siteName,
    siteUrl: siteUrl(),
    buyer: parsed.data,
    product: { title: product.title, excerpt: product.excerpt, format: product.format, features: product.features, fileName: product.file!.name, contentType: product.file!.contentType },
    priceKurus: Math.round(product.price! * 100),
    date: new Date(),
    downloadDays: DOWNLOAD_DAYS,
    downloadLimit: DOWNLOAD_LIMIT,
  })

  let target: string
  try {
    const r = await startCheckout({ product, buyer: parsed.data, ip, contract })
    target = r.paymentPageUrl
  } catch (e) {
    console.error(JSON.stringify({ type: 'checkout_error', at: new Date().toISOString(), product: slug, message: (e as Error).message }))
    return { error: e instanceof IyzicoError ? `${e.message} Kartınızdan tahsilat yapılmadı.` : 'Ödeme başlatılamadı. Kartınızdan tahsilat yapılmadı; lütfen tekrar deneyin.' }
  }
  redirect(target)
}
