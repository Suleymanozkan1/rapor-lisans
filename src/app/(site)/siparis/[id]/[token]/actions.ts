'use server'

import { redirect } from 'next/navigation'
import { getDb } from '@/lib/orders/db'
import { getOrder } from '@/lib/orders/repo'
import { verifyLinkToken } from '@/lib/orders/links'
import { settleByToken } from '@/lib/orders/service'
import { downloadSecret } from '@/lib/shop'
import { consume } from '@/lib/auth/rate-limit'

/** "Durumu yenile" on a pending order: asks iyzico again with the token stored for this order. */
export async function refreshOrderAction(fd: FormData): Promise<void> {
  const id = String(fd.get('id') ?? '')
  const token = String(fd.get('token') ?? '')
  const secret = downloadSecret()
  const db = await getDb()
  const order = secret ? await getOrder(db, id) : null
  if (!secret || !order || !verifyLinkToken(secret, order.id, order.downloadVersion, token)) redirect('/odeme/sonuc')
  const open = order.status === 'pending' || (order.status === 'paid' && !order.emailSentAt)
  if (open && order.providerToken && (await consume(`order-refresh:${order.id}`, 10, 600)).allowed) {
    await settleByToken(order.providerToken).catch(() => null)
  }
  redirect(`/siparis/${order.id}/${token}`)
}
