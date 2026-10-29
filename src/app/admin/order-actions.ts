'use server'

import { redirect } from 'next/navigation'
import { requireAdminAction } from '@/lib/auth/guard'
import { getDb } from '@/lib/orders/db'
import { getOrder, markRefunded, setInvoiceNo } from '@/lib/orders/repo'
import { resendConfirmation, settleByToken } from '@/lib/orders/service'

function audit(user: string, action: string, order: string) {
  console.info(JSON.stringify({ type: 'admin_audit', at: new Date().toISOString(), user, action, target: `order:${order}` }))
}

/** Admin order actions; every one checks the session, CSRF token and Origin first. */
export async function orderAction(fd: FormData): Promise<void> {
  const session = await requireAdminAction(fd)
  const id = String(fd.get('id') ?? '')
  const intent = String(fd.get('intent') ?? '')
  const db = await getDb()
  const order = await getOrder(db, id)
  if (!order) redirect('/admin/siparisler')
  let durum = 'siparis-guncellendi'
  try {
    if (intent === 'yeni-baglanti') {
      if (!(await resendConfirmation(id, true))) durum = 'siparis-islem-yok'
    } else if (intent === 'eposta') {
      if (!(await resendConfirmation(id, false))) durum = 'siparis-islem-yok'
    } else if (intent === 'iade') {
      if (String(fd.get('confirm') ?? '').trim() !== order.orderNo) durum = 'siparis-onay'
      else if (!(await markRefunded(db, id))) durum = 'siparis-islem-yok'
    } else if (intent === 'fatura') {
      await setInvoiceNo(db, id, String(fd.get('invoiceNo') ?? ''))
    } else if (intent === 'sorgula' && order.providerToken) {
      await settleByToken(order.providerToken)
    } else {
      durum = 'siparis-islem-yok'
    }
  } catch (e) {
    console.error(JSON.stringify({ type: 'admin_order_error', at: new Date().toISOString(), order: id, message: (e as Error).message }))
    durum = 'siparis-hata'
  }
  audit(session.sub, intent, id)
  redirect(`/admin/siparisler/${id}?durum=${durum}`)
}
