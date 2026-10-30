import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCategories } from '@/lib/content'
import { SearchClient } from './SearchClient'

export const metadata: Metadata = {
  title: 'Ara',
  description: 'Yazılarda arama yapın.',
  alternates: { canonical: '/ara' },
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1>Ara</h1>
          <p>Yazıların başlık, özet, etiket ve metinlerinde arama yapın.</p>
        </div>
      </header>
      <div className="wrap">
        <Suspense fallback={<p>Arama yükleniyor…</p>}>
          <SearchClient categories={getCategories().map((c) => ({ slug: c.slug, name: c.name }))} />
        </Suspense>
      </div>
    </>
  )
}
