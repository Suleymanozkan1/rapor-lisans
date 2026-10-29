'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MagnifyingGlass } from '@phosphor-icons/react'

const LINKS = [
  { href: '/blog', label: 'Yazılar' },
  { href: '/magaza', label: 'Mağaza' },
  { href: '/hakkimda', label: 'Hakkımda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/ara', label: 'Ara', icon: true },
]

export function NavLinks() {
  const path = usePathname()
  return (
    <ul>
      {LINKS.map((l) => {
        const active = path === l.href || (l.href === '/magaza' && path.startsWith('/magaza/')) || (l.href === '/blog' && (path.startsWith('/blog/') || path.startsWith('/kategori/') || path.startsWith('/etiket/')))
        return (
          <li key={l.href}>
            <Link href={l.href} aria-current={active ? 'page' : undefined}>
              {l.icon ? <MagnifyingGlass size={18} weight="bold" aria-hidden="true" /> : null}
              {l.icon ? <span className="nav-label--compact">{l.label}</span> : l.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
