'use client'

import { useState } from 'react'
import { slugify } from '@/lib/slug'
import type { ProductPreview } from '@/lib/types'

export type ProductFileValue = { pathname: string; name: string; size: number; contentType: string } | null

type StoreKind = 'blob' | 'local' | 'none'

type Props = {
  csrf: string
  slug: string
  value: ProductFileValue
  preview: ProductPreview | null
  storeKind: StoreKind
}

const ACCEPT = '.pdf,.xlsx,.docx,.pptx,.zip'
const PDF = 'application/pdf'
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

/** Uploads to the private file store (Vercel Blob, or the local folder in development). */
async function uploadPrivate(
  f: File,
  opts: { csrf: string; slug: string; storeKind: StoreKind; prefix?: string; onProgress: (p: number) => void },
): Promise<{ pathname: string; size: number; contentType: string }> {
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(f.name)?.[1] ?? '').toLowerCase()
  const base = `${opts.prefix ?? ''}${slugify(f.name.replace(/\.[^.]+$/, '')).slice(0, 50) || 'dosya'}`
  if (opts.storeKind === 'blob') {
    const { upload } = await import('@vercel/blob/client')
    const r = await upload(`urunler/${opts.slug}/${base}.${ext}`, f, {
      access: 'private',
      handleUploadUrl: '/admin/api/urun-dosyasi',
      clientPayload: JSON.stringify({ csrf: opts.csrf }),
      multipart: f.size > 20 * 1024 * 1024,
      onUploadProgress: (p) => opts.onProgress(Math.round(p.percentage)),
    })
    return { pathname: r.pathname, size: f.size, contentType: r.contentType }
  }
  const body = new FormData()
  body.set('csrf', opts.csrf)
  body.set('slug', opts.slug)
  body.set('file', new File([f], `${base}.${ext}`, { type: f.type }))
  const res = await fetch('/admin/api/urun-dosyasi', { method: 'POST', body })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Yükleme başarısız.')
  return json
}

export function ProductFileField({ csrf, slug, value, preview, storeKind }: Props) {
  const [file, setFile] = useState<ProductFileValue>(value)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  // PDF copy used only to render preview pages of a Word/Excel/PowerPoint/ZIP product.
  const keptPdf = preview && value && value.contentType !== PDF && preview.source.pathname !== value.pathname ? preview.source.pathname : ''
  const [previewPdf, setPreviewPdf] = useState<{ pathname: string; name: string } | null>(keptPdf ? { pathname: keptPdf, name: 'Mevcut önizleme PDF’i' } : null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewOff, setPreviewOff] = useState(Boolean(value) && !preview)

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
      const stored = await uploadPrivate(f, { csrf, slug, storeKind, onProgress: setProgress })
      setFile({ ...stored, name: displayName(f.name) })
      setPreviewOff(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız.')
    } finally {
      setBusy(false)
    }
  }

  async function onPickPreviewPdf(f: File | undefined) {
    if (!f) return
    setPreviewError('')
    if (!/\.pdf$/i.test(f.name)) {
      setPreviewError('Önizleme için PDF dosyası seçin.')
      return
    }
    if (!slug) {
      setPreviewError('Önce ürün adını ve adresini girin.')
      return
    }
    setPreviewBusy(true)
    try {
      const stored = await uploadPrivate(f, { csrf, slug, storeKind, prefix: 'onizleme-', onProgress: () => {} })
      setPreviewPdf({ pathname: stored.pathname, name: f.name })
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Yükleme başarısız.')
    } finally {
      setPreviewBusy(false)
    }
  }

  const isPdf = file?.contentType === PDF
  const sameSource = Boolean(preview && file && (isPdf ? preview.source.pathname === file.pathname : previewPdf?.pathname === preview.source.pathname))

  return (
    <>
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

      {file ? (
        <fieldset className="field preview-field">
          <legend>Önizleme sayfaları</legend>
          <p className="field__help">
            Ürün sayfasında, satın almadan önce belgenin <strong>1. sayfası</strong> ve <strong>ortadan rastgele seçilen bir sayfası</strong> gösterilir.
            Sayfa, ürünü kaydederken bir kez seçilir; ziyaretçi sayfayı yenileyerek başka sayfa göremez. 3 sayfa veya daha kısa belgelerde yalnızca 1.
            sayfa gösterilir.
          </p>
          <input type="hidden" name="previewPdfPathname" value={isPdf ? '' : (previewPdf?.pathname ?? '')} />
          <label className="choice">
            <input type="checkbox" name="previewOff" value="1" checked={previewOff} onChange={(e) => setPreviewOff(e.target.checked)} /> Önizleme
            gösterme
          </label>
          {previewOff ? null : isPdf ? (
            <p className="field__help">Satılan PDF’ten otomatik oluşturulur.</p>
          ) : (
            <>
              <p className="field__help" id="previewPdf-help">
                Word, Excel ve PowerPoint dosyalarında sayfa düzenini programın kendisi belirler; bu yüzden önizleme için belgenin PDF hâlini de
                yükleyin (programda <strong>Dosya › Farklı Kaydet › PDF</strong>). Bu PDF yayınlanmaz ve satılmaz; yalnızca seçilen sayfaların görseli
                ürün sayfasında görünür.
              </p>
              {previewPdf ? (
                <p className="field__help" role="status">
                  Önizleme kaynağı: <strong>{previewPdf.name}</strong>
                </p>
              ) : null}
              {storeKind === 'none' ? null : (
                <>
                  <label htmlFor="previewPdf">{previewPdf ? 'Önizleme PDF’ini değiştir' : 'Önizleme için PDF seç'}</label>
                  <input
                    id="previewPdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={previewBusy}
                    onChange={(e) => onPickPreviewPdf(e.target.files?.[0])}
                    aria-describedby="previewPdf-help"
                  />
                </>
              )}
              {previewBusy ? <p className="field__help">Yükleniyor…</p> : null}
              {previewError ? (
                <p className="field__error" role="alert">
                  {previewError}
                </p>
              ) : null}
              {!previewPdf && !previewBusy ? <p className="field__help">PDF yüklenmezse ürün sayfasında önizleme gösterilmez.</p> : null}
            </>
          )}
          {!previewOff && preview && sameSource ? (
            <>
              <div className="preview-field__pages">
                {preview.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element -- committed files; may not be deployed yet
                  <img key={img.src} src={img.src} width={img.width} height={img.height} alt={`Sayfa ${img.page} / ${preview.pages}`} loading="lazy" />
                ))}
              </div>
              <p className="field__help">
                Gösterilen sayfalar: {preview.images.map((i) => i.page).join(' ve ')} ({preview.pages} sayfa). Yeni görseller sitede yaklaşık bir
                dakika sonra görünür.
              </p>
              <label className="choice">
                <input type="checkbox" name="previewRegen" value="1" /> Kaydederken ortadan başka bir sayfa seç
              </label>
            </>
          ) : null}
        </fieldset>
      ) : null}
    </>
  )
}
