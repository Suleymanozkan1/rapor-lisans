# Mimari karar notları

Her karar: bağlam, seçim, gerekçe, bedeli. Tarih: 2026-10-29.

## K1. Framework: Next.js 16 App Router + TypeScript

- **Bağlam:** Depo boştu (yalnızca `lisans.json`). Hedef Vercel Hobby.
- **Seçim:** Next.js 16.4.3, React 19.3, TypeScript, Turbopack (varsayılan).
- **Gerekçe:** Vercel'in birinci sınıf desteklediği framework; statik üretim (SSG) ile sunucu
  işlemleri (Server Actions) aynı projede. Sürüm npm'den doğrulandı; API'ler paketle gelen
  `node_modules/next/dist/docs` belgelerine göre yazıldı (ör. `middleware` yerine `proxy.ts`,
  async `params`/`cookies()`).
- **Bedel:** Next.js'in hızlı değişen API'si; güncellemelerde `next typegen` ve testler
  çalıştırılmalı.

## K2. İçerik saklama: Git tabanlı CMS

- **Bağlam:** Ücretsiz, kalıcı, taşınabilir saklama gerekiyor. Vercel Functions dosya sistemi
  kalıcı değil.
- **Seçim:** İçerik depoda Markdown/JSON. Panel GitHub Git Data API ile commit atar
  (`src/lib/store/github.ts`): blob'lar, yeni tree, commit, `force:false` ile ref güncelleme.
- **Gerekçe:** Ek servis/veritabanı yok, ücret yok; tam geçmiş = denetim kaydı + yedek; içerik
  standart biçimde, başka sisteme taşınabilir. Birden çok dosya (yazı + görsel + medya dizini)
  tek commit'te atomik değişir.
- **Bedel:** Her kayıt bir build tetikler (planın günlük deploy sınırına sayılır). Yayın gecikmesi ~1 dk.
  Depo private olmalı (taslaklar Git'te). Medya büyüdükçe depo büyür (görseller küçültülerek
  yüklenmeli).
- **Alternatif (seçilmedi):** Barındırılan veritabanı. Ücretsiz katmanların ticari kullanım ve
  kota şartları ayrıca doğrulanmalı, veri taşınabilirliği daha zayıf; Git yaklaşımı ihtiyacı
  karşıladığı için gerek görülmedi.

## K3. Public sayfalar tamamen statik

- **Seçim:** Tüm public rotalar build sırasında üretilir (`generateStaticParams`,
  `dynamicParams = false`, `force-static` route handler'lar). Arama, statik
  `/search-index.json` üzerinden tarayıcıda yapılır.
- **Gerekçe:** Ziyaretçi trafiği fonksiyon çağrısı/CPU kotası tüketmez; bilinmeyen slug her zaman
  404; taslak sızıntısı için tek kontrol noktası `isPublic()` (`src/lib/posts.ts`).
- **Bedel:** Public sayfalarda CSP nonce kullanılamaz (statik HTML); `script-src 'unsafe-inline'`
  gerekir. Bu risk Markdown'ın sunucuda temizlenmesiyle dengelenir.

## K4. Kimlik doğrulama: tek yönetici, durumsuz imzalı oturum

- **Seçim:** `ADMIN_USERNAME` + scrypt hash (`ADMIN_PASSWORD_HASH`), HMAC-SHA256 imzalı oturum
  çerezi (8 saat), oturum kimliğine bağlı CSRF token'ı, `SESSION_VERSION` ile toplu iptal.
- **Gerekçe:** Veritabanı olmadan güvenli oturum. Next.js Server Actions zaten Origin/Host
  karşılaştırır, ancak Origin başlığı olmayan isteklere izin verir (Next.js belgesi); bu yüzden
  ayrıca CSRF token'ı ve SameSite=Strict çerez.
- **Bedel:** Çıkış, çalınmış bir token'ı sunucuda iptal etmez (süresi dolana veya
  `SESSION_VERSION` artırılana kadar geçerli). Hız sınırı varsayılan olarak örnek başına bellekte.

## K5. Yetki kontrolü katmanları

1. `src/proxy.ts`: çerez yoksa `/admin/giris`'e yönlendirir, `noindex` ve `no-store` ekler.
   (Next.js belgesine göre proxy tek başına yetki kontrolü için yeterli değildir.)
2. `src/app/admin/(panel)/layout.tsx` ve **her sayfa** `requireAdmin()` çağırır.
3. **Her Server Action** ilk iş `requireAdminAction(formData)` çağırır: imza, süre, kullanıcı,
   sürüm, CSRF token'ı, Origin.
4. Depo katmanı yolları `assertLogicalPath()` ile `content/` ve `uploads/` altına hapseder.

## K6. Markdown güvenliği

- `remark-rehype` ham HTML'i geçirmez; `rehype-sanitize` (GitHub şeması, href için yalnızca
  http/https/mailto/tel) ikinci katman; başlık id'leri temizlikten sonra `rehype-slug` ile
  üretilir. Dış bağlantılara `rel="noopener noreferrer nofollow"`.
- YAML ön bilgisi `yaml` paketinin `core` şemasıyla okunur; alias ve bilinmeyen etiket
  reddedilir. `gray-matter` kullanılmadı çünkü `---js` motoru kod çalıştırır.
- Tüm alanlar `zod` şemasıyla doğrulanır (`src/lib/types.ts`); geçersiz dosya build'i durdurur.

## K7. Görseller

