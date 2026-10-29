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
  const controller = s.privacy.controller || s.author.name
  return (
    <div className="wrap plain-page">
      <h1>Gizlilik ve KVKK bilgilendirmesi</h1>
      {s.privacy.updatedAt ? <p className="lede">Son güncelleme: {formatDate(s.privacy.updatedAt)}</p> : null}
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
          formu bulundurmaz. Yazı tipleri sitenin kendi sunucusundan yüklenir.
        </p>
        <p>
          Site Vercel altyapısında barındırılır. Barındırma sağlayıcısı, güvenlik ve hizmetin işletilmesi amacıyla IP adresi,
          tarayıcı bilgisi ve istek zamanı gibi teknik kayıtları sınırlı süre tutabilir. Bu kayıtlar yurt dışındaki sunucularda
          işlenebilir.
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
      </div>
    </div>
  )
}
