import { describe, expect, it } from 'vitest'
import { isForSale, productFileSchema, productFrontmatterSchema, sellerComplete, settingsSchema } from '@/lib/types'
import { checkUploadPathname, matchesSignature, productFilePathname } from '@/lib/product-files'
import { fileBaseName } from '@/lib/slug'
import { parseProductFile, serializeProduct, ContentParseError } from '@/lib/frontmatter'
import { formatPrice, parsePrice, sortProducts } from '@/lib/products'
import { DEFAULT_SETTINGS } from '@/lib/defaults'

describe('product files and seller settings', () => {
  const file = { pathname: 'urunler/kontrol/liste-a1b2.pdf', name: 'Kontrol listesi.pdf', size: 1200, contentType: 'application/pdf' }

  it('accepts a private pathname with an allowed type, including Blob\'s mixed-case suffix', () => {
    expect(productFileSchema.safeParse(file).success).toBe(true)
    expect(productFileSchema.safeParse({ ...file, pathname: 'urunler/kontrol/liste-oYnXSVczoLa9yBYM.pdf' }).success).toBe(true)
    expect(productFileSchema.safeParse({ ...file, sha256: 'f'.repeat(64) }).success).toBe(true)
  })

  it('refuses public or traversing paths, unknown types, mismatched extensions and huge files', () => {
    for (const bad of [
      { ...file, pathname: '/uploads/liste.pdf' },
      { ...file, pathname: 'urunler/../content/settings.json' },
      { ...file, pathname: 'https://x.public.blob.vercel-storage.com/a.pdf' },
      { ...file, name: 'liste.exe', contentType: 'application/x-msdownload' },
      { ...file, name: 'liste.xlsx' },
      { ...file, name: '<script>.pdf' },
      { ...file, size: 0 },
      { ...file, size: 200 * 1024 * 1024 },
      { ...file, sha256: 'xyz' },
    ]) {
      expect(productFileSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false)
    }
  })

  it('a product is for sale only with a price and a file, never as a sample', () => {
    expect(isForSale({ price: 10, file })).toBe(true)
    expect(isForSale({ price: 10 })).toBe(false)
    expect(isForSale({ file })).toBe(false)
    expect(isForSale({ price: 10, file, sample: true })).toBe(false)
  })

  it('seller identity must be complete before sales open; old settings files still load', () => {
    expect(sellerComplete(DEFAULT_SETTINGS.seller)).toBe(false)
    const seller = { ...DEFAULT_SETTINGS.seller, legalName: 'Örnek Ltd.', address: 'İstanbul', phone: '+90 212 000 00 00', email: 'a@example.com', taxOffice: 'Kadıköy', taxNumber: '1234567890' }
    expect(sellerComplete(seller)).toBe(true)
    expect(() => settingsSchema.parse({ ...DEFAULT_SETTINGS, seller: { ...seller, taxNumber: '12' } })).toThrow()
    expect(() => settingsSchema.parse({ ...DEFAULT_SETTINGS, seller: { ...seller, mersisNo: '123' } })).toThrow()
    const { seller: _s, motto: _m, ...old } = DEFAULT_SETTINGS
    void _s
    void _m
    const parsed = settingsSchema.parse(old)
    expect(parsed.seller.legalName).toBe('')
    expect(parsed.motto).toEqual([])
  })
})

describe('upload paths and signatures', () => {
  it('only allows urunler/<slug>/<name>.<allowed ext>', () => {
    expect(checkUploadPathname('urunler/kontrol-listesi/liste.pdf')).toMatchObject({ slug: 'kontrol-listesi', contentType: 'application/pdf' })
    for (const bad of ['urunler/kontrol/../x.pdf', 'content/settings.json', 'urunler/Admin/x.pdf', 'urunler/x/y.html', 'urunler/x/a/b.pdf', 'urunler/x/.pdf']) {
      expect(() => checkUploadPathname(bad), bad).toThrow()
    }
    expect(productFilePathname('kontrol', 'İş Güvenliği Listesi.PDF')).toMatch(/^urunler\/kontrol\/is-guvenligi-listesi-[0-9a-f]{8}\.pdf$/)
    expect(() => productFilePathname('kontrol', 'virus.exe')).toThrow()
  })

  it('checks file signatures', () => {
    expect(matchesSignature(Buffer.from('%PDF-1.7'), 'pdf')).toBe(true)
    expect(matchesSignature(Buffer.from('<html>'), 'pdf')).toBe(false)
    expect(matchesSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14]), 'xlsx')).toBe(true)
    expect(matchesSignature(Buffer.from('%PDF-1.7'), 'docx')).toBe(false)
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0])
    for (const ext of ['doc', 'xls', 'ppt']) expect(matchesSignature(ole, ext)).toBe(true)
    expect(matchesSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), 'doc')).toBe(false)
    expect(matchesSignature(ole, 'docx')).toBe(false)
  })
})

