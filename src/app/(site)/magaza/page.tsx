import type { Metadata } from 'next'
import { ShoppingBagOpen } from '@phosphor-icons/react/ssr'
import { getPublishedProducts, getSettings } from '@/lib/content'
import { ProductList } from '@/components/site/ProductList'
import { EmptyPosts } from '@/components/site/PostList'

export const metadata: Metadata = {
  title: 'Mağaza',
  description: 'İş sağlığı ve güvenliği için dijital dokümanlar. Ödeme ve teslimat Shopier üzerinden yapılır.',
  alternates: { canonical: '/magaza' },
}

export default function StorePage() {
  const s = getSettings()
  const products = getPublishedProducts()
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1 className="rise">Mağaza</h1>
          <p className="rise rise-2">
            {s.siteName} için hazırlanan dijital dokümanlar. Ödeme, fatura ve teslimat Shopier üzerinden yapılır.
          </p>
        </div>
      </header>
      <div className="wrap section section--tight">
        {products.length > 0 ? (
          <ProductList products={products} />
        ) : (
          <EmptyPosts title="Ürünler hazırlanıyor.">
            <p>Yeni dokümanlar eklendiğinde burada listelenecek.</p>
          </EmptyPosts>
        )}

        <section className="store-info" aria-labelledby="how-title">
          <div>
            <h2 id="how-title">Satın alma nasıl işler?</h2>
            <ol>
              <li>Ürün sayfasında “Shopier’de satın al” düğmesine basın; ürünün Shopier sayfası açılır.</li>
              <li>Ödemeyi Shopier’in ödeme sayfasında tamamlayın. Bu site kart veya sipariş bilgisi almaz.</li>
              <li>Teslimat, fatura ve iade, Shopier’deki ürün sayfasında belirtilen koşullarla Shopier üzerinden yürür.</li>
            </ol>
          </div>
          {s.shop.url ? (
            <a className="button button--ink" href={s.shop.url} target="_blank" rel="noopener noreferrer">
              <ShoppingBagOpen size={20} aria-hidden="true" />
              Shopier mağazasını aç
            </a>
          ) : null}
        </section>
      </div>
    </>
  )
}
