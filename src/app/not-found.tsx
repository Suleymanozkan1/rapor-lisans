import Link from 'next/link'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="wrap not-found">
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1>Sayfa bulunamadı</h1>
        <p className="lede">Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir.</p>
        <ul>
          <li>
            <Link className="button" href="/blog">
              Yazıları oku
            </Link>
          </li>
          <li>
            <Link className="button button--quiet" href="/ara">
              Sitede ara
            </Link>
          </li>
          <li>
            <Link className="button button--quiet" href="/">
              Ana sayfa
            </Link>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
