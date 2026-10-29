import { describe, expect, it } from 'vitest'
import { buyerSchema, normalizePhone } from '@/lib/checkout'

describe('checkout input', () => {
  it('normalises Turkish phone numbers to +90', () => {
    for (const v of ['0555 111 22 33', '5551112233', '+90 555 111 22 33', '905551112233', '00905551112233', '(0212) 555-11-22']) {
      expect(normalizePhone(v), v).toMatch(/^\+90[2-5]\d{9}$/)
    }
    for (const v of ['123', '+44 20 7946 0958', '0555 111 22', 'abc', '0 6555 111 22 33']) expect(normalizePhone(v), v).toBeNull()
  })

  it('validates buyer fields', () => {
    const ok = buyerSchema.parse({ name: ' Ayşe ', surname: 'Yılmaz-Öz', email: 'ayse@example.com', phone: '0555 111 22 33', city: 'İzmir', address: 'Örnek Mah. 12. Sok. No: 3, Bornova' })
    expect(ok).toMatchObject({ name: 'Ayşe', phone: '+905551112233' })
    expect(buyerSchema.safeParse({ ...ok, name: '<script>' }).success).toBe(false)
    expect(buyerSchema.safeParse({ ...ok, email: 'yok' }).success).toBe(false)
    expect(buyerSchema.safeParse({ ...ok, address: 'kısa' }).success).toBe(false)
  })
})

describe('contract text', async () => {
  const { buildContract, money, day, CONTRACT_VERSION } = await import('@/lib/legal')
  const base = {
    seller: { legalName: 'Örnek Ltd. Şti.', address: 'Kadıköy / İstanbul', phone: '+90 216 000 00 00', email: 'satis@example.com', taxOffice: 'Kadıköy', taxNumber: '1234567890', mersisNo: '', kep: '', chamber: '' },
    siteName: 'Güvenli Çalış',
    siteUrl: 'https://guvenlicalis.example',
    buyer: { name: 'Ayşe', surname: 'Yılmaz', email: 'ayse@example.com', phone: '+905551112233', city: 'İzmir', address: 'Örnek Mah. 1' },
    product: { title: 'Kontrol listesi', excerpt: 'Özet', format: 'PDF', features: ['Madde'], fileName: 'liste.pdf', contentType: 'application/pdf' },
    priceKurus: 124950,
    date: new Date('2026-10-29T11:05:00Z'),
    downloadDays: 7,
    downloadLimit: 5,
  }

  it('formats money and time the same everywhere', () => {
    expect(money(124950)).toBe('1.249,50 TL')
    expect(money(14990)).toBe('149,90 TL')
    expect(money(5)).toBe('0,05 TL')
    expect(day(new Date('2026-10-29T21:30:00Z'))).toBe('30.10.2026 00:30 (TSİ)')
  })

  it('includes seller, buyer, price, the withdrawal exception and the version', () => {
    const { text, version } = buildContract(base)
    expect(version).toBe(CONTRACT_VERSION)
    for (const s of ['ÖN BİLGİLENDİRME FORMU', 'MESAFELİ SATIŞ SÖZLEŞMESİ', 'Örnek Ltd. Şti.', '1234567890', 'Ayşe Yılmaz', '1.249,50 TL', 'madde 15', 'liste.pdf', '29.10.2026 14:05 (TSİ)', 'Onayla ve öde']) {
      expect(text).toContain(s)
    }
    expect(text).not.toContain('MERSİS') // empty optional field is left out
  })
})
