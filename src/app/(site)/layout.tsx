import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#icerik" className="skip-link">
        İçeriğe geç
      </a>
      <SiteHeader />
      <main id="icerik" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
