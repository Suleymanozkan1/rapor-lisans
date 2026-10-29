import { NextResponse } from 'next/server'
import { iyzicoConfig, safeHexEqual, webhookSignature } from '@/lib/payments/iyzico'
import { settleByToken } from '@/lib/orders/service'
import { consume } from '@/lib/auth/rate-limit'
import { clientIp } from '@/lib/auth/guard'

/*
 * iyzico merchant notification (webhook) for Checkout Form payments. It
 * covers buyers who close the browser before returning to the callback.
 * When iyzico sends X-IYZ-SIGNATURE-V3 it must match; either way the
 * notification only triggers the same signed Retrieve as the callback, so a
 * forged notification cannot mark anything paid.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ok = () => NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  const cfg = iyzicoConfig()
  if (!cfg) return NextResponse.json({ error: 'not configured' }, { status: 503 })
  const ip = (await clientIp()) ?? 'unknown'
  if (!(await consume(`webhook:ip:${ip}`, 120, 60)).allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })

  const raw = await request.text()
  if (raw.length > 10_000) return NextResponse.json({ error: 'too large' }, { status: 413 })
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const signature = request.headers.get('x-iyz-signature-v3')
  if (signature !== null && !safeHexEqual(signature, webhookSignature(cfg.secretKey, payload))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  }
  if (payload.iyziEventType !== 'CHECKOUT_FORM_AUTH' || typeof payload.token !== 'string') return ok()
  try {
    await settleByToken(payload.token)
  } catch (e) {
    console.error(JSON.stringify({ type: 'order_webhook_error', at: new Date().toISOString(), message: (e as Error).message }))
    // A non-2xx answer makes iyzico retry later.
    return NextResponse.json({ error: 'retry' }, { status: 503 })
  }
  return ok()
}
