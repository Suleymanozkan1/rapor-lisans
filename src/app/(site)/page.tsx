import type { Metadata } from 'next'
import { PageRender } from '@/components/builder/PageRender'
import { getSiteData, getSystemPage } from '@/lib/pages/site'

export function generateMetadata(): Metadata {
  const { meta } = getSystemPage('anasayfa')
  return meta.description ? { description: meta.description } : {}
}

/** Built in Panel › Sayfalar › Ana sayfa; until then the default layout (src/lib/pages/defaults.ts). */
export default function HomePage() {
  return <PageRender data={getSystemPage('anasayfa').data} site={getSiteData()} />
}
