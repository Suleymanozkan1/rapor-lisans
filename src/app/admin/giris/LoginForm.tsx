'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '../login-actions'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  return (
    <form action={action} className="admin-form" noValidate>
      {state.error ? (
        <div className="notice notice--danger" role="alert">
          <p>{state.error}</p>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="username">Kullanıcı adı</label>
        <input id="username" name="username" type="text" autoComplete="username" required maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="password">Parola</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Kontrol ediliyor…' : 'Giriş yap'}
      </button>
    </form>
  )
}
