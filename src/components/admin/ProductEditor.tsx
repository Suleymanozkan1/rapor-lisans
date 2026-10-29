'use client'

import { useActionState, useState } from 'react'
import { saveProductAction, type ActionState } from '@/app/admin/actions'
import { slugify } from '@/lib/slug'
import { Csrf } from './Csrf'
import { FormStatus } from './FormStatus'
import { ProductFileField, type ProductFileValue } from './ProductFileField'
import { keepValuesOnSubmit } from './keepValues'

export type EditorProduct = {
  slug: string
  sha: string
  title: string
  excerpt: string
  body: string
  status: 'draft' | 'published'
  price: string
  file: ProductFileValue
  format: string
  features: string
  coverSrc: string
  coverAlt: string
  order: string
  sample: boolean
}

type Props = { csrf: string; product: EditorProduct | null; media: { src: string; alt: string }[]; fileStore: 'blob' | 'local' | 'none' }

export function ProductEditor({ csrf, product: p, media, fileStore }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {})
  const [title, setTitle] = useState(p?.title ?? '')
  const [slug, setSlug] = useState(p?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(p))
  const [coverSrc, setCoverSrc] = useState(p?.coverSrc ?? '')
  const [coverAlt, setCoverAlt] = useState(p?.coverAlt ?? '')
  const err = (k: string) => state.fields?.[k]

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="admin-form admin-editor">
      <Csrf token={csrf} />
      <input type="hidden" name="originalSlug" value={p?.slug ?? ''} />
      <input type="hidden" name="sha" value={p?.sha ?? ''} />
      <FormStatus state={state} />
      {p?.sample ? (
        <div className="notice notice--warn" role="note">
          <p>Bu bir örnek üründür ve satın alınamaz. Gerçek açıklama, fiyat ve satılacak dosyayla kaydettiğinizde “Örnek ürün” etiketi kalkar.</p>
        </div>
      ) : null}

      <div className="admin-editor__main">
        <div className="field">
          <label htmlFor="title">Ürün adı</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={title}
            aria-invalid={Boolean(err('title'))}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slugTouched) setSlug(slugify(e.target.value))
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="slug">Adres (slug)</label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            aria-describedby="slug-help"
            aria-invalid={Boolean(err('slug'))}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
          />
          <p id="slug-help" className="field__help">
            Ürün sayfası: /magaza/{slug || 'urun-adresi'}. Yalnızca küçük harf, rakam ve tire.
          </p>
        </div>
        <ProductFileField key={p?.file?.pathname ?? 'yeni'} csrf={csrf} slug={slug} value={p?.file ?? null} storeKind={fileStore} />
        <div className="field">
          <label htmlFor="excerpt">Kısa açıklama</label>
          <textarea id="excerpt" name="excerpt" rows={3} maxLength={300} defaultValue={p?.excerpt} aria-describedby="excerpt-help" />
          <p id="excerpt-help" className="field__help">
            Ürün kartında ve sayfanın başında görünür.
          </p>
        </div>
        <div className="field">
          <label htmlFor="features">Neler var? (her satıra bir madde)</label>
          <textarea id="features" name="features" rows={6} defaultValue={p?.features} aria-describedby="features-help" />
          <p id="features-help" className="field__help">
            En fazla 12 madde. Ürünün gerçekten içerdiği şeyleri yazın.
          </p>
        </div>
        <div className="field">
          <label htmlFor="body">Ayrıntılı açıklama (Markdown)</label>
          <textarea id="body" name="body" rows={14} defaultValue={p?.body} className="admin-code" />
        </div>
      </div>

      <div className="admin-editor__side">
        <fieldset className="field">
          <legend>Durum</legend>
          <label className="choice">
            <input type="radio" name="status" value="draft" defaultChecked={(p?.status ?? 'draft') === 'draft'} /> Taslak
          </label>
          <label className="choice">
            <input type="radio" name="status" value="published" defaultChecked={p?.status === 'published'} /> Yayında
          </label>
          <p className="field__help">Taslak ürünler mağazada ve site haritasında görünmez. Fiyatı ve dosyası olmayan ürün yayında olsa da satışa açılmaz.</p>
        </fieldset>
        <div className="field">
          <label htmlFor="price">Fiyat (TL)</label>
          <input id="price" name="price" type="text" inputMode="decimal" maxLength={12} defaultValue={p?.price} aria-describedby="price-help" aria-invalid={Boolean(err('price'))} />
          <p id="price-help" className="field__help">
            KDV dahil satış fiyatı, örneğin 149 veya 149,90. Ödeme sayfasında bu tutar tahsil edilir.
          </p>
        </div>
        <div className="field">
          <label htmlFor="format">Biçim</label>
          <input id="format" name="format" type="text" maxLength={80} defaultValue={p?.format} placeholder="PDF, 24 sayfa" />
        </div>
        <div className="field">
          <label htmlFor="coverSrc">Ürün görseli</label>
          <select
            id="coverSrc"
            name="coverSrc"
            value={coverSrc}
            aria-describedby="cover-help"
            onChange={(e) => {
              setCoverSrc(e.target.value)
              const m = media.find((x) => x.src === e.target.value)
              if (m && !coverAlt) setCoverAlt(m.alt)
            }}
          >
            <option value="">Marka kapağı (otomatik)</option>
            {media.map((m) => (
              <option key={m.src} value={m.src}>
                {m.alt} ({m.src.split('/').pop()})
              </option>
            ))}
          </select>
          <p id="cover-help" className="field__help">
            Görsel seçilmezse Güvenli Çalış gönderi stilinde sarı-siyah bir kapak kullanılır.
          </p>
        </div>
        {coverSrc ? (
          <div className="field">
            <label htmlFor="coverAlt">Görsel alt metni</label>
            <input id="coverAlt" name="coverAlt" type="text" required maxLength={300} value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} aria-invalid={Boolean(err('cover.alt'))} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="order">Sıra</label>
          <input id="order" name="order" type="number" min={0} max={999} defaultValue={p?.order ?? '100'} aria-describedby="order-help" />
          <p id="order-help" className="field__help">
            Küçük sayı önce listelenir.
          </p>
        </div>
        <div className="admin-actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </form>
  )
}
