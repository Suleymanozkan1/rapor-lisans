'use client'

import { useActionState } from 'react'
import { rewriteTagAction, type ActionState } from '@/app/admin/actions'
import { Csrf } from '@/components/admin/Csrf'
import { FormStatus } from '@/components/admin/FormStatus'

export function TagForm({ csrf, slug, label }: { csrf: string; slug: string; label: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(rewriteTagAction, {})
  return (
    <form
      action={action}
      className="admin-inline-form"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        if (submitter?.value === 'delete' && !window.confirm(`"${label}" etiketi tüm yazılardan kaldırılsın mı?`)) e.preventDefault()
      }}
    >
      <Csrf token={csrf} />
      <input type="hidden" name="from" value={slug} />
      <label htmlFor={`to-${slug}`} className="visually-hidden">
        {label} için yeni ad
      </label>
      <input id={`to-${slug}`} name="to" type="text" placeholder="Yeni ad" maxLength={40} defaultValue={label} />
      <button className="button button--quiet" type="submit" name="intent" value="rename" disabled={pending}>
        Yeniden adlandır
      </button>
      <button className="button button--quiet admin-danger-link" type="submit" name="intent" value="delete" disabled={pending}>
        Kaldır
      </button>
      <FormStatus state={state} />
    </form>
  )
}
