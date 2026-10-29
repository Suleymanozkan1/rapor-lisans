import Link from 'next/link'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="wrap plain-page">
        <h1>Sayfa bulunamadı</h1>
        <p className="lede">Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir.</p>
        <ul>
          <li>
            <Link href="/blog">Tüm yazılara göz atın</Link>
          </li>
          <li>
            <Link href="/ara">Sitede arama yapın</Link>
          </li>
          <li>
            <Link href="/">Ana sayfaya dönün</Link>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
