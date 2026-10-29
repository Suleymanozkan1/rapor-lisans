import { describe, expect, it } from 'vitest'
import { isShopierUrl, productFrontmatterSchema, settingsSchema } from '@/lib/types'
import { parseProductFile, serializeProduct, ContentParseError } from '@/lib/frontmatter'
import { formatPrice, parsePrice, sortProducts } from '@/lib/products'
import { DEFAULT_SETTINGS } from '@/lib/defaults'

describe('Shopier links', () => {
  it('accepts only https pages on shopier.com', () => {
    for (const ok of ['https://www.shopier.com/guvenlicalis', 'https://shopier.com/guvenlicalis/12345', 'https://www.shopier.com/ShowProductNew/products.php?id=1']) {
      expect(isShopierUrl(ok), ok).toBe(true)
    }
    for (const bad of [
      'http://www.shopier.com/guvenlicalis',
      'https://shopier.com.evil.example/x',
      'https://evilshopier.com/x',
      'https://www.shopier.com.tr/x',
      'https://user:pw@www.shopier.com/x',
      'https://www.shopier.com:8443/x',
      'https://www.shopier.com/',
      'javascript:alert(1)//www.shopier.com/x',
      '//www.shopier.com/x',
      '',
    ]) {
      expect(isShopierUrl(bad), bad).toBe(false)
    }
  })

  it('settings accept an empty or Shopier store address only', () => {
    expect(settingsSchema.parse({ ...DEFAULT_SETTINGS, shop: { url: '' } }).shop.url).toBe('')
    expect(() => settingsSchema.parse({ ...DEFAULT_SETTINGS, shop: { url: 'https://example.com/magaza' } })).toThrow()
    // Older settings files without the new fields still load.
    const { shop: _s, motto: _m, ...old } = DEFAULT_SETTINGS
    void _s
    void _m
    const parsed = settingsSchema.parse(old)
    expect(parsed.shop.url).toBe('')
    expect(parsed.motto).toEqual([])
  })
})

describe('product files', () => {
  const raw = `---
title: Kontrol listeleri
status: published
createdAt: 2026-10-18T09:00:00+03:00
price: 189.9
shopierUrl: https://www.shopier.com/guvenlicalis
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

  it('refuses a missing or foreign purchase link, negative or sub-kuruş prices and YAML aliases', () => {
    expect(() => parseProductFile('x', raw.replace('https://www.shopier.com/guvenlicalis', 'https://example.com/pay'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace(/shopierUrl: .*\n/, ''))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('189.9', '-1'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('189.9', '10.005'))).toThrow(ContentParseError)
    expect(() => parseProductFile('x', raw.replace('features:\n  - İskele', 'a: &a [1]\nfeatures: *a'))).toThrow(ContentParseError)
  })

  it('accepts common prices without floating point surprises', () => {
    for (const price of [0, 9.99, 89.9, 149, 1249.5, 999999.99]) {
      expect(productFrontmatterSchema.safeParse({ title: 'abc', createdAt: '2026-10-01', price, shopierUrl: 'https://www.shopier.com/a' }).success, String(price)).toBe(true)
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
