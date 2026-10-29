import 'server-only'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { PRODUCT_FILE_TYPES } from './types'

/*
 * Private files sold in the store. Production: a *private* Vercel Blob store
 * (never publicly reachable; read with the store credentials). Development
 * and e2e: a local folder outside public/.
 */

export type FileMeta = { size: number; contentType: string }
export type FileStoreKind = 'blob' | 'local' | 'none'

export function fileStoreKind(): FileStoreKind {
  if (process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) return 'blob'
  if (!process.env.VERCEL && (process.env.NODE_ENV !== 'production' || process.env.E2E_LOCAL_STORE === '1')) return 'local'
  return 'none'
}

const PATHNAME = /^urunler\/[a-z0-9][A-Za-z0-9/_.-]*$/

function localPath(pathname: string): string {
  if (!PATHNAME.test(pathname) || pathname.includes('..')) throw new Error('Geçersiz dosya yolu')
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PRIVATE_FILES_DIR || '.private-files')
  const full = path.resolve(root, pathname)
  if (!full.startsWith(root + path.sep)) throw new Error('Geçersiz dosya yolu')
  return full
}

const typeFor = (pathname: string) => PRODUCT_FILE_TYPES[pathname.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream'

export async function headFile(pathname: string): Promise<FileMeta | null> {
  const kind = fileStoreKind()
  if (kind === 'blob') {
    const { head, BlobNotFoundError } = await import('@vercel/blob')
    try {
      const h = await head(pathname)
      return { size: h.size, contentType: h.contentType }
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null
      throw e
    }
  }
  if (kind === 'local') {
    try {
      const st = await stat(localPath(pathname))
      return st.isFile() ? { size: st.size, contentType: typeFor(pathname) } : null
    } catch {
      return null
    }
  }
  return null
}

export async function openFile(pathname: string): Promise<(FileMeta & { stream: ReadableStream<Uint8Array> }) | null> {
  const kind = fileStoreKind()
  if (kind === 'blob') {
    const { get } = await import('@vercel/blob')
    const r = await get(pathname, { access: 'private', useCache: false })
    if (!r || r.statusCode !== 200) return null
    return { stream: r.stream, size: r.blob.size, contentType: r.blob.contentType }
  }
  if (kind === 'local') {
    const meta = await headFile(pathname)
    if (!meta) return null
    return { ...meta, stream: Readable.toWeb(createReadStream(localPath(pathname))) as ReadableStream<Uint8Array> }
  }
  return null
}

/** Development only: the admin panel writes small files here instead of Blob. */
export async function writeLocalFile(pathname: string, data: Buffer) {
  if (fileStoreKind() !== 'local') throw new Error('Yerel dosya deposu kapalı')
  const full = localPath(pathname)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, data, { flag: 'wx' })
}

/** First bytes of a stored file, to check its signature without trusting the uploader. */
export async function readFileHead(pathname: string, bytes = 16): Promise<Uint8Array | null> {
  const f = await openFile(pathname)
  if (!f) return null
  const reader = f.stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (total < bytes) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  return Buffer.concat(chunks).subarray(0, bytes)
}

/** SHA-256 of a stored file (streams it once). */
export async function hashFile(pathname: string): Promise<string | null> {
  const f = await openFile(pathname)
  if (!f) return null
  const h = createHash('sha256')
  const reader = f.stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    h.update(value)
  }
  return h.digest('hex')
}
