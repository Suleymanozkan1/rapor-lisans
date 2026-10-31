import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle, FileText, LockSimple, ShieldCheck } from '@phosphor-icons/react/ssr'
import { getPublishedProduct, getPublishedProducts, getSettings } from '@/lib/content'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'
import { formatPrice } from '@/lib/products'
import { siteUrl } from '@/lib/env'
import { absoluteUrl, clip, jsonLd } from '@/lib/seo'
import { isForSale } from '@/lib/types'
import { ProductList, ProductMedia } from '@/components/site/ProductList'

export const dynamicParams = false

export function generateStaticParams() {
  return getPublishedProducts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps<'/magaza/[slug]'>): Promise<Metadata> {
  const p = getPublishedProduct((await params).slug)
  if (!p) return {}
  const s = getSettings()
  const description = p.excerpt || clip(markdownToPlainText(p.body), 160)
  const image = p.cover?.src || s.seo.defaultOgImage || undefined
  return {
    title: p.title,
    description,
    alternates: { canonical: `/magaza/${p.slug}` },
    // Demo products must not be indexed as real offers.
    robots: p.sample ? { index: false, follow: true } : undefined,
    openGraph: { title: p.title, description, url: `/magaza/${p.slug}`, images: image ? [{ url: image, alt: p.cover?.alt }] : undefined },
  }
}

export default async function ProductPage({ params }: PageProps<'/magaza/[slug]'>) {
  const p = getPublishedProduct((await params).slug)
  if (!p) notFound()
  const s = getSettings()
  const rendered = await renderMarkdown(p.body)
  const price = formatPrice(p.price)
  const base = siteUrl()
  const others = getPublishedProducts().filter((x) => x.slug !== p.slug).slice(0, 3)

  const forSale = isForSale(p)
  const ld = p.sample
    ? null
    : {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.title,
        description: p.excerpt || undefined,
        url: absoluteUrl(base, `/magaza/${p.slug}`),
        image: p.cover ? absoluteUrl(base, p.cover.src) : undefined,
        brand: { '@type': 'Brand', name: s.siteName },
        offers:
          forSale && p.price !== undefined
            ? { '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'TRY', url: absoluteUrl(base, `/magaza/${p.slug}`), availability: 'https://schema.org/InStock' }
            : undefined,
      }

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} /> : null}
      <header className="page-band page-band--article">
        <div className="wrap">
          <div className="article-head">
            <nav className="breadcrumb" aria-label="Konum">
              <ol>
                <li>
                  <Link href="/magaza">Mağaza</Link>
                </li>
              </ol>
            </nav>
            <h1>{p.title}</h1>
            {p.excerpt ? <p className="lede">{p.excerpt}</p> : null}
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="product-layout">
          <div className="product-layout__media">
            <ProductMedia product={p} large />
          </div>
          <aside className="buy-box" aria-label="Satın alma">
            <p className="buy-box__price">
              {price ? (
                <>
                  <span className="visually-hidden">Fiyat: </span>
                  {price}
                </>
              ) : (
                'Fiyat yakında'
              )}
            </p>
            {p.format ? (
              <p className="buy-box__format">
                <FileText size={20} aria-hidden="true" />
                {p.format}
              </p>
            ) : null}
            {forSale ? (
              <Link className="button buy-box__button" href={`/magaza/${p.slug}/satin-al`}>
                <LockSimple size={20} weight="bold" aria-hidden="true" />
                Satın al
              </Link>
            ) : (
              <p className="buy-box__soon">{p.sample ? 'Örnek ürün: satın alınamaz.' : 'Yakında satışta.'}</p>
            )}
            <p className="buy-box__note">
              <ShieldCheck size={20} aria-hidden="true" />
              <span>
                Ödeme iyzico’nun güvenli ödeme sayfasında yapılır; kart bilgileriniz bu siteye ulaşmaz. Ödeme onaylanınca dosyayı
                indirme bağlantısı e-postanıza gönderilir.
              </span>
            </p>
          </aside>
        </div>

        {p.sample ? (
          <div className="notice notice--warn sample-notice" role="note">
            <p>
              <strong>Örnek ürün.</strong> Bu kayıt mağaza görünümünü göstermek için hazırlanmıştır; fiyatı ve içeriği gerçek
              değildir ve satın alınamaz.
            </p>
          </div>
        ) : null}

        {p.preview ? (
          <section className="page-preview" aria-labelledby="preview-title">
            <div className="page-preview__head">
              <h2 id="preview-title">İçinden sayfalar</h2>
              <p>
                {p.preview.images.length > 1
                  ? `${p.preview.pages} sayfalık belgenin ilk sayfası ve ortasından bir sayfa.`
                  : p.preview.pages > 1
                    ? `${p.preview.pages} sayfalık belgenin ilk sayfası.`
                    : 'Belgenin tek sayfası.'}{' '}
                Satın aldığınızda belgenin tamamını{p.file && p.file.contentType !== 'application/pdf' ? ' düzenlenebilir dosya olarak' : ''} indirirsiniz.
              </p>
            </div>
            <ul className="page-preview__pages">
              {p.preview.images.map((img) => (
                <li key={img.src}>
                  <figure>
                    <a href={img.src} className="page-preview__sheet" aria-label={`Sayfa ${img.page} görselini büyük boyutta aç`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        width={img.width}
                        height={img.height}
                        alt={`${p.title}: ${p.preview!.pages} sayfanın ${img.page}. sayfası (önizleme)`}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="page-preview__badge" aria-hidden="true">
                        Önizleme
                      </span>
                    </a>
                    <figcaption>
                      Sayfa {img.page} / {p.preview!.pages}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="product-detail">
          {p.features.length > 0 ? (
            <section className="product-features" aria-labelledby="features-title">
              <h2 id="features-title">Neler var?</h2>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <CheckCircle size={22} weight="fill" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {rendered.html ? <div className="prose" dangerouslySetInnerHTML={{ __html: rendered.html }} /> : null}
        </div>

        {others.length > 0 ? (
          <section className="related" aria-labelledby="other-products">
            <h2 id="other-products">Diğer ürünler</h2>
            <ProductList products={others} headingLevel={3} />
          </section>
        ) : null}
      </div>
    </>
  )
}