describe('product files', () => {
  const raw = `---
title: Kontrol listeleri
status: published
createdAt: 2026-10-18T09:00:00+03:00
price: 189.9
file:
  pathname: urunler/kontrol/liste-a1b2.pdf
  name: liste.pdf
  size: 1200
  contentType: application/pdf
features:
  - İskele
---

Gövde metni.
`

  it('parses, validates and round-trips', () => {
    const p = parseProductFile('kontrol', raw)
    expect(p).toMatchObject({ slug: 'kontrol', price: 189.9, features: ['İskele'], order: 100, body: 'Gövde metni.' })
    const { slug: _slug, body, ...fm } = p
    void _slug
    expect(parseProductFile('kontrol', serializeProduct(fm, body))).toEqual(p)
  })

  it('refuses a public file path, zero, negative or sub-kuruş prices and YAML aliases', () => {
    expect(() => parseProductFile('x', raw.replace('urunler/kontrol/liste-a1b2.pdf', '/uploads/liste.pdf'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('189.9', '0'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('189.9', '-1'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('189.9', '10.005'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('features:\n  - İskele', 'a: &a [1]\nfeatures: *a'))).toThrow(ContentParseError)
  })

  it('accepts common prices without floating point surprises', () => {
    for (const price of [1, 9.99, 89.9, 149, 1249.5, 999999.99]) {
      expect(productFrontmatterSchema.safeParse({ title: 'abc', createdAt: '2026-10-01', price }).success, String(price)).toBe(true)
    }
  })
})

describe('prices', () => {
  it('parses admin input', () => {
    expect(parsePrice('')).toBeUndefined()
    expect(parsePrice(' 149 ')).toBe(149)
    expect(parsePrice('149,90')).toBe(149.9)
    expect(parsePrice('149.9')).toBe(149.9)
    for (const bad of ['1.249,90', '-5', '12,345', 'abc', '1e3', '99999999']) expect(parsePrice(bad), bad).toBeNull()
  })

  it('formats in Turkish lira', () => {
    expect(formatPrice(undefined)).toBeUndefined()
    expect(formatPrice(149)).toBe('₺149')
    expect(formatPrice(89.9)).toBe('₺89,90')
    expect(formatPrice(1249.5)).toBe('₺1.249,50')
  })

  it('sorts by manual order, then newest first', () => {
    const items = [
      { slug: 'a', order: 100, createdAt: '2026-01-01' },
      { slug: 'b', order: 1, createdAt: '2025-01-01' },
      { slug: 'c', order: 100, createdAt: '2026-05-01' },
    ]
    expect(sortProducts(items).map((x) => x.slug)).toEqual(['b', 'c', 'a'])
  })
})

describe('upload file names', () => {
  it('never leave a trailing hyphen when a long name is shortened', () => {
    const long = `${'a'.repeat(59)} b.pdf`
    expect(fileBaseName(long, 60)).toBe('a'.repeat(59))
    expect(() => checkUploadPathname(`urunler/urun/${fileBaseName(long)}.pdf`)).not.toThrow()
    expect(() => checkUploadPathname(productFilePathname('urun', long))).not.toThrow()
  })

  it('accept Turkish names and old Office formats', () => {
    expect(fileBaseName('Risk Değerlendirmesi – Şablon v2.1 (son).docx')).toBe('risk-degerlendirmesi-sablon-v2-1-son')
    expect(fileBaseName('___.pdf')).toBe('dosya')
    expect(checkUploadPathname('urunler/urun/belge1.doc').contentType).toBe('application/msword')
    expect(checkUploadPathname('urunler/urun/kitap1.xls').contentType).toBe('application/vnd.ms-excel')
    expect(checkUploadPathname('urunler/urun/sunum.ppt').contentType).toBe('application/vnd.ms-powerpoint')
    expect(() => checkUploadPathname('urunler/urun/makro.xlsm')).toThrow(/İzin verilen dosya türleri/)
  })
})
