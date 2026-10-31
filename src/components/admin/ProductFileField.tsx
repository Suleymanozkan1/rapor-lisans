'use client'

import { useState } from 'react'
import { fileBaseName, isValidSlug } from '@/lib/slug'
import { MAX_PRODUCT_FILE_BYTES, PRODUCT_FILE_TYPES, type ProductPreview } from '@/lib/types'

export type ProductFileValue = { pathname: string; name: string; size: number; contentType: string } | null

type StoreKind = 'blob' | 'local' | 'none'

type Props = {
  csrf: string
  slug: string
  value: ProductFileValue
  preview: ProductPreview | null
  storeKind: StoreKind
}

const ACCEPT = Object.keys(PRODUCT_FILE_TYPES)
  .map((e) => `.${e}`)
  .join(',')
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

const extOf = (name: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? '').toLowerCase()

/** Problems the server would refuse anyway, explained before anything is sent. */
function checkBeforeUpload(f: File, slug: string, only?: string): string | null {
  if (!isValidSlug(slug)) return 'Önce geçerli bir ürün adresi (slug) girin: yalnızca küçük harf, rakam ve tire.'
  const ext = extOf(f.name)
  if (only && ext !== only) return `Bu alana yalnızca .${only} dosyası yüklenebilir.`
  if (!PRODUCT_FILE_TYPES[ext]) {
    if (['docm', 'xlsm', 'pptm', 'dotx', 'xltx', 'dot', 'xlt'].includes(ext)) {
      return `.${ext} biçimi desteklenmiyor. Dosyayı programda “Farklı Kaydet” ile .docx, .xlsx veya .pptx olarak kaydedip yükleyin.`
    }
    return `İzin verilen dosya türleri: ${Object.keys(PRODUCT_FILE_TYPES).join(', ')}. Seçilen dosya: ${f.name}`
  }
  if (f.size === 0) return 'Dosya boş görünüyor.'
  if (f.size > MAX_PRODUCT_FILE_BYTES) return 'Dosya 100 MB’tan büyük. Küçültün veya ZIP içinde parçalara bölün.'
  return null
}

/** Uploads to the private file store (Vercel Blob, or the local folder in development). */
async function uploadPrivate(
  f: File,
  opts: { csrf: string; slug: string; storeKind: StoreKind; prefix?: string; onProgress: (p: number) => void },
): Promise<{ pathname: string; size: number; contentType: string }> {
  const ext = extOf(f.name)
  const base = `${opts.prefix ?? ''}${fileBaseName(f.name)}`
  if (opts.storeKind === 'blob') {
    const pathname = `urunler/${opts.slug}/${base}.${ext}`
    const clientPayload = JSON.stringify({ csrf: opts.csrf })
    const { upload } = await import('@vercel/blob/client')
    try {
      const r = await upload(pathname, f, {
        access: 'private',
        handleUploadUrl: '/admin/api/urun-dosyasi',
        clientPayload,
        multipart: f.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => opts.onProgress(Math.round(p.percentage)),
      })
      return { pathname: r.pathname, size: f.size, contentType: r.contentType }
    } catch (e) {
      // The Blob client hides the server's reason behind "Failed to retrieve the client token"; ask for it.
      if (e instanceof Error && /client token/i.test(e.message)) {
        const res = await fetch('/admin/api/urun-dosyasi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'blob.generate-client-token', payload: { pathname, clientPayload, multipart: false } }),
        }).catch(() => null)
        const reason = res && !res.ok ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : null
        if (res?.status === 403) throw new Error(`${reason ?? 'Oturum geçersiz.'} Sayfayı yenileyin; gerekirse çıkış yapıp yeniden girin.`)
        if (reason) throw new Error(reason)
        throw new Error('Yükleme izni alınamadı. Sayfayı yenileyip tekrar deneyin.')
      }
      throw e
    }
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
    const problem = checkBeforeUpload(f, slug)
    if (problem) {
      setError(problem)
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
    const problem = checkBeforeUpload(f, slug, 'pdf')
    if (problem) {
      setPreviewError(problem)
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
              PDF, Word (.docx, .doc), Excel (.xlsx, .xls), PowerPoint (.pptx, .ppt) veya ZIP; en fazla 100 MB. Dosya herkese açık değildir.
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
