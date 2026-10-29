'use client'

import { useActionState } from 'react'
import { deleteMediaAction, uploadMediaAction, type ActionState } from '@/app/admin/actions'
import { Csrf } from '@/components/admin/Csrf'
import { FormStatus } from '@/components/admin/FormStatus'

export function UploadForm({ csrf }: { csrf: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadMediaAction, {})
  return (
    <form action={action} className="admin-form">
      <Csrf token={csrf} />
      <FormStatus state={state} />
      <div className="field">
        <label htmlFor="file">Görsel dosyası</label>
        <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>
      <div className="field">
        <label htmlFor="alt">Alt metin</label>
        <input id="alt" name="alt" type="text" required minLength={3} maxLength={300} aria-describedby="alt-help" />
        <p id="alt-help" className="field__help">
          Görseli göremeyen biri için ne gösterdiğini anlatın. Örnek: “İskele korkuluğunda eksik orta tahta”.
        </p>
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Yükleniyor…' : 'Yükle'}
      </button>
    </form>
  )
}

export function DeleteMediaForm({ csrf, src, sha }: { csrf: string; src: string; sha: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteMediaAction, {})
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Görsel kalıcı olarak silinsin mi?')) e.preventDefault()
      }}
    >
      <Csrf token={csrf} />
      <input type="hidden" name="src" value={src} />
      <input type="hidden" name="sha" value={sha ?? ''} />
      <FormStatus state={state} />
      <button className="button button--quiet admin-danger-link" type="submit" disabled={pending}>
        Sil
      </button>
    </form>
  )
}
