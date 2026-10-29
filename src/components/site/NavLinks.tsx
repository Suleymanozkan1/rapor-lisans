'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/blog', label: 'Yazılar' },
  { href: '/hakkimda', label: 'Hakkımda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/ara', label: 'Ara' },
]

export function NavLinks() {
  const path = usePathname()
  return (
    <ul>
      {LINKS.map((l) => {
        const active = path === l.href || (l.href === '/blog' && (path.startsWith('/blog/') || path.startsWith('/kategori/') || path.startsWith('/etiket/')))
        return (
          <li key={l.href}>
            <Link href={l.href} aria-current={active ? 'page' : undefined}>
              {l.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
