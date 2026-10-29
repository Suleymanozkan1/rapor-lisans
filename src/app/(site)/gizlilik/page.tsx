import type { Metadata } from 'next'
import { getSettings } from '@/lib/content'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'Gizlilik ve KVKK bilgilendirmesi', alternates: { canonical: '/gizlilik' } }

/*
 * Describes what this codebase actually does: no analytics, no third-party
 * scripts, no cookies for visitors. Update this page if that changes.
 * The text is general information, not legal advice; have it reviewed.
 */
export default function PrivacyPage() {
  const s = getSettings()
  const controller = s.privacy.controller || s.seller.legalName || s.author.name
  return (
    <>
      <header className="page-band">
        <div className="wrap">
          <h1 className="rise">Gizlilik ve KVKK bilgilendirmesi</h1>
          {s.privacy.updatedAt ? <p className="rise rise-2">Son güncelleme: {formatDate(s.privacy.updatedAt)}</p> : null}
        </div>
      </header>
      <div className="wrap plain-page">
      <div className="prose">
        <h2>Veri sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bu sitenin veri sorumlusu {controller}’dır.
          {s.contact.email ? (
            <>
              {' '}
              Başvurularınızı <a href={`mailto:${s.contact.email}`}>{s.contact.email}</a> adresine iletebilirsiniz.
            </>
          ) : null}
        </p>
        <h2>Ziyaretçilerden toplanan veriler</h2>
        <p>
          Site, ziyaretçiler için çerez kullanmaz; analiz, reklam veya takip amaçlı üçüncü taraf betik içermez ve iletişim
          formu bulundurmaz. Yazı tipleri sitenin kendi sunucusundan yüklenir. Instagram gibi dış bağlantılara
          tıkladığınızda o sitelerin kendi gizlilik kuralları geçerli olur.
        </p>
        <p>
          Site Vercel altyapısında barındırılır. Barındırma sağlayıcısı, güvenlik ve hizmetin işletilmesi amacıyla IP adresi,
          tarayıcı bilgisi ve istek zamanı gibi teknik kayıtları sınırlı süre tutabilir. Bu kayıtlar yurt dışındaki sunucularda
          işlenebilir.
        </p>
        <h2>Sipariş verdiğinizde</h2>
        <p>
          Veriler, ödeme formunu doldurmanızla elektronik ortamda toplanır. Mağazadan ürün satın aldığınızda adınız, soyadınız, e-posta adresiniz, telefon numaranız, il ve fatura adresiniz,
          siparişin içeriği ve tutarı, onayladığınız sözleşme metni, onay zamanı ve IP adresiniz işlenir.
        </p>
        <ul>
          <li>
            <strong>Amaçlar:</strong> siparişin alınması ve ödemenin doğrulanması, dosyanın teslimi ve indirme bağlantısının
            gönderilmesi, faturalandırma, iade ve şikayetlerin yanıtlanması, yasal saklama yükümlülükleri ve kötüye kullanımın
            önlenmesi.
          </li>
          <li>
            <strong>Hukuki sebepler (KVKK m. 5/2):</strong> sözleşmenin kurulması ve ifası (c), hukuki yükümlülüğün yerine
            getirilmesi (ç; fatura, vergi ve tüketici mevzuatı kayıtları), bir hakkın tesisi, kullanılması veya korunması (e;
            uyuşmazlıklarda ispat) ve meşru menfaat (f; dolandırıcılığın önlenmesi). Bu işlemeler için açık rıza istenmez.
          </li>
          <li>
            <strong>Aktarılan taraflar:</strong> ödeme için iyzico Ödeme Hizmetleri A.Ş. (kart bilgilerini yalnızca iyzico alır;
            bu site görmez ve saklamaz), barındırma için Vercel Inc., sipariş kayıtları için veritabanı sağlayıcısı, e-posta
            gönderimi için e-posta sağlayıcısı, fatura için GİB e-Arşiv sistemi veya özel entegratör ve mali müşavir, yasal
            zorunluluk halinde yetkili kamu kurumları. Barındırma (Vercel), veritabanı ve e-posta sağlayıcılarının sunucuları
            yurt dışında (ABD veya AB) bulunabilir; bu aktarımlar KVKK m. 9/4 uyarınca Kurul’un belirlediği standart sözleşmeye
            dayanılarak yapılır.
          </li>
          <li>
            <strong>Saklama süresi:</strong> sipariş ve sözleşme kayıtları en az üç yıl (Mesafeli Sözleşmeler Yönetmeliği m.
            20), fatura ve muhasebe kayıtları vergi ve ticaret mevzuatındaki süreler boyunca saklanır, sonra silinir veya anonim
            hâle getirilir.
          </li>
        </ul>
        <p>
          Ödeme sayfasında kart bilgileriniz doğrudan iyzico’ya iletilir; iyzico’nun kendi gizlilik politikası geçerlidir. Bu
          site, ziyaretçiler veya alıcılar için çerez kullanmaz.
        </p>
        <h2>Çerezler</h2>
        <p>
          Yalnızca yönetim paneline giriş yapan site yöneticisinin tarayıcısına, oturumu sürdürmek için zorunlu bir oturum
          çerezi yazılır. Bu çerez ziyaretçilere yazılmaz, en fazla 8 saat geçerlidir ve çıkış yapıldığında silinir.
        </p>
        <h2>E-posta ile iletişim</h2>
        <p>
          E-posta ile yazdığınızda adınız, e-posta adresiniz ve iletinizin içeriği yalnızca size yanıt vermek amacıyla
          kullanılır.
        </p>
        <h2>Haklarınız</h2>
        <p>
          KVKK’nın 11. maddesi uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini
          isteme gibi haklara sahipsiniz. Talepleriniz için yukarıdaki iletişim adresini kullanabilirsiniz.
        </p>
        <h2>Görseller</h2>
        <p>
          Sitedeki genel fotoğraflar temsilidir ve belirli bir işyerini veya olayı göstermez. Kaynak: Unsplash (Unsplash Lisansı);
          fotoğrafçılar Declan Sun, Tanya Paquet, John Cardamone, Pop &amp; Zebra, Ümit Yıldırım, Ronnakorn Triraganon ve Glenov Brankovic.
        </p>
      </div>
      </div>
    </>
  )
}
