import Link from 'next/link'
import { getSettings } from '@/lib/content'

export function SiteFooter() {
  const s = getSettings()
  const social = [
    { href: s.social.linkedin, label: 'LinkedIn' },
    { href: s.social.x, label: 'X' },
    { href: s.social.instagram, label: 'Instagram' },
    { href: s.social.youtube, label: 'YouTube' },
  ].filter((x) => x.href)
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <p>
          © {new Date().getFullYear()} {s.author.name}. Yazılar genel bilgilendirme amaçlıdır; işyerinize özgü risk
          değerlendirmesinin yerini tutmaz.
        </p>
        <nav aria-label="Alt menü">
          <ul>
            <li>
              <Link href="/gizlilik">Gizlilik ve KVKK</Link>
            </li>
            <li>
              <Link href="/rss.xml">RSS</Link>
            </li>
            {social.map((x) => (
              <li key={x.label}>
                <a href={x.href} rel="me noopener noreferrer" target="_blank">
                  {x.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
