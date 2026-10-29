'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Özet' },
  { href: '/admin/yazilar', label: 'Yazılar' },
  { href: '/admin/urunler', label: 'Ürünler' },
  { href: '/admin/siparisler', label: 'Siparişler' },
  { href: '/admin/kategoriler', label: 'Kategoriler' },
  { href: '/admin/etiketler', label: 'Etiketler' },
  { href: '/admin/medya', label: 'Medya' },
  { href: '/admin/ayarlar', label: 'Site ayarları' },
  { href: '/admin/kayitlar', label: 'İşlem kayıtları' },
]

export function AdminNav() {
  const path = usePathname()
  return (
    <ul>
      {LINKS.map((l) => {
        const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href)
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
