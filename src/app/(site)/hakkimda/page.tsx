import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings, mediaFor } from '@/lib/content'
import { renderMarkdown } from '@/lib/markdown'
import { siteUrl } from '@/lib/env'
import { absoluteUrl, jsonLd } from '@/lib/seo'

export function generateMetadata(): Metadata {
  const s = getSettings()
  return {
    title: 'Hakkımda',
    description: s.author.shortBio || `${s.author.name} hakkında.`,
    alternates: { canonical: '/hakkimda' },
    openGraph: { type: 'profile' },
  }
}

export default async function AboutPage() {
  const s = getSettings()
  const bio = s.author.bio ? await renderMarkdown(s.author.bio) : null
  const photo = s.author.photo
  const sameAs = Object.values(s.social).filter(Boolean)
  const base = siteUrl()
  // Only facts that are visible on this page go into structured data.
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: s.author.name,
    jobTitle: s.author.jobTitle || undefined,
    description: s.author.shortBio || undefined,
    url: absoluteUrl(base, '/hakkimda'),
    image: photo ? absoluteUrl(base, photo.src) : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <header className="page-band">
        <div className="wrap">
          <h1 className="rise">Hakkımda</h1>
          <p className="rise rise-2">
            {s.author.name}
            {s.author.jobTitle ? `, ${s.author.jobTitle}` : ''}
          </p>
        </div>
      </header>
      <div className="wrap plain-page about-grid">
        <div>
          {s.author.shortBio ? <p className="lede">{s.author.shortBio}</p> : null}
          {bio ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: bio.html }} />
          ) : (
            <div className="empty">
              <strong>Biyografi yakında eklenecek.</strong>
              <p>Bu arada yazılara göz atabilir veya iletişim bilgilerine ulaşabilirsiniz.</p>
            </div>
          )}
          <p className="page-actions">
            <Link className="button" href="/blog">
              Yazıları oku
            </Link>
            <Link className="button button--quiet" href="/iletisim">
              İletişim
            </Link>
          </p>
        </div>
        {photo ? (
          <figure className="portrait reveal-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.alt} width={mediaFor(photo.src)?.width} height={mediaFor(photo.src)?.height} />
          </figure>
        ) : null}
      </div>
    </>
  )
}
