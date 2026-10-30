import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings } from '@/lib/content'
import { DOWNLOAD_DAYS, DOWNLOAD_LIMIT } from '@/lib/shop'

export const metadata: Metadata = { title: 'Satış ve iade koşulları', alternates: { canonical: '/satis-bilgileri' } }

/*
 * Seller identity (6563 sayılı Kanun md. 3) and the sales terms. The per-order
 * pre-information form and contract are generated in src/lib/legal.ts.
 * General information, not legal advice; have it reviewed.
 */
export default function SalesTermsPage() {
  const { seller: s, siteName } = getSettings()
  const rows: [string, string][] = [
    ['Satıcı', s.legalName],
    ['MERSİS numarası', s.mersisNo],
    ['Adres', s.address],
    ['Telefon', s.phone],
    ['E-posta', s.email],
    ['KEP adresi', s.kep],
    ['Vergi dairesi', s.taxOffice],
    ['Vergi kimlik numarası', s.taxNumber],
    ['Meslek odası', s.chamber],
  ]
  const filled = rows.filter(([, v]) => v)
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1>Satış ve iade koşulları</h1>
          <p>{siteName} mağazasında satılan dijital ürünler için geçerlidir.</p>
        </div>
      </header>
      <div className="wrap plain-page">
        <div className="prose">
          <h2>Satıcı bilgileri</h2>
          {filled.length ? (
            <dl className="seller-facts">
              {filled.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{k === 'E-posta' ? <a href={`mailto:${v}`}>{v}</a> : v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Satıcı bilgileri henüz girilmedi; bu bilgiler girilene kadar mağazada satış yapılmaz.</p>
          )}

          <h2>Ürünler ve fiyatlar</h2>
          <p>
            Mağazadaki ürünler elektronik ortamda indirilerek teslim edilen dijital dokümanlardır; fiziksel teslimat yoktur. Fiyatlar
            Türk lirasıdır ve KDV dahildir. Her ürünün içeriği, dosya biçimi ve hangi programla açılacağı ürün sayfasında ve sipariş
            sırasında gösterilen ön bilgilendirme formunda yazar.
          </p>

          <h2>Ödeme</h2>
          <p>
            Ödeme, iyzico Ödeme Hizmetleri A.Ş.nin güvenli ödeme sayfasında kredi veya banka kartıyla, tek çekim olarak yapılır. Kart
            bilgileriniz bu siteye ulaşmaz ve bu sitede saklanmaz.
          </p>

          <h2>Teslimat</h2>
          <p>
            Ödeme onaylandığında dosya sipariş sayfanızda indirilmeye hazır olur ve sayfanın bağlantısı e-posta adresinize gönderilir.
            Bağlantı {DOWNLOAD_DAYS} gün ve en fazla {DOWNLOAD_LIMIT} indirme için geçerlidir. Süre veya hak dolarsa sipariş
            numaranızla yazmanız yeterli; yeni bağlantı gönderilir.
          </p>

          <h2>Cayma hakkı</h2>
          <p>
            Mesafeli Sözleşmeler Yönetmeliği madde 15 birinci fıkra (ğ) bendi uyarınca, tüketiciye anında teslim edilen gayrimaddi
            mallarda cayma hakkı kullanılamaz. Sipariş sırasında dijital içeriğin hemen teslim edilmesini istediğinizi ve teslimattan
            sonra cayma hakkınızı kullanamayacağınızı ayrıca onaylarsınız. Ödemeyi tamamlamadan önce siparişten hiçbir yükümlülük
            doğmadan vazgeçebilirsiniz.
          </p>

          <h2>Ayıplı ürün ve iade</h2>
          <p>
            Dosya açılmıyor, eksik veya açıklamasına aykırıysa 6502 sayılı Tüketicinin Korunması Hakkında Kanun’un 11. maddesindeki
            haklarınız saklıdır: sipariş numaranızla {s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : 'satıcıya'} yazın;
            dosya düzeltilerek yeniden gönderilir veya talebiniz halinde bedel kartınıza iade edilir.
          </p>

          <h2>Şikayet ve uyuşmazlıklar</h2>
          <p>
            Şikayetlerinizi yukarıdaki iletişim bilgilerine iletebilirsiniz. Ticaret Bakanlığınca her yıl belirlenen parasal
            sınırlar dahilinde tüketici hakem heyetlerine, bu sınırların üzerinde tüketici mahkemelerine başvurabilirsiniz.
            Başvurular E-Devlet üzerinden Tüketici Bilgi Sistemi (TÜBİS) ile de yapılabilir.
          </p>

          <h2>Kişisel veriler</h2>
          <p>
            Sipariş için verdiğiniz bilgilerin nasıl işlendiği <Link href="/gizlilik">gizlilik ve KVKK bilgilendirmesinde</Link>{' '}
            anlatılır.
          </p>
        </div>
      </div>
    </>
  )
}
