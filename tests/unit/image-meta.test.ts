import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { cleanJpeg, cleanPng, cleanWebp, ImageFormatError } from '@/lib/image-meta'
import { validateImageUpload, UploadError } from '@/lib/upload'

const dir = path.resolve(import.meta.dirname, '../fixtures/images')
const JPG = readFileSync(path.join(dir, 'ornek.jpg'))
const PNG = readFileSync(path.join(dir, 'ornek.png'))
const WEBP = readFileSync(path.join(dir, 'ornek.webp'))
const PAYLOAD = Buffer.from('<html><script>alert(1)</script>')

/** APP1 EXIF (big-endian) with Orientation=6 and a fake GPS string, so stripping is observable. */
function exifApp1(orientation: number) {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0])
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, Buffer.from('GPSLatitude 41.0082 N')])
  const len = payload.length + 2
  return Buffer.concat([Buffer.from([0xff, 0xe1, len >> 8, len & 0xff]), payload])
}
const comment = (text: string) => {
  const t = Buffer.from(text)
  return Buffer.concat([Buffer.from([0xff, 0xfe, (t.length + 2) >> 8, (t.length + 2) & 0xff]), t])
}
function pngChunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)])
}

describe('JPEG cleaning', () => {
  it('reads the size of a real JPEG', () => {
    const r = cleanJpeg(JPG)
    expect([r.width, r.height]).toEqual([40, 24])
  })
  it('removes EXIF/GPS, comments and trailing payload but keeps orientation', () => {
    const dirty = Buffer.concat([JPG.subarray(0, 2), exifApp1(6), comment('Kamera: X, konum: ev'), JPG.subarray(2), PAYLOAD])
    const r = cleanJpeg(dirty)
    const s = r.data.toString('latin1')
    expect(s).not.toContain('GPSLatitude')
    expect(s).not.toContain('konum')
    expect(s).not.toContain('<script>')
    expect(r.data.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]))
    expect(s).toContain('Exif\0\0')
    // Orientation 6 rotates 90°, so the displayed size is swapped.
    expect([r.width, r.height]).toEqual([24, 40])
    // Cleaning is idempotent and keeps the orientation-only EXIF.
    expect(cleanJpeg(r.data).data).toEqual(r.data)
  })
  it('stays linear on hostile input (no multi-second parse)', () => {
    const flood = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(3 * 1024 * 1024 - 2, Buffer.from([0xff, 0xfe, 0x00, 0x02]))])
    const zeros = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(3 * 1024 * 1024)])
    for (const b of [flood, zeros]) {
      const t = performance.now()
      expect(() => cleanJpeg(b)).toThrow(ImageFormatError)
      expect(performance.now() - t).toBeLessThan(500)
    }
  })
  it('rejects truncated files', () => {
    expect(() => cleanJpeg(JPG.subarray(0, JPG.length - 2))).toThrow(ImageFormatError)
    expect(() => cleanJpeg(JPG.subarray(0, 30))).toThrow(ImageFormatError)
  })
})

describe('allowlist', () => {
  it('drops JFXX thumbnails, unknown APP markers and private/C2PA chunks', () => {
    const seg = (m: number, text: string) => {
      const t = Buffer.from(text, 'latin1')
      return Buffer.concat([Buffer.from([0xff, m, (t.length + 2) >> 8, (t.length + 2) & 0xff]), t])
    }
    const j = cleanJpeg(Buffer.concat([JPG.subarray(0, 2), seg(0xe0, 'JFXX\0thumbGIZLI'), seg(0xeb, 'JUMBc2paGIZLI'), JPG.subarray(2)]))
    expect(j.data.toString('latin1')).not.toContain('GIZLI')
    const p = cleanPng(Buffer.concat([PNG.subarray(0, 33), pngChunk('caBX', Buffer.from('GIZLI')), pngChunk('prVt', Buffer.from('GIZLI')), PNG.subarray(33)]))
    expect(p.data.toString('latin1')).not.toContain('GIZLI')
  })
})

describe('PNG cleaning', () => {
  it('drops text/EXIF chunks and trailing bytes', () => {
    const iend = PNG.length - 12
    const dirty = Buffer.concat([PNG.subarray(0, 33), pngChunk('tEXt', Buffer.from('Author\0Gizli kişi')), pngChunk('eXIf', Buffer.from('GPS')), PNG.subarray(33), PAYLOAD])
    const r = cleanPng(dirty)
    expect([r.width, r.height]).toEqual([40, 24])
    expect(r.data.toString('latin1')).not.toMatch(/Gizli|GPS|script/)
    expect(r.data).toEqual(PNG)
    expect(iend).toBeGreaterThan(33)
  })
  it('rejects a PNG without IEND', () => {
    expect(() => cleanPng(PNG.subarray(0, PNG.length - 12))).toThrow(ImageFormatError)
  })
})

describe('WebP cleaning', () => {
  it('reads the size and drops data after the RIFF end', () => {
    const r = cleanWebp(Buffer.concat([WEBP, PAYLOAD]))
    expect([r.width, r.height]).toEqual([40, 24])
    expect(r.data).toEqual(WEBP)
  })
  it('removes EXIF/XMP chunks from an extended WebP and clears the flags', () => {
    // Build VP8X + original bitstream chunk + EXIF + XMP.
    const bitstream = WEBP.subarray(12)
    const vp8x = Buffer.alloc(18)
    vp8x.write('VP8X', 0, 'latin1')
    vp8x.writeUInt32LE(10, 4)
    vp8x[8] = 0x0c
    vp8x.writeUIntLE(39, 12, 3)
    vp8x.writeUIntLE(23, 15, 3)
    const chunk = (cc: string, d: Buffer) => {
      const h = Buffer.alloc(8)
      h.write(cc, 0, 'latin1')
      h.writeUInt32LE(d.length, 4)
      return Buffer.concat([h, d, d.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)])
    }
    const body = Buffer.concat([vp8x, bitstream, chunk('EXIF', Buffer.from('GPS 41N')), chunk('XMP ', Buffer.from('<x:xmpmeta>gizli</x:xmpmeta>'))])
    const head = Buffer.alloc(12)
    head.write('RIFF', 0, 'latin1')
    head.writeUInt32LE(4 + body.length, 4)
    head.write('WEBP', 8, 'latin1')
    const r = cleanWebp(Buffer.concat([head, body]))
    expect([r.width, r.height]).toEqual([40, 24])
    expect(r.data.toString('latin1')).not.toMatch(/GPS|gizli/)
    expect(r.data[20] & 0x0c).toBe(0)
    expect(r.data.readUInt32LE(4)).toBe(r.data.length - 8)
  })
})

describe('validateImageUpload returns the cleaned file', () => {
  it('for all three formats', () => {
    for (const [buf, name, mime] of [
      [Buffer.concat([JPG.subarray(0, 2), exifApp1(1), JPG.subarray(2), PAYLOAD]), 'a.jpg', 'image/jpeg'],
      [Buffer.concat([PNG, PAYLOAD]), 'a.png', 'image/png'],
      [Buffer.concat([WEBP, PAYLOAD]), 'a.webp', 'image/webp'],
    ] as const) {
      const v = validateImageUpload(buf, name, mime, 'alt metni')
      expect(v.data.toString('latin1')).not.toContain('<script>')
      expect([v.width, v.height]).toEqual([40, 24])
    }
  })
  it('turns format errors into upload errors', () => {
    expect(() => validateImageUpload(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0]), 'a.jpg', 'image/jpeg', 'alt metni')).toThrow(UploadError)
  })
})
