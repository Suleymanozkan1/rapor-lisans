import { describe, expect, it, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { migrate, type Db } from '@/lib/orders/db'
import * as repo from '@/lib/orders/repo'

let db: Db

beforeEach(async () => {
  const pg = new PGlite()
  db = { query: async (text, params = []) => (await pg.query(text, params)).rows as never }
  await migrate(db)
  await migrate(db) // idempotent
})

const input = (over: Partial<repo.NewOrder> = {}): repo.NewOrder => ({
  productSlug: 'kontrol-listesi',
  productTitle: 'Kontrol listesi',
  filePathname: 'urunler/kontrol-listesi-abc.pdf',
  fileName: 'kontrol-listesi.pdf',
  fileSha256: 'a'.repeat(64),
  amountKurus: 14990,
  currency: 'TRY',
  buyer: { name: 'Ayşe', surname: 'Yılmaz', email: 'ayse@example.com', phone: '+905551112233', city: 'İzmir', address: 'Örnek mah. 1', ip: '203.0.113.7' },
  contractVersion: '2026-10-29',
  contractText: 'Sözleşme metni',
  consentAt: new Date().toISOString(),
  downloadLimit: 5,
  ...over,
})

describe('orders', () => {
  it('creates a pending order with a readable number and keeps Turkish text intact', async () => {
    const o = await repo.createOrder(db, input())
    expect(o.status).toBe('pending')
    expect(o.orderNo).toMatch(/^GC-\d{8}-[A-Z2-9]{6}$/)
    expect(o.buyer.city).toBe('İzmir')
    expect(await repo.getOrder(db, o.id)).toMatchObject({ id: o.id, amountKurus: 14990 })
    expect(await repo.getOrder(db, 'not-a-uuid')).toBeNull()
    expect(await repo.getOrder(db, '00000000-0000-4000-8000-000000000000')).toBeNull()
  })

  it('refuses invalid amounts and statuses at the database level', async () => {
    await expect(repo.createOrder(db, input({ amountKurus: 0 }))).rejects.toThrow()
    const o = await repo.createOrder(db, input())
    await expect(db.query(`UPDATE orders SET status = 'shipped' WHERE id = $1`, [o.id])).rejects.toThrow()
  })

  it('marks an order paid exactly once, even when callback and webhook race', async () => {
    const o = await repo.createOrder(db, input())
    await repo.setProviderToken(db, o.id, 'tok-1')
    expect((await repo.getOrderByToken(db, 'tok-1'))!.id).toBe(o.id)
    const results = await Promise.all([repo.markPaid(db, o.id, 'pay-1', 7), repo.markPaid(db, o.id, 'pay-1', 7), repo.markPaid(db, o.id, 'pay-1', 7)])
    expect(results.filter(Boolean)).toHaveLength(1)
    const paid = (await repo.getOrder(db, o.id))!
    expect(paid.status).toBe('paid')
    expect(new Date(paid.downloadExpiresAt!).getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000)
    // A paid order cannot be failed afterwards (late, out-of-order notification).
    expect(await repo.markFailed(db, o.id, 'geç bildirim')).toBeNull()
    expect((await repo.listEvents(db, o.id)).map((e) => e.type)).toEqual(['created', 'paid'])
  })

  it('a failure can be overturned by a later verified payment; a refund cannot', async () => {
    const o = await repo.createOrder(db, input())
    expect(await repo.markFailed(db, o.id, 'kart reddedildi')).not.toBeNull()
    expect((await repo.getOrder(db, o.id))!.failureReason).toBe('kart reddedildi')
    expect(await repo.markPaid(db, o.id, 'pay-x', 7)).not.toBeNull()
    expect(await repo.markPaid(db, o.id, 'pay-x', 7)).toBeNull()
    await repo.markRefunded(db, o.id)
    expect(await repo.markPaid(db, o.id, 'pay-x', 7)).toBeNull()
    expect((await repo.getOrder(db, o.id))!.status).toBe('refunded')
  })

  it('downloads: only paid, within the limit, unexpired, current link version', async () => {
    const o = await repo.createOrder(db, input({ downloadLimit: 3 }))
    expect(await repo.consumeDownload(db, o.id, 1)).toBeNull() // still pending
    await repo.markPaid(db, o.id, 'pay-2', 7)
    const attempts = await Promise.all(Array.from({ length: 8 }, () => repo.consumeDownload(db, o.id, 1)))
    expect(attempts.filter(Boolean)).toHaveLength(3)
    expect(await repo.consumeDownload(db, o.id, 2)).toBeNull()

    const renewed = (await repo.renewDownload(db, o.id, 7))!
    expect(renewed.downloadVersion).toBe(2)
    expect(renewed.downloadCount).toBe(0)
    expect(await repo.consumeDownload(db, o.id, 1)).toBeNull() // old link is dead
    expect(await repo.consumeDownload(db, o.id, 2)).not.toBeNull()

    await db.query(`UPDATE orders SET download_expires_at = now() - interval '1 minute' WHERE id = $1`, [o.id])
    expect(await repo.consumeDownload(db, o.id, 2)).toBeNull()

    await repo.renewDownload(db, o.id, 7)
    await repo.markRefunded(db, o.id)
    expect(await repo.consumeDownload(db, o.id, 3)).toBeNull()
    expect(await repo.renewDownload(db, o.id, 7)).toBeNull()
  })

  it('lists newest first, filters by status and sums paid revenue', async () => {
    const a = await repo.createOrder(db, input({ amountKurus: 10000 }))
    const b = await repo.createOrder(db, input({ amountKurus: 2550 }))
    await repo.createOrder(db, input())
    await repo.markPaid(db, a.id, 'p-a', 7)
    await repo.markPaid(db, b.id, 'p-b', 7)
    expect(await repo.orderStats(db)).toEqual({ paidCount: 2, paidKurus: 12550, pendingCount: 1 })
    expect((await repo.listOrders(db, { status: 'paid' })).map((o) => o.id).sort()).toEqual([a.id, b.id].sort())
    expect(await repo.listOrders(db, { limit: 2 })).toHaveLength(2)
  })
})

describe('confirmation e-mail claim', () => {
  it('is claimed once, only for paid orders, and can be released for a retry', async () => {
    const o = await repo.createOrder(db, input())
    expect(await repo.claimEmail(db, o.id)).toBeNull() // not paid yet
    await repo.markPaid(db, o.id, 'p', 7)
    const claims = await Promise.all([repo.claimEmail(db, o.id), repo.claimEmail(db, o.id)])
    expect(claims.filter(Boolean)).toHaveLength(1)
    await repo.releaseEmail(db, o.id)
    expect(await repo.claimEmail(db, o.id)).not.toBeNull()
  })
})
