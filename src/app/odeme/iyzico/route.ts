import { NextResponse } from 'next/server'
import { getDb } from '@/lib/orders/db'
import { getOrderByToken } from '@/lib/orders/repo'
import { orderLinks, settleByToken } from '@/lib/orders/service'
import { siteUrl } from '@/lib/env'

/*
 * iyzico sends the buyer's browser here (form POST with "token") after the
 * payment page, on success and on failure. The token is only a lookup key:
 * the result comes from a signed server-to-server Retrieve call.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const go = (path: string) => NextResponse.redirect(new URL(path, siteUrl()), { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const token = form?.get('token')
  if (typeof token !== 'string' || !token || token.length > 200) return go('/odeme/sonuc')
  let order = null
  try {
    order = await settleByToken(token)
  } catch (e) {
    console.error(JSON.stringify({ type: 'order_callback_error', at: new Date().toISOString(), message: (e as Error).message }))
    // iyzico or the database was unreachable: show the order page, which can re-check later.
    order = await getOrderByToken(await getDb(), token).catch(() => null)
  }
  if (!order) return go('/odeme/sonuc')
  return go(new URL(orderLinks(order).page).pathname)
}

export async function GET() {
  return go('/odeme/sonuc')
}
