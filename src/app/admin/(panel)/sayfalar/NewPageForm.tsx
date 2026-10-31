'use client'

import { useActionState, useState } from 'react'
import { createPageAction, type PageSaveState } from '@/app/admin/page-actions'
import { slugify } from '@/lib/slug'
import { Csrf } from '@/components/admin/Csrf'

export function NewPageForm({ csrf }: { csrf: string }) {
  const [state, action, pending] = useActionState<PageSaveState, FormData>(createPageAction, {})
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  return (
    <form action={action} className="admin-form admin-card">
      <h2>Yeni sayfa</h2>
      <Csrf token={csrf} />
      {state.error ? (
        <div className="notice notice--danger" role="alert">
          <p>{state.error}</p>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="page-title">Sayfa adı</label>
        <input
          id="page-title"
          name="title"
          required
          minLength={2}
          maxLength={120}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!touched) setSlug(slugify(e.target.value))
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="page-slug">Adres</label>
        <input
          id="page-slug"
          name="slug"
          required
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          aria-describedby="page-slug-help"
          onChange={(e) => {
            setTouched(true)
            setSlug(e.target.value)
          }}
        />
        <p id="page-slug-help" className="field__help">
          Sayfa sitede /{slug || 'sayfa-adresi'} adresinde açılır. Yeni sayfa taslak olarak başlar.
        </p>
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Oluşturuluyor…' : 'Oluştur ve düzenle'}
      </button>
    </form>
  )
}
