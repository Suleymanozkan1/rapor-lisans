import { describe, expect, it } from 'vitest'
import { sniffImage, validateImageUpload, UploadError, MAX_UPLOAD_BYTES } from '@/lib/upload'

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
// minimal JPEG header with SOF0 for 2x3
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x03, 0x00, 0x02, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
])
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')

describe('upload validation', () => {
  it('sniffs real types', () => {
    expect(sniffImage(PNG)).toBe('png')
    expect(sniffImage(JPEG)).toBe('jpeg')
    expect(sniffImage(SVG)).toBeNull()
    expect(sniffImage(Buffer.from('GIF89a'))).toBeNull()
  })
  it('accepts a valid PNG and produces a safe file name', () => {
    const v = validateImageUpload(PNG, '../../Etc/İskele Fotoğrafı.PNG', 'image/png', 'İskele korkuluğu')
    expect(v.width).toBe(1)
    expect(v.fileName).toMatch(/^iskele-fotografi-[a-z0-9]+\.png$/)
  })
  it('normalises jpeg extension', () => {
    expect(validateImageUpload(JPEG, 'a.jpeg', 'image/jpeg', 'abc').fileName).toMatch(/\.jpg$/)
  })
  it('rejects SVG, spoofed extensions and MIME types, missing alt, oversize', () => {
    const cases: [Buffer, string, string, string][] = [
      [SVG, 'x.svg', 'image/svg+xml', 'alt metin'],
      [SVG, 'x.png', 'image/png', 'alt metin'],
      [PNG, 'x.jpg', 'image/jpeg', 'alt metin'],
      [PNG, 'x.png.html', 'image/png', 'alt metin'],
      [PNG, 'x.png', 'text/html', 'alt metin'],
      [PNG, 'x.png', 'image/png', ''],
      [PNG, 'x.png', 'image/png', '  '],
      [Buffer.alloc(0), 'x.png', 'image/png', 'alt metin'],
      [Buffer.concat([PNG, Buffer.alloc(MAX_UPLOAD_BYTES)]), 'x.png', 'image/png', 'alt metin'],
    ]
    for (const [buf, name, mime, alt] of cases) expect(() => validateImageUpload(buf, name, mime, alt), name).toThrow(UploadError)
  })
})
