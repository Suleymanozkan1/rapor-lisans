'use client'

import { useActionState } from 'react'
import { deletePostAction, type ActionState } from '@/app/admin/actions'
import { Csrf } from '@/components/admin/Csrf'
import { FormStatus } from '@/components/admin/FormStatus'

export function DeletePostForm({ csrf, slug, sha }: { csrf: string; slug: string; sha: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deletePostAction, {})
  return (
    <form action={action} className="admin-form">
      <Csrf token={csrf} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="sha" value={sha} />
      <FormStatus state={state} />
      <div className="field">
        <label htmlFor="confirm">
          Onaylamak için yazının adresini yazın: <code>{slug}</code>
        </label>
        <input id="confirm" name="confirm" type="text" required autoComplete="off" />
      </div>
      <button className="button button--danger" type="submit" disabled={pending}>
        {pending ? 'Siliniyor…' : 'Kalıcı olarak sil'}
      </button>
    </form>
  )
}
