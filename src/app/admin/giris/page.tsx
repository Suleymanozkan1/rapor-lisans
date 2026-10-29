import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/guard'
import { authConfig } from '@/lib/env'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Giriş' }

export default async function LoginPage() {
  if (await getAdminSession()) redirect('/admin')
  const configured = authConfig() !== null
  return (
    <main className="admin-login">
      <h1>Yönetim paneli girişi</h1>
      {configured ? (
        <LoginForm />
      ) : (
        <div className="notice notice--warn" role="alert">
          <p>
            Giriş devre dışı: <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD_HASH</code> ve en az 32 karakterlik{' '}
            <code>SESSION_SECRET</code> ortam değişkenlerini ayarlayın. Ayrıntılar README dosyasında.
          </p>
        </div>
      )}
      <p className="admin-muted">
        Giriş yaptığınızda tarayıcınıza yalnızca oturum için zorunlu bir çerez yazılır (en fazla 8 saat).
      </p>
    </main>
  )
}
