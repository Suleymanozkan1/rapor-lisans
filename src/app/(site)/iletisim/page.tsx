import type { Metadata } from 'next'
import { Fragment } from 'react'
import { getSettings } from '@/lib/content'

export const metadata: Metadata = { title: 'İletişim', alternates: { canonical: '/iletisim' } }

export default function ContactPage() {
  const s = getSettings()
  const c = s.contact
  const social = [
    ['LinkedIn', s.social.linkedin],
    ['X', s.social.x],
    ['Instagram', s.social.instagram],
    ['YouTube', s.social.youtube],
  ].filter(([, href]) => href)
  const hasAny = c.email || c.phone || c.location || social.length > 0
  return (
    <div className="wrap plain-page">
      <h1>İletişim</h1>
      <p className="lede">{c.note || 'Yazılarla ilgili soru, düzeltme ve önerileriniz için aşağıdaki kanalları kullanabilirsiniz.'}</p>
      {hasAny ? (
        <dl className="contact-list">
          {c.email ? (
            <>
              <dt>E-posta</dt>
              <dd>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </dd>
            </>
          ) : null}
          {c.phone ? (
            <>
              <dt>Telefon</dt>
              <dd>
                <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
              </dd>
            </>
          ) : null}
          {c.location ? (
            <>
              <dt>Konum</dt>
              <dd>{c.location}</dd>
            </>
          ) : null}
          {social.map(([label, href]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>
                <a href={href} rel="me noopener noreferrer" target="_blank">
                  {href.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <div className="empty">
          <p>İletişim bilgileri henüz eklenmedi.</p>
        </div>
      )}
      <div className="notice">
        <p>
          Bu sitede iletişim formu bulunmuyor; ileti göndermek için e-posta istemcinizi kullanırsınız. Paylaştığınız kişisel
          veriler hakkında bilgi için <a href="/gizlilik">Gizlilik ve KVKK</a> sayfasına bakın.
        </p>
      </div>
    </div>
  )
}
