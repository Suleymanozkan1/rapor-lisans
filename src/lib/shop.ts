import 'server-only'
import { iyzicoConfig } from './payments/iyzico'
import { orderDbKind } from './orders/db'
import { fileStoreKind } from './files'
import { mailConfigured } from './mail'
import { siteUrl } from './env'
import { sellerComplete, type Settings } from './types'

/** A download link works for this many days and this many downloads; the admin can renew it. */
export const DOWNLOAD_DAYS = 7
export const DOWNLOAD_LIMIT = 5

export function downloadSecret(): string | null {
  const s = process.env.DOWNLOAD_SECRET
  return s && s.length >= 32 ? s : null
}

/**
 * Sales open only when every part is configured. Each missing part is named
 * so the admin panel can say exactly what to set up.
 */
export function shopStatus(settings: Settings): { ready: boolean; missing: string[] } {
  const missing: string[] = []
  if (!iyzicoConfig()) missing.push('iyzico API anahtarları (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL)')
  if (orderDbKind() === 'none') missing.push('Sipariş veritabanı (DATABASE_URL)')
  if (fileStoreKind() === 'none') missing.push('Özel dosya deposu (Vercel Blob, private)')
  if (!downloadSecret()) missing.push('İndirme bağlantısı anahtarı (DOWNLOAD_SECRET, en az 32 karakter)')
  if (!mailConfigured()) missing.push('E-posta gönderimi (RESEND_API_KEY, MAIL_FROM)')
  if (!sellerComplete(settings.seller)) missing.push('Satıcı bilgileri (Site ayarları > Satıcı bilgileri)')
  const url = siteUrl()
  const e2e = process.env.E2E_LOCAL_STORE === '1' && !process.env.VERCEL
  if (!url.startsWith('https://') && !e2e) missing.push('HTTPS site adresi (NEXT_PUBLIC_SITE_URL)')
  return { ready: missing.length === 0, missing }
}
