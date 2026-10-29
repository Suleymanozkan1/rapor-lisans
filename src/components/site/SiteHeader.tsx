import Link from 'next/link'
import { getSettings } from '@/lib/content'
import { NavLinks } from './NavLinks'

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr-TR'))
    .join('')
}

export function BrandMark() {
  const s = getSettings()
  return (
    <span className="brand__mark" aria-hidden="true">
      {s.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo.src} alt="" width={42} height={42} />
      ) : (
        initials(s.author.name)
      )}
    </span>
  )
}

export function SiteHeader() {
  const s = getSettings()
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href="/" className="brand">
          <BrandMark />
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
