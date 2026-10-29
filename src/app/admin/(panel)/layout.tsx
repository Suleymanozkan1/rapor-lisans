import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guard'
import { storeKind } from '@/lib/env'
import { AdminNav } from '@/components/admin/AdminNav'
import { Csrf } from '@/components/admin/Csrf'
import { logout } from '../login-actions'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const kind = storeKind()
  return (
    <div className="admin-shell">
      <a href="#panel-icerik" className="skip-link">
        İçeriğe geç
      </a>
      <header className="admin-bar">
        <Link href="/admin" className="admin-bar__title">
          Yönetim paneli
        </Link>
        <span className="admin-muted">
          {kind === 'github' ? 'Depo: GitHub' : kind === 'local' ? 'Depo: yerel dosyalar (geliştirme)' : 'Depo yapılandırılmamış'}
        </span>
        <div className="admin-bar__end">
          <Link href="/" target="_blank">
            Siteyi aç
          </Link>
          <form action={logout}>
            <Csrf token={session.csrf} />
            <button type="submit" className="button button--quiet">
              Çıkış yap
            </button>
          </form>
        </div>
      </header>
      <div className="admin-body">
        <nav className="admin-nav" aria-label="Panel menüsü">
          <AdminNav />
        </nav>
        <main id="panel-icerik" className="admin-main" tabIndex={-1}>
          {kind === 'none' ? (
            <div className="notice notice--warn" role="alert">
              <p>
                İçerik deposu yapılandırılmamış: değişiklikler kaydedilemez. Vercel ortam değişkenlerine <code>GITHUB_TOKEN</code>,{' '}
                <code>GITHUB_OWNER</code>, <code>GITHUB_REPO</code> ekleyin (README: “GitHub entegrasyonu”).
              </p>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}
