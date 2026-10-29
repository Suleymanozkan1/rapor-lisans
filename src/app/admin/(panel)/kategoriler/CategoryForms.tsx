'use client'

import { useActionState } from 'react'
import { deleteCategoryAction, saveCategoryAction, type ActionState } from '@/app/admin/actions'
import type { Category } from '@/lib/types'
import { Csrf } from '@/components/admin/Csrf'
import { FormStatus } from '@/components/admin/FormStatus'

type Props = { csrf: string; categories: Category[]; sha: string | null; counts: Record<string, number> }

function CategoryForm({ csrf, sha, category, count }: { csrf: string; sha: string | null; category?: Category; count?: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategoryAction, {})
  const [delState, delAction, delPending] = useActionState<ActionState, FormData>(deleteCategoryAction, {})
  const id = category?.slug ?? 'yeni'
  return (
    <div className="admin-card">
      <form action={action} className="admin-form">
        <Csrf token={csrf} />
        <input type="hidden" name="sha" value={sha ?? ''} />
        <input type="hidden" name="originalSlug" value={category?.slug ?? ''} />
        <FormStatus state={state} />
        <div className="field-row">
          <div className="field">
            <label htmlFor={`name-${id}`}>Ad</label>
            <input id={`name-${id}`} name="name" type="text" required minLength={2} maxLength={60} defaultValue={category?.name} />
          </div>
          <div className="field">
            <label htmlFor={`slug-${id}`}>Adres (slug)</label>
            <input id={`slug-${id}`} name="slug" type="text" maxLength={80} defaultValue={category?.slug} placeholder="Boşsa addan üretilir" />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`desc-${id}`}>Açıklama</label>
          <textarea id={`desc-${id}`} name="description" rows={2} maxLength={300} defaultValue={category?.description} />
        </div>
        <div className="admin-actions">
          <button className="button" type="submit" disabled={pending}>
            {category ? 'Kaydet' : 'Kategori ekle'}
          </button>
          {category ? <span className="admin-muted">{count ?? 0} yazı</span> : null}
        </div>
      </form>
      {category ? (
        <form
          action={delAction}
          onSubmit={(e) => {
            if (!window.confirm(`"${category.name}" kategorisi silinsin mi?`)) e.preventDefault()
          }}
        >
          <Csrf token={csrf} />
          <input type="hidden" name="sha" value={sha ?? ''} />
          <input type="hidden" name="slug" value={category.slug} />
          <FormStatus state={delState} />
          <button className="button button--quiet admin-danger-link" type="submit" disabled={delPending || (count ?? 0) > 0}>
            Sil
          </button>
        </form>
      ) : null}
    </div>
  )
}

export function CategoryForms({ csrf, categories, sha, counts }: Props) {
  return (
    <>
      <section className="admin-section">
        <h2>Yeni kategori</h2>
        <CategoryForm key={`new-${sha}`} csrf={csrf} sha={sha} />
      </section>
      <section className="admin-section">
        <h2>Mevcut kategoriler</h2>
        {categories.length === 0 ? <p className="admin-muted">Henüz kategori yok.</p> : null}
        {categories.map((c) => (
          <CategoryForm key={`${c.slug}-${sha}`} csrf={csrf} sha={sha} category={c} count={counts[c.slug]} />
        ))}
      </section>
    </>
  )
}
