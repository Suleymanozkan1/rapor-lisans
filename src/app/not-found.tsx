import Link from 'next/link'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="icerik" className="wrap not-found">
        <p className="not-found__code rise" aria-hidden="true">
          404
        </p>
        <h1 className="rise rise-2">Sayfa bulunamadı</h1>
        <p className="lede rise rise-3">Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir.</p>
        <ul className="rise rise-4">
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