- `next/image` optimizasyonu kullanılmadı (Hobby'de aylık 5.000 dönüşüm sınırı). Görseller
  `<img width height loading="lazy">` ile olduğu gibi servis edilir; boyutlar yüklemede okunup
  `media.json`'a yazılır (CLS önlenir).
- Yükleme sınırı 3 MB (Vercel istek gövdesi sınırı 4,5 MB); Server Actions `bodySizeLimit` 4 MB.

## K8. Yazı tipleri

`@fontsource` paketleriyle kendi alan adımızdan servis (OFL lisanslı). Google Fonts CDN'ine
ziyaretçi isteği gitmez; KVKK bilgilendirmesi sadeleşir.

## K9. İletişim formu yok

İletişim sayfası e-posta/telefon/sosyal bağlantı gösterir. Form, e-posta gönderimi için üçüncü
taraf servis veya kişisel veri saklama gerektirirdi; ikisi de ücretsiz-öncelikli ve KVKK
sadeliği hedefiyle çelişir.

## K10. Denetim kaydı

Her panel işlemi `panel: <işlem> <hedef>` mesajlı bir commit'tir (ne zaman, ne; commit yazarı
GitHub token'ının sahibi). Yönetici kullanıcı adı, depo public olabileceği için commit mesajına
yazılmaz; sunucu loguna yazılan `admin_audit` JSON satırı kullanıcıyı da içerir. Parola, token,
çerez loglanmaz.
Vercel Hobby runtime logları 1 saat tutulur; kalıcı kayıt Git geçmişidir.

## K11. Mağaza: kendi ödeme sistemi (iyzico + Postgres + özel Blob)

- **Bağlam:** Dijital İSG dokümanları sitede satılacak (önce Shopier vitrini denendi; kullanıcı
  kendi sistemini istedi). Site Vercel Pro'da.
- **Seçim:**
  - Ürünler Git'te (`content/products/*.md`), satılan dosya **özel (private) Vercel Blob**
    deposunda; ürün dosyasında yalnızca Blob yolu, boyutu, türü ve SHA-256 özeti durur.
  - Siparişler **Postgres**'te (üretimde Neon, HTTP sürücüsü; yerelde ve testte PGlite, aynı
    SQL). Durum makinesi `pending > paid | failed > refunded`; her geçiş tek bir
    `UPDATE ... WHERE status IN (...) RETURNING` ile atomik, böylece tarayıcı dönüşü ve webhook
    yarışsa da e-posta bir kez gider.
  - Ödeme **iyzico Checkout Form** (barındırılan ödeme sayfası): kart verisi siteye hiç gelmez.
    Sunucu kendi imzasıyla (IYZWSv2) formu başlatır, yanıt imzasını doğrular, alıcıyı iyzico'ya
    yönlendirir. Dönüşte gelen `token` yalnızca anahtardır: sonuç, sunucudan sunucuya **imzalı
    Retrieve** ile alınır ve imza, sipariş kimliği, sepet numarası, token, tutar, para birimi ve
    `fraudStatus = 1` eşleşmeden sipariş ödenmiş sayılmaz. Webhook aynı Retrieve'i tetikler.
  - Teslim: sipariş sayfası ve indirme bağlantısı `HMAC(DOWNLOAD_SECRET, sipariş:sürüm)` ile
    imzalı; sunucuda gizli bir şey saklanmaz, yeni bağlantı sürümü artırır. İndirme **POST**'tur
    (posta tarayıcıları hak harcamaz), atomik sayılır (7 gün, 5 indirme) ve dosya Blob'dan
    akış olarak, `Content-Disposition: attachment` ve `nosniff` ile verilir.
  - Hukuki metin: ön bilgilendirme formu ve sözleşme tek bir saf fonksiyonla
    (`src/lib/legal.ts`) üretilir; ödeme sayfasında canlı önizleme, sunucuda aynı metin
    siparişle saklanır ve e-postayla gönderilir.
- **Gerekçe:** Ödeme sağlayıcısının barındırılan sayfası PCI kapsamını en aza indirir;
  imzalı Retrieve dışında hiçbir girdiye güvenilmez. Postgres, sipariş gibi parasal kayıtlar
  için kısıtlar (CHECK, UNIQUE) ve atomik güncelleme sağlar; Git yalnızca içerik için kalır.
- **Bedel:** Neon, Blob, Resend ve iyzico hesapları ve anahtarları gerekir (eksikse satış
  kapalı kalır ve panel eksikleri listeler). Fatura otomatik değildir (e-Arşiv elle).
  iyzico'nun canlı ortamı bu çalışma ortamında denenemedi; protokol resmî belgeler ve SDK
  kaynak koduyla, iki yayımlanmış test vektörüyle ve sahte bir iyzico sunucusuyla doğrulandı.
- **Alternatifler (seçilmedi):** Shopier vitrini (ilk sürüm; kullanıcı kendi sistemini istedi),
  iyzico iframe/JS formu (CSP'ye üçüncü taraf betik eklemek gerekir), siparişleri Git'te tutmak
  (kişisel veri depo geçmişine girer, eşzamanlılık yok).

## K12. Bilinen sınırlar

- Ölçek: tek yönetici. Çok kullanıcılı rol sistemi yok.
- Zamanlanmış yayın için otomatik build yok.
- Panelde yeni yüklenen görsel, bir sonraki deploy'a kadar önizlemede görünmez.
- Hız sınırı sunucusuz örnekler arasında paylaşılmaz (Upstash yapılandırılmadıkça).
