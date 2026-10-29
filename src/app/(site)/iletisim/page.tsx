import type { Metadata } from 'next'
import { EnvelopeSimple, InstagramLogo, LinkedinLogo, MapPin, Phone, XLogo, YoutubeLogo } from '@phosphor-icons/react/ssr'
import { getSettings } from '@/lib/content'

export const metadata: Metadata = { title: 'İletişim', alternates: { canonical: '/iletisim' } }

export default function ContactPage() {
  const s = getSettings()
  const c = s.contact
  const items = [
    c.email ? { key: 'email', Icon: EnvelopeSimple, label: 'E-posta', href: `mailto:${c.email}`, text: c.email } : null,
    c.phone ? { key: 'phone', Icon: Phone, label: 'Telefon', href: `tel:${c.phone.replace(/[^\d+]/g, '')}`, text: c.phone } : null,
    c.location ? { key: 'loc', Icon: MapPin, label: 'Konum', text: c.location } : null,
    s.social.linkedin ? { key: 'li', Icon: LinkedinLogo, label: 'LinkedIn', href: s.social.linkedin, text: 'Profili aç', external: true } : null,
    s.social.x ? { key: 'x', Icon: XLogo, label: 'X', href: s.social.x, text: 'Profili aç', external: true } : null,
    s.social.instagram ? { key: 'ig', Icon: InstagramLogo, label: 'Instagram', href: s.social.instagram, text: 'Profili aç', external: true } : null,
    s.social.youtube ? { key: 'yt', Icon: YoutubeLogo, label: 'YouTube', href: s.social.youtube, text: 'Kanalı aç', external: true } : null,
  ].filter((x) => x !== null)
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1 className="rise">İletişim</h1>
          <p className="rise rise-2">{c.note || 'Yazılarla ilgili soru, düzeltme ve önerileriniz için aşağıdaki kanalları kullanabilirsiniz.'}</p>
        </div>
      </header>
      <div className="wrap">
        {items.length > 0 ? (
          <ul className="contact-cards">
            {items.map(({ key, Icon, label, href, text, external }) => (
              <li key={key} className="reveal">
                <div className="contact-card">
                  <Icon size={30} weight="duotone" aria-hidden="true" />
                  <span>{label}</span>
                  {href ? (
                    <a href={href} {...(external ? { rel: 'me noopener noreferrer', target: '_blank' } : {})}>
                      {text}
                    </a>
                  ) : (
                    <strong>{text}</strong>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty empty--spaced">
            <strong>İletişim bilgileri henüz eklenmedi.</strong>
          </div>
        )}
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
              Satış, teslimat ve iade koşulları: <a href="/satis-bilgileri">Satış ve iade koşulları</a>.
            </p>
          </section>
        ) : null}
        <div className="notice">
          <p>
            Bu sitede iletişim formu bulunmuyor; ileti göndermek için e-posta istemcinizi kullanırsınız. Paylaştığınız kişisel
            veriler hakkında bilgi için <a href="/gizlilik">Gizlilik ve KVKK</a> sayfasına bakın.
          </p>
        </div>
      </div>
    </>
  )
}
