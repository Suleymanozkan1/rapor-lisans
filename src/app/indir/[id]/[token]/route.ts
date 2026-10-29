import { NextResponse } from 'next/server'
import { getDb } from '@/lib/orders/db'
import { addEvent, consumeDownload, getOrder } from '@/lib/orders/repo'
import { verifyLinkToken } from '@/lib/orders/links'
import { downloadSecret } from '@/lib/shop'
import { openFile } from '@/lib/files'
import { siteUrl } from '@/lib/env'

/*
 * Delivers a purchased file. POST only (a button on the order page), so mail
 * link scanners and prefetchers never use up a download. The link token is
 * checked first, then the download is counted atomically (paid, unexpired,
 * under the limit, current link version), then the private file is streamed.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function contentDisposition(name: string): string {
  const ascii = name.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '') || 'dosya'
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function POST(_request: Request, ctx: RouteContext<'/indir/[id]/[token]'>) {
  const { id, token } = await ctx.params
  const secret = downloadSecret()
  const db = await getDb().catch(() => null)
  const order = secret && db ? await getOrder(db, id) : null
  if (!secret || !db || !order || !verifyLinkToken(secret, order.id, order.downloadVersion, token)) {
    return new NextResponse('Bağlantı geçersiz.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
  const back = NextResponse.redirect(new URL(`/siparis/${order.id}/${token}?indirme=olmadi`, siteUrl()), { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  if (order.status !== 'paid') return back
  // Open the file first, so a storage outage does not use up a download.
  const file = await openFile(order.filePathname).catch(() => null)
  if (!file) {
    console.error(JSON.stringify({ type: 'order_file_missing', at: new Date().toISOString(), order: order.id }))
    return back
  }
  const counted = await consumeDownload(db, order.id, order.downloadVersion)
  if (!counted) {
    await file.stream.cancel().catch(() => {})
    return back
  }
  await addEvent(db, order.id, 'download', { n: counted.downloadCount })
  return new NextResponse(file.stream, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
      'Content-Disposition': contentDisposition(order.fileName),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
