import type { Metadata } from 'next'
import { getSettings } from '@/lib/content'
import { PageRender } from '@/components/builder/PageRender'
import { getSiteData, getSystemPage } from '@/lib/pages/site'
import { siteUrl } from '@/lib/env'
import { absoluteUrl, jsonLd } from '@/lib/seo'

export function generateMetadata(): Metadata {
  const s = getSettings()
  const meta = getSystemPage('hakkimda').meta
  return {
    title: meta.title || 'Hakkımda',
    description: meta.description || s.author.shortBio || `${s.author.name} hakkında.`,
    alternates: { canonical: '/hakkimda' },
    openGraph: { type: 'profile' },
  }
}

export default function AboutPage() {
  const s = getSettings()
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
      <PageRender data={getSystemPage('hakkimda').data} site={getSiteData()} />
    </>
  )
}
