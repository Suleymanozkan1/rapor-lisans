import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Ödeme sonucu', robots: { index: false, follow: false } }

/** Shown when a payment return cannot be matched to an order (expired or unknown token). */
export default function PaymentResultPage() {
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1>Ödeme sonucu bulunamadı</h1>
          <p>Bu ödeme bir siparişle eşleştirilemedi veya oturumun süresi doldu.</p>
        </div>
      </header>
      <div className="wrap plain-page">
        <div className="prose">
          <p>
            Kartınızdan tahsilat yapıldıysa onay e-postası birkaç dakika içinde gelir. Gelmezse bankanızın gönderdiği tahsilat
            bilgisiyle birlikte bize yazın; siparişinizi bulup dosyanızı iletelim.
          </p>
          <p>
            <Link href="/magaza">Mağazaya dön</Link>
          </p>
        </div>
      </div>
    </>
  )
}
