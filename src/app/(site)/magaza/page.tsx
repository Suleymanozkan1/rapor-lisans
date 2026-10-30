import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedProducts } from '@/lib/content'
import { ProductList } from '@/components/site/ProductList'
import { EmptyPosts } from '@/components/site/PostList'

export const metadata: Metadata = {
  title: 'Mağaza',
  description: 'İş sağlığı ve güvenliği için dijital dokümanlar: güvenli ödeme, ödemeden hemen sonra indirme.',
  alternates: { canonical: '/magaza' },
}

export default function StorePage() {
  const products = getPublishedProducts()
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1>Mağaza</h1>
          <p>
            İş sağlığı ve güvenliği için hazırlanmış dijital dokümanlar. Güvenli ödeme, ödemeden hemen sonra indirme.
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
              <li>Ürünü seçin ve “Satın al” deyin; fatura bilgilerinizi girip ön bilgilendirme formunu ve sözleşmeyi onaylayın.</li>
              <li>Ödemeyi iyzico’nun güvenli ödeme sayfasında kartla yapın. Kart bilgileriniz bu siteye ulaşmaz.</li>
              <li>Ödeme onaylanınca dosya sipariş sayfanızda indirilmeye hazır olur; bağlantı e-postanıza da gelir.</li>
            </ol>
            <p>
              Dijital içerik olduğu için, onayınızla anında teslim edildiğinde cayma hakkı kullanılamaz. Ayrıntılar:{' '}
              <Link href="/satis-bilgileri">Satış ve iade koşulları</Link>.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
