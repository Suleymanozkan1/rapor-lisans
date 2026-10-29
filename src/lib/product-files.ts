import { randomBytes } from 'node:crypto'
import { isValidSlug, slugify } from './slug'
import { MAX_PRODUCT_FILE_BYTES, PRODUCT_FILE_TYPES } from './types'

export class ProductFileError extends Error {}

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

/** Storage path for an upload: urunler/<product>/<safe-name>-<random>.<ext>. */
export function productFilePathname(productSlug: string, originalName: string): string {
  if (!isValidSlug(productSlug)) throw new ProductFileError('Önce geçerli bir ürün adresi (slug) girin.')
  const ext = extensionOf(originalName)
  if (!PRODUCT_FILE_TYPES[ext]) throw new ProductFileError(`İzin verilen dosya türleri: ${Object.keys(PRODUCT_FILE_TYPES).join(', ')}.`)
  const base = slugify(originalName.replace(/\.[^.]+$/, '')).slice(0, 60) || 'dosya'
  return `urunler/${productSlug}/${base}-${randomBytes(4).toString('hex')}.${ext}`
}

const PATH = /^urunler\/([a-z0-9]+(?:-[a-z0-9]+)*)\/[a-z0-9]+(?:-[a-z0-9]+)*\.([a-z0-9]{2,5})$/

/**
 * Validates a pathname chosen by the browser before an upload token is
 * issued. The client may only write under urunler/<slug>/ with an allowed
 * extension; the random suffix is added by the server or by Blob.
 */
export function checkUploadPathname(pathname: string): { slug: string; ext: string; contentType: string } {
  const m = PATH.exec(pathname)
  if (!m || !isValidSlug(m[1])) throw new ProductFileError('Geçersiz dosya yolu.')
  const contentType = PRODUCT_FILE_TYPES[m[2]]
  if (!contentType) throw new ProductFileError('Bu dosya türü satılamaz.')
  return { slug: m[1], ext: m[2], contentType }
}

/** PDF starts with "%PDF-"; xlsx, docx, pptx and zip are ZIP containers ("PK\x03\x04"). */
export function matchesSignature(head: Uint8Array, ext: string): boolean {
  const b = Buffer.from(head)
  if (ext === 'pdf') return b.subarray(0, 5).toString('latin1') === '%PDF-'
  if (['zip', 'xlsx', 'docx', 'pptx'].includes(ext)) return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
  return false
}

export { MAX_PRODUCT_FILE_BYTES }
