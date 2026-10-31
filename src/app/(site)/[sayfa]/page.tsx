import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageRender } from '@/components/builder/PageRender'
import { getCustomPage, getSiteData, listCustomPages } from '@/lib/pages/site'

/** Pages created in Panel › Sayfalar. Known routes (/blog, /magaza, …) take precedence over this one. */
export const dynamicParams = false

export function generateStaticParams() {
  return listCustomPages().map((p) => ({ sayfa: p.slug }))
}

export async function generateMetadata({ params }: PageProps<'/[sayfa]'>): Promise<Metadata> {
  const page = getCustomPage((await params).sayfa)
  if (!page) return {}
  return { title: page.meta.title, description: page.meta.description || undefined, alternates: { canonical: `/${(await params).sayfa}` } }
}

export default async function CustomPage({ params }: PageProps<'/[sayfa]'>) {
  const page = getCustomPage((await params).sayfa)
  if (!page) notFound()
  return <PageRender data={page.data} site={getSiteData()} />
}
