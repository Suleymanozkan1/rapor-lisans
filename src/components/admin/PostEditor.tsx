'use client'

import { useActionState, useState } from 'react'
import { savePostAction, type ActionState } from '@/app/admin/actions'
import { slugify } from '@/lib/slug'
import { Csrf } from './Csrf'
import { FormStatus } from './FormStatus'

export type EditorPost = {
  slug: string
  sha: string
  title: string
  excerpt: string
  body: string
  status: 'draft' | 'published'
  category: string
  tags: string
  coverSrc: string
  coverAlt: string
  seoTitle: string
  seoDescription: string
  references: string
  updatedAt: string
}

type Props = {
  csrf: string
  post: EditorPost | null
  categories: { slug: string; name: string }[]
  media: { src: string; alt: string }[]
}

export function PostEditor({ csrf, post, categories, media }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePostAction, {})
  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? '')
  const [coverSrc, setCoverSrc] = useState(post?.coverSrc ?? '')
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? '')
  const err = (k: string) => state.fields?.[k]

  return (
    <form action={action} className="admin-form admin-editor">
      <Csrf token={csrf} />
      <input type="hidden" name="originalSlug" value={post?.slug ?? ''} />
      <input type="hidden" name="sha" value={post?.sha ?? ''} />
      <FormStatus state={state} />

      <div className="admin-editor__main">
        <div className="field">
          <label htmlFor="title">Başlık</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={160}
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
            Yazının adresi: /blog/{slug || 'yazi-adresi'}. Yalnızca küçük harf, rakam ve tire.
            {post?.status === 'published' ? ' Yayındaki bir yazının adresini değiştirmek eski bağlantıları bozar.' : ''}
          </p>
        </div>
        <div className="field">
          <label htmlFor="excerpt">Özet</label>
          <textarea id="excerpt" name="excerpt" rows={3} maxLength={400} defaultValue={post?.excerpt} aria-describedby="excerpt-help" />
          <p id="excerpt-help" className="field__help">
            Listelerde ve yazının başında görünür. 1–2 cümle.
          </p>
        </div>
        <div className="field">
          <label htmlFor="body">İçerik (Markdown)</label>
          <textarea id="body" name="body" rows={24} defaultValue={post?.body} className="admin-code" aria-describedby="body-help" />
          <details id="body-help" className="field__help">
            <summary>Markdown kısa rehberi</summary>
            <p>
              <code>## Ara başlık</code>, <code>### Alt başlık</code>, <code>**kalın**</code>, <code>*italik*</code>,{' '}
              <code>- madde</code>, <code>1. sıralı madde</code>, <code>[bağlantı](https://…)</code>,{' '}
              <code>![alt metin](/uploads/…)</code>, <code>&gt; alıntı</code>. HTML etiketleri güvenlik nedeniyle işlenmez.
              Ara başlıklar içerik tablosunu oluşturur.
            </p>
          </details>
        </div>
        <div className="field">
          <label htmlFor="references">Kaynakça</label>
          <textarea
            id="references"
            name="references"
            rows={5}
            defaultValue={post?.references}
            aria-describedby="refs-help"
          />
          <p id="refs-help" className="field__help">
            Her satıra bir kaynak. Bağlantı eklemek için: <code>Kaynak adı | https://adres</code>
          </p>
        </div>
      </div>

      <div className="admin-editor__side">
        <fieldset className="field">
          <legend>Durum</legend>
          <label className="choice">
            <input type="radio" name="status" value="draft" defaultChecked={(post?.status ?? 'draft') === 'draft'} /> Taslak
          </label>
          <label className="choice">
            <input type="radio" name="status" value="published" defaultChecked={post?.status === 'published'} /> Yayında
          </label>
          <p className="field__help">Taslaklar sitede, site haritasında, RSS’te ve aramada görünmez.</p>
        </fieldset>

        <div className="field">
          <label htmlFor="category">Kategori</label>
          <select id="category" name="category" defaultValue={post?.category ?? ''}>
            <option value="">Kategori yok</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tags">Etiketler</label>
          <input id="tags" name="tags" type="text" defaultValue={post?.tags} aria-describedby="tags-help" maxLength={1000} />
          <p id="tags-help" className="field__help">
            Virgülle ayırın: iskele, yüksekte çalışma
          </p>
        </div>
        <div className="field">
          <label htmlFor="coverSrc">Kapak görseli</label>
          <select
            id="coverSrc"
            name="coverSrc"
            value={coverSrc}
            onChange={(e) => {
              setCoverSrc(e.target.value)
              const m = media.find((x) => x.src === e.target.value)
              if (m && !coverAlt) setCoverAlt(m.alt)
            }}
          >
            <option value="">Kapak yok</option>
            {media.map((m) => (
              <option key={m.src} value={m.src}>
                {m.alt} ({m.src.split('/').pop()})
              </option>
            ))}
          </select>
          {media.length === 0 ? <p className="field__help">Önce Medya sayfasından görsel yükleyin.</p> : null}
        </div>
        {coverSrc ? (
          <div className="field">
            <label htmlFor="coverAlt">Kapak alt metni</label>
            <input id="coverAlt" name="coverAlt" type="text" required maxLength={300} value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} aria-invalid={Boolean(err('cover.alt'))} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="updatedAt">Güncelleme tarihi</label>
          <input id="updatedAt" name="updatedAt" type="date" defaultValue={post?.updatedAt} aria-describedby="upd-help" />
          <p id="upd-help" className="field__help">
            Boş bırakılırsa yayındaki bir yazı her kaydedildiğinde bugünün tarihi yazılır.
          </p>
        </div>
        <fieldset className="field">
          <legend>Arama motoru</legend>
          <label htmlFor="seoTitle">SEO başlığı ({seoTitle.length}/70)</label>
          <input id="seoTitle" name="seoTitle" type="text" maxLength={70} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title} />
          <label htmlFor="seoDescription">SEO açıklaması ({seoDescription.length}/170)</label>
          <textarea id="seoDescription" name="seoDescription" rows={3} maxLength={170} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          <p className="field__help">Boş bırakılırsa başlık ve özet kullanılır.</p>
        </fieldset>
        <div className="admin-actions">
          <button className="button" type="submit" name="intent" value="save" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button className="button button--quiet" type="submit" name="intent" value="preview" disabled={pending}>
            Kaydet ve önizle
          </button>
        </div>
      </div>
    </form>
  )
}
