import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedProduct, getSettings } from '@/lib/content'
import { formatPrice } from '@/lib/products'
import { DOWNLOAD_DAYS, DOWNLOAD_LIMIT, shopStatus } from '@/lib/shop'
import { isForSale } from '@/lib/types'
import { siteUrl } from '@/lib/env'
import { CheckoutForm } from './CheckoutForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Satın al', robots: { index: false, follow: false } }

export default async function CheckoutPage({ params }: PageProps<'/magaza/[slug]/satin-al'>) {
  const p = getPublishedProduct((await params).slug)
  if (!p) notFound()
  const s = getSettings()
  const ready = isForSale(p) && shopStatus(s).ready
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <nav className="breadcrumb" aria-label="Konum">
            <ol>
              <li>
                <Link href="/magaza">Mağaza</Link>
              </li>
              <li>
                <Link href={`/magaza/${p.slug}`}>{p.title}</Link>
              </li>
            </ol>
          </nav>
          <h1>Satın al</h1>
          <p>
            {p.title}, {formatPrice(p.price) ?? ''}
          </p>
        </div>
      </header>
      <div className="wrap checkout-wrap">
        {ready ? (
          <CheckoutForm
            slug={p.slug}
            dateIso={new Date().toISOString()}
            priceLabel={formatPrice(p.price)!}
            contract={{
              seller: s.seller,
              siteName: s.siteName,
              siteUrl: siteUrl(),
              product: { title: p.title, excerpt: p.excerpt, format: p.format, features: p.features, fileName: p.file!.name, contentType: p.file!.contentType },
              priceKurus: Math.round(p.price! * 100),
              downloadDays: DOWNLOAD_DAYS,
              downloadLimit: DOWNLOAD_LIMIT,
            }}
          />
        ) : (
          <div className="notice notice--warn" role="status">
            <p>Bu ürün şu an satışta değil. Kısa süre sonra tekrar deneyin.</p>
          </div>
        )}
      </div>
    </>
  )
}
