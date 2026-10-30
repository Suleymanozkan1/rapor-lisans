import Link from 'next/link'
import { FileText } from '@phosphor-icons/react/ssr'
import type { Product } from '@/lib/types'
import { formatPrice } from '@/lib/products'
import { getSettings, mediaFor } from '@/lib/content'

/**
 * Cover art in the style of the Güvenli Çalış posts (yellow slanted panel on
 * black, logo, serif title) for products that have no cover image.
 */
export function ProductArt({ title, large = false }: { title: string; large?: boolean }) {
  const logo = getSettings().logo
  return (
    <div className={`product-art${large ? ' product-art--large' : ''}`} aria-hidden="true">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.src} alt="" width={96} height={96} loading="lazy" />
      ) : null}
      <span className="product-art__title">{title}</span>
    </div>
  )
}

export function ProductMedia({ product: p, large = false }: { product: Product; large?: boolean }) {
  if (!p.cover) return <ProductArt title={p.title} large={large} />
  const meta = mediaFor(p.cover.src)
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.cover.src} alt={p.cover.alt} width={meta?.width} height={meta?.height} loading={large ? 'eager' : 'lazy'} decoding="async" />
}

export function ProductList({ products, headingLevel = 2 }: { products: Product[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <ul className="product-grid">
      {products.map((p) => (
        <li key={p.slug}>
          <article className="product-card">
            <div className="product-card__media">
              <ProductMedia product={p} />
            </div>
            <div className="product-card__body">
              {p.sample ? <span className="chip chip--sample">Örnek ürün</span> : null}
              <H>
                <Link href={`/magaza/${p.slug}`}>{p.title}</Link>
              </H>
              {p.excerpt ? <p>{p.excerpt}</p> : null}
              <div className="product-card__foot">
                <strong className="price">{formatPrice(p.price) ?? 'Yakında'}</strong>
                {p.format ? (
                  <span>
                    <FileText size={16} aria-hidden="true" />
                    {p.format}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}
