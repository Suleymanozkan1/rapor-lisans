import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAdminSession } from '@/lib/auth/guard'
import { verifyCsrfToken } from '@/lib/auth/session'
import { authConfig } from '@/lib/env'
import { fileStoreKind, writeLocalFile } from '@/lib/files'
import { checkUploadPathname, extensionOf, matchesSignature, productFilePathname, ProductFileError, MAX_PRODUCT_FILE_BYTES } from '@/lib/product-files'

/*
 * Product file uploads from the admin panel.
 * - Vercel Blob: the browser uploads straight to the private store; this route
 *   only issues a short-lived client token after checking the admin session,
 *   the CSRF token and the Origin, and fixes the path, type and size limits.
 * - Local development: the file itself is posted here (small files only).
 * The product form later re-checks the stored file's size, type and signature.
 */

export const runtime = 'nodejs'
export const maxDuration = 60

async function authorise(csrf: unknown): Promise<string | null> {
  const s = await getAdminSession()
  const cfg = authConfig()
  if (!s || !cfg) return 'Oturum geçersiz.'
  if (!verifyCsrfToken(s.sid, csrf, cfg.sessionSecret)) return 'Güvenlik doğrulaması başarısız (CSRF).'
  const h = await headers()
  const origin = h.get('origin')
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!origin || !host) return 'İstek kaynağı doğrulanamadı.'
  try {
    if (new URL(origin).host !== host) return 'İstek kaynağı doğrulanamadı.'
  } catch {
    return 'İstek kaynağı doğrulanamadı.'
  }
  return null
}

const deny = (message: string, status = 403) => {
  // Why an upload was refused, for the runtime logs (no tokens, no file contents).
  console.warn(JSON.stringify({ type: 'product_upload_refused', at: new Date().toISOString(), status, reason: message }))
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const kind = fileStoreKind()
  if (kind === 'none') return deny('Dosya deposu yapılandırılmamış (Vercel Blob).', 503)

  if (kind === 'local') {
    const form = await request.formData().catch(() => null)
    if (!form) return deny('Geçersiz istek.', 400)
    const problem = await authorise(form.get('csrf'))
    if (problem) return deny(problem)
    const file = form.get('file')
    const slug = String(form.get('slug') ?? '')
    if (!(file instanceof File) || file.size === 0) return deny('Bir dosya seçin.', 400)
    if (file.size > 4 * 1024 * 1024) return deny('Yerel geliştirmede dosya en fazla 4 MB olabilir.', 400)
    try {
      const pathname = productFilePathname(slug, file.name)
      const data = Buffer.from(await file.arrayBuffer())
      if (!matchesSignature(data.subarray(0, 16), extensionOf(file.name))) throw new ProductFileError('Dosya içeriği uzantısıyla uyuşmuyor.')
      await writeLocalFile(pathname, data)
      return NextResponse.json({ pathname, size: data.length, contentType: checkUploadPathname(pathname).contentType })
    } catch (e) {
      return deny(e instanceof ProductFileError ? e.message : 'Dosya kaydedilemedi.', 400)
    }
  }

  // Vercel Blob client upload (token exchange). No completion webhook is used:
  // the browser sends the result to the product form, which re-validates it.
  const { handleUpload } = await import('@vercel/blob/client')
  const body = await request.json().catch(() => null)
  if (!body) return deny('Geçersiz istek.', 400)
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let csrf: unknown = null
        try {
          csrf = JSON.parse(clientPayload ?? '{}').csrf
        } catch {
          // Malformed payload: fails the CSRF check below.
        }
        const problem = await authorise(csrf)
        if (problem) throw new ProductFileError(problem)
        const { contentType } = checkUploadPathname(pathname)
        return {
          allowedContentTypes: [contentType],
          maximumSizeInBytes: MAX_PRODUCT_FILE_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
    })
    return NextResponse.json(result)
  } catch (e) {
    return deny(e instanceof ProductFileError ? e.message : 'Yükleme izni verilemedi.', 400)
  }
}
