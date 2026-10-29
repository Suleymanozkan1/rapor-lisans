/*
 * Linear-time readers for JPEG, PNG and WebP that return the image size
 * and a cleaned copy of the file:
 *  - metadata blocks are removed (EXIF incl. GPS, XMP, IPTC, comments,
 *    PNG text chunks), except the JPEG EXIF orientation, which is kept as
 *    a minimal EXIF block so phone photos are not shown sideways;
 *  - anything after the format's end marker is dropped, so a valid image
 *    header cannot carry an appended HTML/JS payload.
 * Every loop advances by a positive offset and is capped, so a crafted
 * file cannot make parsing super-linear (image-size's JPEG parser copies
 * the buffer on every step and is quadratic).
 */

export class ImageFormatError extends Error {}

export type CleanImage = { width: number; height: number; data: Buffer }

const MAX_SEGMENTS = 5_000

const fail = (msg: string): never => {
  throw new ImageFormatError(msg)
}

/* ---------------- JPEG ---------------- */

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

/** Reads the EXIF orientation (1-8) from an APP1 "Exif\0\0" payload, or undefined. */
function exifOrientation(seg: Buffer): number | undefined {
  if (seg.length < 14 || seg.toString('latin1', 0, 6) !== 'Exif\0\0') return undefined
  const tiff = seg.subarray(6)
  const le = tiff.toString('latin1', 0, 2) === 'II'
  if (!le && tiff.toString('latin1', 0, 2) !== 'MM') return undefined
  const u16 = (o: number) => (o + 2 <= tiff.length ? (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o)) : -1)
  const u32 = (o: number) => (o + 4 <= tiff.length ? (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o)) : -1)
  const ifd = u32(4)
  const count = u16(ifd)
  if (ifd < 8 || count < 0) return undefined
  for (let i = 0; i < Math.min(count, 500); i++) {
    const entry = ifd + 2 + i * 12
    if (u16(entry) === 0x0112) {
      const v = u16(entry + 8)
      return v >= 1 && v <= 8 ? v : undefined
    }
  }
  return undefined
}

/** A minimal big-endian EXIF APP1 segment holding only the Orientation tag. */
function orientationSegment(value: number): Buffer {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 at offset 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, value, 0x00, 0x00, // Orientation, SHORT, 1, value
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ])
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const len = payload.length + 2
  return Buffer.concat([Buffer.from([0xff, 0xe1, len >> 8, len & 0xff]), payload])
}

export function cleanJpeg(buf: Buffer): CleanImage {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) fail('JPEG başlığı yok')
  const out: Buffer[] = [buf.subarray(0, 2)]
  let pos = 2
  let width = 0
  let height = 0
  let orientation: number | undefined
  let sawScan = false
  let segments = 0

  while (pos < buf.length) {
    if (++segments > MAX_SEGMENTS) fail('JPEG çok fazla bölüm içeriyor')
    if (buf[pos] !== 0xff) fail('JPEG yapısı bozuk')
    // Skip fill bytes (0xFF padding) before a marker.
    while (pos < buf.length && buf[pos] === 0xff) pos++
    if (pos >= buf.length) fail('JPEG yarım kalmış')
    const marker = buf[pos++]

    if (marker === 0xd9) {
      if (!sawScan || !width) fail('JPEG görüntü verisi eksik')
      out.push(Buffer.from([0xff, 0xd9]))
      break // anything after EOI is dropped
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(Buffer.from([0xff, marker]))
      continue
    }
    if (pos + 2 > buf.length) fail('JPEG yarım kalmış')
    const len = buf.readUInt16BE(pos)
    if (len < 2 || pos + len > buf.length) fail('JPEG bölüm uzunluğu geçersiz')
    const segment = buf.subarray(pos - 2, pos + len)
    const payload = buf.subarray(pos + 2, pos + len)
    pos += len

    if (SOF.has(marker)) {
      if (payload.length < 5) fail('JPEG boyut bilgisi bozuk')
      height = payload.readUInt16BE(1)
      width = payload.readUInt16BE(3)
    }

    const isMetadata = (marker >= 0xe1 && marker <= 0xef && marker !== 0xe2 && marker !== 0xee) || marker === 0xfe
    if (marker === 0xe1 && orientation === undefined) orientation = exifOrientation(payload)
    if (!isMetadata) out.push(segment)

    if (marker === 0xda) {
      sawScan = true
      // Entropy-coded data runs until a marker other than stuffed 0xFF00 or RSTn.
      const start = pos
      while (pos + 1 < buf.length) {
        if (buf[pos] === 0xff) {
          const next = buf[pos + 1]
          if (next !== 0x00 && !(next >= 0xd0 && next <= 0xd7) && next !== 0xff) break
        }
        pos++
      }
      out.push(buf.subarray(start, pos))
    }
  }
  if (!width || !height) fail('JPEG boyutları okunamadı')
  if (out[out.length - 1].length !== 2 || out[out.length - 1][1] !== 0xd9) fail('JPEG sonu (EOI) bulunamadı')
  if (orientation && orientation !== 1) {
    // Keep JFIF's APP0 first if present.
    const at = out[1] && out[1][1] === 0xe0 ? 2 : 1
    out.splice(at, 0, orientationSegment(orientation))
  }
  // Orientations 5-8 rotate by 90°, so the displayed size is swapped.
  const rotated = orientation !== undefined && orientation >= 5
  return { width: rotated ? height : width, height: rotated ? width : height, data: Buffer.concat(out) }
}

