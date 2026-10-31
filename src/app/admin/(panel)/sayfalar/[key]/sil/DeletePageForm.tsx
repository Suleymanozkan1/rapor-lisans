'use client'

import { useActionState } from 'react'
import { deletePageAction, type PageSaveState } from '@/app/admin/page-actions'
import { Csrf } from '@/components/admin/Csrf'

export function DeletePageForm({ csrf, pageKey, sha }: { csrf: string; pageKey: string; sha: string }) {
  const [state, action, pending] = useActionState<PageSaveState, FormData>(deletePageAction, {})
  return (
    <form action={action} className="admin-form">
      <Csrf token={csrf} />
      <input type="hidden" name="key" value={pageKey} />
      <input type="hidden" name="sha" value={sha} />
      {state.error ? (
        <div className="notice notice--danger" role="alert">
          <p>{state.error}</p>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="confirm">
          Onaylamak için sayfanın adresini yazın: <code>{pageKey}</code>
        </label>
        <input id="confirm" name="confirm" type="text" required autoComplete="off" />
      </div>
      <button className="button button--danger" type="submit" disabled={pending}>
        {pending ? 'Siliniyor…' : 'Kalıcı olarak sil'}
      </button>
    </form>
  )
}
