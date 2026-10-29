'use client'

import { useState } from 'react'
import { slugify } from '@/lib/slug'

export type ProductFileValue = { pathname: string; name: string; size: number; contentType: string } | null

type Props = {
  csrf: string
  slug: string
  value: ProductFileValue
  storeKind: 'blob' | 'local' | 'none'
}

const ACCEPT = '.pdf,.xlsx,.docx,.pptx,.zip'
const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.ceil(n / 1024)} KB`)

/** Buyer-facing file name: letters, digits, space and . _ ( ) - only, lower-case extension. */
function displayName(name: string): string {
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? '').toLowerCase()
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N} ._()-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110)
  return `${base.length >= 2 ? base : 'dosya'}.${ext}`
}

export function ProductFileField({ csrf, slug, value, storeKind }: Props) {
  const [file, setFile] = useState<ProductFileValue>(value)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function onPick(f: File | undefined) {
    if (!f) return
    setError('')
    if (!slug) {
      setError('Önce ürün adını ve adresini girin.')
      return
    }
    setBusy(true)
    setProgress(0)
    try {
      const ext = (/\.([a-z0-9]{2,5})$/i.exec(f.name)?.[1] ?? '').toLowerCase()
      let stored: { pathname: string; size: number; contentType: string }
      if (storeKind === 'blob') {
        const { upload } = await import('@vercel/blob/client')
        const base = slugify(f.name.replace(/\.[^.]+$/, '')).slice(0, 60) || 'dosya'
        const r = await upload(`urunler/${slug}/${base}.${ext}`, f, {
          access: 'private',
          handleUploadUrl: '/admin/api/urun-dosyasi',
          clientPayload: JSON.stringify({ csrf }),
          multipart: f.size > 20 * 1024 * 1024,
          onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
        })
        stored = { pathname: r.pathname, size: f.size, contentType: r.contentType }
      } else {
        const body = new FormData()
        body.set('csrf', csrf)
        body.set('slug', slug)
        body.set('file', f)
        const res = await fetch('/admin/api/urun-dosyasi', { method: 'POST', body })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Yükleme başarısız.')
        stored = json
      }
      setFile({ ...stored, name: displayName(f.name) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="field">
      <legend>Satılacak dosya</legend>
      <input type="hidden" name="filePathname" value={file?.pathname ?? ''} />
      <input type="hidden" name="fileName" value={file?.name ?? ''} />
      {file ? (
        <p className="field__help" role="status">
          <strong>{file.name}</strong> ({fmtSize(file.size)}). Ödeme yapan alıcı bu dosyayı indirir.
        </p>
      ) : (
        <p className="field__help">Dosya yokken ürün satışa açılmaz; sayfada “Yakında” yazar.</p>
      )}
      {storeKind === 'none' ? (
        <p className="field__help">Dosya deposu yapılandırılmamış: Vercel projesine özel (private) bir Blob deposu bağlayın (README: “Mağaza”).</p>
      ) : (
        <>
          <label htmlFor="productFile">{file ? 'Dosyayı değiştir' : 'Dosya seç'}</label>
          <input id="productFile" type="file" accept={ACCEPT} disabled={busy} onChange={(e) => onPick(e.target.files?.[0])} aria-describedby="productFile-help" />
          <p id="productFile-help" className="field__help">
            PDF, Excel (.xlsx), Word (.docx), PowerPoint (.pptx) veya ZIP; en fazla 100 MB. Dosya herkese açık değildir.
          </p>
        </>
      )}
      {busy ? <p className="field__help">Yükleniyor… {storeKind === 'blob' ? `%${progress}` : ''}</p> : null}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      {file && !busy ? (
        <button type="button" className="button button--quiet" onClick={() => setFile(null)}>
          Dosyayı kaldır
        </button>
      ) : null}
    </fieldset>
  )
}
