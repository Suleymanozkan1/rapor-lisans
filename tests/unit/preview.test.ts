import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pickPreviewPages } from '@/lib/preview-pages'
import { renderPdfPages, PreviewError } from '@/lib/product-preview'

describe('pickPreviewPages', () => {
  it('shows only the first page of short documents', () => {
    for (const n of [1, 2, 3]) expect(pickPreviewPages(n, () => 0.5)).toEqual([1])
  })

  it('adds one page from the middle half, never the first or last', () => {
    for (const n of [4, 5, 12, 40, 301]) {
      const seen = new Set<number>()
      for (const r of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999999, 1]) {
        const [first, middle] = pickPreviewPages(n, () => r)
        expect(first).toBe(1)
        expect(middle).toBeGreaterThan(1)
        expect(middle).toBeLessThan(n)
        expect(middle).toBeGreaterThanOrEqual(Math.ceil(n * 0.25))
        expect(middle).toBeLessThanOrEqual(Math.max(2, Math.floor(n * 0.75)))
        seen.add(middle)
      }
      if (n >= 12) expect(seen.size).toBeGreaterThan(2)
    }
  })

  it('rejects impossible page counts', () => {
    expect(() => pickPreviewPages(0)).toThrow()
    expect(() => pickPreviewPages(2.5)).toThrow()
  })
})

describe('renderPdfPages', () => {
  const pdf = readFileSync(path.join(import.meta.dirname, '../fixtures/onizleme-12-sayfa.pdf'))

  it('renders the first and a middle page to JPEG', async () => {
    const { total, images } = await renderPdfPages(pdf, (n) => pickPreviewPages(n, () => 0.5))
    expect(total).toBe(12)
    expect(images.map((i) => i.page)).toEqual([1, 6])
    for (const i of images) {
      expect(i.width).toBe(1100)
      expect(i.height).toBeGreaterThan(1500)
      expect(i.jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
    }
    if (process.env.PREVIEW_DUMP) {
      mkdirSync(process.env.PREVIEW_DUMP, { recursive: true })
      for (const i of images) writeFileSync(path.join(process.env.PREVIEW_DUMP, `sayfa-${i.page}.jpg`), i.jpeg)
    }
  }, 30_000)

  it('refuses files that are not PDFs', async () => {
    await expect(renderPdfPages(Buffer.from('PK\x03\x04 not a pdf'))).rejects.toBeInstanceOf(PreviewError)
  })
})

describe('preview job: which products need pages', async () => {
  const { needsPreview } = await import('../../scripts/urun-onizleme')
  const base = { slug: 'x', body: '', title: 'X', excerpt: '', status: 'published' as const, createdAt: '2026-10-31', features: [], order: 1 }
  const file = (ext: string, sha = 'a'.repeat(64)) => ({ pathname: `urunler/x/dosya.${ext}`, name: `dosya.${ext}`, size: 10, contentType: 'x', sha256: sha })
  const preview = (sha: string) => ({ source: { pathname: 'urunler/x/dosya.docx', sha256: sha }, pages: 3, images: [{ src: '/uploads/urunler/x/a.jpg', page: 1, width: 10, height: 10 }] })

  it('converts Word, Excel and PowerPoint files without a preview of the current file', () => {
    for (const ext of ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf']) expect(needsPreview({ ...base, file: file(ext) }), ext).toBe(true)
    expect(needsPreview({ ...base, file: file('docx'), preview: preview('b'.repeat(64)) })).toBe(true)
  })

  it('skips ZIPs, products without a file, current previews and disabled previews', () => {
    expect(needsPreview({ ...base, file: file('zip') })).toBe(false)
    expect(needsPreview({ ...base })).toBe(false)
    expect(needsPreview({ ...base, file: file('docx'), preview: preview('a'.repeat(64)) })).toBe(false)
    expect(needsPreview({ ...base, file: file('docx'), previewDisabled: true })).toBe(false)
  })
})
