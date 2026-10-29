import Link from 'next/link'
import { InstagramLogo, LinkedinLogo, Rss, XLogo, YoutubeLogo } from '@phosphor-icons/react/ssr'
import { getCategories, getSettings } from '@/lib/content'
import { BrandMark } from './SiteHeader'

export function SiteFooter() {
  const s = getSettings()
  const social = [
    { href: s.social.linkedin, label: 'LinkedIn', Icon: LinkedinLogo },
    { href: s.social.x, label: 'X', Icon: XLogo },
    { href: s.social.instagram, label: 'Instagram', Icon: InstagramLogo },
    { href: s.social.youtube, label: 'YouTube', Icon: YoutubeLogo },
  ].filter((x) => x.href)
  const categories = getCategories().slice(0, 6)
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__grid">
          <div>
            <Link href="/" className="brand">
              <BrandMark />
              <span>
                <span className="brand__name">{s.siteName}</span>
                {s.tagline ? <span className="brand__tagline">{s.tagline}</span> : null}
              </span>
            </Link>
            <p>Yazılar genel bilgilendirme amaçlıdır; işyerinize özgü risk değerlendirmesinin yerini tutmaz.</p>
          </div>
          {categories.length > 0 ? (
            <nav aria-labelledby="footer-topics">
              <h2 id="footer-topics">Konular</h2>
              <ul>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/kategori/${c.slug}`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <nav aria-labelledby="footer-site">
            <h2 id="footer-site">Site</h2>
            <ul className="site-footer__social">
              <li>
                <Link href="/hakkimda">Hakkımda</Link>
              </li>
              <li>
                <Link href="/iletisim">İletişim</Link>
              </li>
              <li>
                <Link href="/gizlilik">Gizlilik ve KVKK</Link>
              </li>
              <li>
                <Link href="/rss.xml">
                  <Rss size={18} aria-hidden="true" />
                  RSS
                </Link>
              </li>
              {social.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a href={href} rel="me noopener noreferrer" target="_blank">
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="site-footer__legal">
          <p>
            © {new Date().getFullYear()} {s.author.name}
          </p>
          <p>Fotoğraflar temsilidir (Unsplash Lisansı).</p>
        </div>
      </div>
    </footer>
  )
}