/* ---------------- PNG ---------------- */

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])

export function cleanPng(buf: Buffer): CleanImage {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) fail('PNG başlığı yok')
  const out: Buffer[] = [PNG_SIG]
  let pos = 8
  let width = 0
  let height = 0
  let ended = false
  for (let n = 0; pos < buf.length; n++) {
    if (n > MAX_SEGMENTS) fail('PNG çok fazla parça içeriyor')
    if (pos + 12 > buf.length) fail('PNG yarım kalmış')
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const end = pos + 12 + len
    if (len > buf.length || end > buf.length) fail('PNG parça uzunluğu geçersiz')
    if (n === 0) {
      if (type !== 'IHDR' || len !== 13) fail('PNG IHDR eksik')
      width = buf.readUInt32BE(pos + 8)
      height = buf.readUInt32BE(pos + 12)
    }
    if (!PNG_DROP.has(type)) out.push(buf.subarray(pos, end))
    pos = end
    if (type === 'IEND') {
      ended = true
      break // anything after IEND is dropped
    }
  }
  if (!ended) fail('PNG sonu (IEND) bulunamadı')
  if (!width || !height) fail('PNG boyutları okunamadı')
  return { width, height, data: Buffer.concat(out) }
}

/* ---------------- WebP ---------------- */

export function cleanWebp(buf: Buffer): CleanImage {
  if (buf.length < 20 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') fail('WebP başlığı yok')
  const riffEnd = 8 + buf.readUInt32LE(4)
  if (riffEnd > buf.length || riffEnd < 20) fail('WebP boyutu geçersiz')
  const chunks: Buffer[] = []
  let pos = 12
  let width = 0
  let height = 0
  const vp8x: Buffer[] = []
  for (let n = 0; pos < riffEnd; n++) {
    if (n > MAX_SEGMENTS) fail('WebP çok fazla parça içeriyor')
    if (pos + 8 > riffEnd) fail('WebP yarım kalmış')
    const fourcc = buf.toString('latin1', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    const dataStart = pos + 8
    const end = dataStart + size + (size & 1)
    if (size > riffEnd || dataStart + size > riffEnd) fail('WebP parça uzunluğu geçersiz')
    const data = buf.subarray(dataStart, dataStart + size)
    if (fourcc === 'VP8X' && size >= 10) {
      width = 1 + data.readUIntLE(4, 3)
      height = 1 + data.readUIntLE(7, 3)
    } else if (fourcc === 'VP8 ' && !width && size >= 10) {
      if (data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) fail('WebP VP8 imzası yok')
      width = data.readUInt16LE(6) & 0x3fff
      height = data.readUInt16LE(8) & 0x3fff
    } else if (fourcc === 'VP8L' && !width && size >= 5) {
      if (data[0] !== 0x2f) fail('WebP VP8L imzası yok')
      const bits = data.readUInt32LE(1)
      width = (bits & 0x3fff) + 1
      height = ((bits >> 14) & 0x3fff) + 1
    }
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(pos, Math.min(end, riffEnd)))
      if (fourcc === 'VP8X') vp8x.push(chunk)
      chunks.push(chunk)
    }
    pos = end
  }
  // Clear the EXIF (0x08) and XMP (0x04) flags since those chunks were removed.
  for (const c of vp8x) c[8] &= ~0x0c
  if (!width || !height) fail('WebP boyutları okunamadı')
  const body = Buffer.concat(chunks)
  const header = Buffer.alloc(12)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(4 + body.length, 4)
  header.write('WEBP', 8, 'latin1')
  return { width, height, data: Buffer.concat([header, body]) }
}
