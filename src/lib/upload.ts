import { imageSize } from 'image-size'
import { slugify } from './slug'

/** Vercel Functions reject request bodies above 4.5 MB; stay well below it. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
export const MAX_DIMENSION = 6000

export type ImageKind = 'jpeg' | 'png' | 'webp'
const EXTENSIONS: Record<ImageKind, string[]> = { jpeg: ['jpg', 'jpeg'], png: ['png'], webp: ['webp'] }
const MIME: Record<ImageKind, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

/** Detect the real type from magic bytes; the browser-sent MIME is not trusted. */
export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

export type ValidatedUpload = {
  kind: ImageKind
  mime: string
  ext: string
  width: number
  height: number
  fileName: string
}

export class UploadError extends Error {}

export function validateImageUpload(
  buf: Buffer,
  originalName: string,
  declaredMime: string,
  alt: string,
): ValidatedUpload {
  if (buf.length === 0) throw new UploadError('Dosya boş.')
  if (buf.length > MAX_UPLOAD_BYTES) throw new UploadError(`Dosya en fazla ${MAX_UPLOAD_BYTES / 1024 / 1024} MB olabilir.`)
  if (!alt.trim() || alt.trim().length < 3) throw new UploadError('Görsel için en az 3 karakterlik alt metin yazın.')
  if (alt.length > 300) throw new UploadError('Alt metin en fazla 300 karakter olabilir.')

  const kind = sniffImage(buf)
  if (!kind) throw new UploadError('Yalnızca JPEG, PNG veya WebP görseller yüklenebilir (SVG kabul edilmez).')

  const baseName = originalName.split(/[\\/]/).pop() ?? ''
  const dot = baseName.lastIndexOf('.')
  const ext = dot >= 0 ? baseName.slice(dot + 1).toLowerCase() : ''
  if (!EXTENSIONS[kind].includes(ext)) throw new UploadError('Dosya uzantısı, dosyanın gerçek türüyle uyuşmuyor.')
  if (declaredMime && declaredMime !== MIME[kind]) throw new UploadError('Bildirilen dosya türü, dosyanın içeriğiyle uyuşmuyor.')

  let dims
  try {
    dims = imageSize(new Uint8Array(buf))
  } catch {
    throw new UploadError('Görsel okunamadı; dosya bozuk olabilir.')
  }
  if (!dims.width || !dims.height) throw new UploadError('Görsel boyutları okunamadı.')
  if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
    throw new UploadError(`Görsel en fazla ${MAX_DIMENSION}×${MAX_DIMENSION} piksel olabilir.`)
  }

  const base = slugify(dot >= 0 ? baseName.slice(0, dot) : baseName).slice(0, 50).replace(/-+$/, '') || 'gorsel'
  const suffix = Date.now().toString(36)
  const finalExt = kind === 'jpeg' ? 'jpg' : ext
  return { kind, mime: MIME[kind], ext: finalExt, width: dims.width, height: dims.height, fileName: `${base}-${suffix}.${finalExt}` }
}
