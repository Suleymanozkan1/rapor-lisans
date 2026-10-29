import Link from 'next/link'
import { getSettings } from '@/lib/content'
import { NavLinks } from './NavLinks'

export function SiteHeader() {
  const s = getSettings()
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href="/" className="brand">
          {s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo.src} alt={s.logo.alt} width={44} height={44} />
          ) : null}
          <span>
            <span className="brand__name">{s.siteName}</span>
            {s.tagline ? <span className="brand__tagline">{s.tagline}</span> : null}
          </span>
        </Link>
        <nav className="site-nav" aria-label="Ana menü">
          <NavLinks />
        </nav>
      </div>
    </header>
  )
}
