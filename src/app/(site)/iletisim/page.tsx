import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings } from '@/lib/content'
import { PageRender } from '@/components/builder/PageRender'
import { getSiteData, getSystemPage } from '@/lib/pages/site'

export function generateMetadata(): Metadata {
  const { meta } = getSystemPage('iletisim')
  return { title: meta.title || 'İletişim', description: meta.description || undefined, alternates: { canonical: '/iletisim' } }
}

export default function ContactPage() {
  const s = getSettings()
  return (
    <>
      <PageRender data={getSystemPage('iletisim').data} site={getSiteData()} />
      {/* Seller identity and the privacy note are legal requirements (ETHS Yön. m.5, KVKK): fixed, not editable blocks. */}
      <div className="wrap">
        {s.seller.legalName ? (
          <section className="seller-contact" aria-labelledby="seller-title">
            <h2 id="seller-title">Satıcı bilgileri</h2>
            <dl className="seller-facts">
              {(
                [
                  ['Unvan / ad soyad', s.seller.legalName],
                  ['MERSİS numarası', s.seller.mersisNo],
                  ['Adres', s.seller.address],
                  ['Telefon', s.seller.phone],
                  ['E-posta', s.seller.email],
                  ['KEP adresi', s.seller.kep],
                  ['Vergi dairesi ve no', [s.seller.taxOffice, s.seller.taxNumber].filter(Boolean).join(', ')],
                  ['Meslek odası', s.seller.chamber],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <p>
              Satış, teslimat ve iade koşulları: <Link href="/satis-bilgileri">Satış ve iade koşulları</Link>.
            </p>
          </section>
        ) : null}
        <div className="notice">
          <p>
            Bu sitede iletişim formu bulunmuyor; ileti göndermek için e-posta istemcinizi kullanırsınız. Paylaştığınız kişisel
            veriler hakkında bilgi için <Link href="/gizlilik">Gizlilik ve KVKK</Link> sayfasına bakın.
          </p>
        </div>
      </div>
    </>
  )
}
