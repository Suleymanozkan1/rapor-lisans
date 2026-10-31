# Güvenli Çalış: İSG sitesi, mağaza vitrini ve yönetim paneli

Uğur Durak'ın **Güvenli Çalış** markası (Instagram: [@guvenlicalis](https://www.instagram.com/guvenlicalis))
için Türkçe site: iş sağlığı ve güvenliği yazıları, çalışan hakları ve mevzuat notları, dijital
İSG dokümanları için bir **mağaza vitrini** ve tarayıcıdan kullanılan bir yönetim paneli.
Next.js 16 (App Router, TypeScript) ile yazıldı, **Vercel Pro** planında çalışacak şekilde
ayarlandı. Veritabanı gerektirmez: içerik Git deposunda durur.

> **Önce okuyun: üç not**
>
> 1. **Ticari kullanım için Vercel Pro gerekir.** Site ürün sattığı için Hobby (ücretsiz) planı
>    uygun değildir: Vercel'in [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)
>    sayfası "bir ürün veya hizmetin satışını reklam etmeyi" ticari kullanım sayar. Pro planı
>    ([plans/pro-plan](https://vercel.com/docs/plans/pro-plan), 2026-09-15 tarihli sürümden
>    okundu): aylık **20 $** platform ücreti, buna 1 dağıtım yapabilen ekip koltuğu ve **20 $
>    kullanım kredisi** dahil. Kredi aşılırsa kullanım ayrıca faturalanır; %75'te e-posta uyarısı
>    gelir. Bu site statik olduğu için normal trafikte kredinin içinde kalması beklenir, ama
>    **Settings > Billing > Spend Management** altında bir harcama sınırı koymanızı öneririm.
> 2. **Mağaza sitenin kendi ödeme sistemidir.** Alıcı bilgilerini girer, ön bilgilendirme
>    formunu ve mesafeli satış sözleşmesini onaylar, iyzico'nun güvenli ödeme sayfasında öder;
>    ödeme doğrulanınca dosya sipariş sayfasından indirilir ve bağlantı e-postayla gelir. Kart
>    bilgisi bu siteye hiç ulaşmaz. Satış, aşağıdaki [Mağaza kurulumu](#mağaza-kurulumu)
>    adımlarının hepsi tamamlanana kadar **kapalı** kalır. Hukuki metinler şablondur;
>    yayına almadan önce bir hukukçuya ve mali müşavirinize inceletin.
> 3. **İçerik deposu gizli (private) olmalı.** Taslaklar da Git'e commit edilir. Bu kod şu an
>    **public** bir GitHub deposunda (`rapor-lisans`); taslaklar, silinen yazılar ve commit
>    geçmişi herkes tarafından okunabilir. Yayına almadan önce projeyi **private** bir depoya
>    taşıyın. Bu depodaki `lisans.json` başka bir uygulamanın kullandığı bir dosya gibi
>    görünüyor; ona dokunulmadı, taşırken kendi deposunda bırakın.

## İçindekiler

- [Mimari kısaca](#mimari-kısaca)
- [Yerel kurulum](#yerel-kurulum)
- [Komutlar](#komutlar)
- [Vercel'e dağıtım](#vercele-dağıtım)
- [GitHub entegrasyonu](#github-entegrasyonu)
- [Yayın akışı](#yayın-akışı)
- [Sayfa düzenleyici](#sayfa-düzenleyici)
- [Mağaza kurulumu](#mağaza-kurulumu)
- [Mağazayı işletmek](#mağazayı-işletmek)
- [Marka: logo ve renkler](#marka-logo-ve-renkler)
- [Kotalar, maliyet ve aşıldığında ne olur](#kotalar-maliyet-ve-aşıldığında-ne-olur)
- [Yedekleme ve geri yükleme](#yedekleme-ve-geri-yükleme)
- [İçerik taşıma](#içerik-taşıma)
- [Güvenlik](#güvenlik)
- [Dosya haritası](#dosya-haritası)

## Mimari kısaca

- **Public site statik üretilir.** Yazılar `content/posts/*.md` (YAML ön bilgi + Markdown),
  ürünler `content/products/*.md`, ayarlar `content/settings.json`, kategoriler `content/categories.json`, medya dizini
  `content/media.json`, görseller `public/uploads/`. Build sırasında yalnızca yayımlanmış ve
  yayın tarihi geçmiş yazılar sayfalara, site haritasına, RSS'e ve arama dizinine girer.
- **Yönetim paneli** (`/admin`) sunucu tarafında çalışır. Her kayıt, GitHub API üzerinden depoya
  bir commit atar; Vercel o commit'ten yeniden build alır ve site güncellenir. Sunucu
  fonksiyonunun dosya sistemi kalıcı veri için kullanılmaz.
- Ayrıntılar ve kararların gerekçesi: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
  Tasarım sistemi: [`DESIGN.md`](DESIGN.md).

## Yerel kurulum

Gereksinim: Node.js 20.9 veya üstü (`.nvmrc`: 22).

```bash
npm ci
cp .env.example .env.local
npm run hash-password          # parolayı sorar, ADMIN_PASSWORD_HASH değerini yazdırır
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SESSION_SECRET
```

`.env.local` içinde en az şunları doldurun: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`,
`SESSION_SECRET`. Yerelde `CONTENT_STORE=local` yazarsanız panel değişiklikleri doğrudan
çalışma klasörüne yazar (GitHub gerekmez).

```bash
npm run dev             # http://localhost:3000, panel: http://localhost:3000/admin
npm run dev:test-data   # otomatik testlerin kullandığı veriyle (XSS denemesi dahil)
```

### Örnek (demo) içerik

`content/posts/` altında sitenin görünümünü göstermek için hazırlanmış **9 örnek yazı ve 1 taslak**
vardır. Her birinin ön bilgisinde `sample: true` bulunur ve yazı sayfasında "Örnek içerik" notu
gösterilir. Yazılar genel bilgilendirme amaçlıdır; Uğur Durak tarafından gözden geçirilmemiştir.
Yayına almadan önce her yazıyı panelden okuyun: düzeltip kaydettiğinizde not kalkar, istemediğiniz
yazıyı silin. Kapak görselleri `public/uploads/2026/` altındadır (lisanslar:
`public/images/CREDITS.md`).

`content/products/` altında da **3 örnek ürün** vardır (`sample: true`). Fiyatları ve içerikleri
gerçek değildir; kartlarında "Örnek ürün" etiketi ve sayfalarında uyarı görünür, `noindex`
taşırlar, site haritasına girmezler ve **satın alınamazlar** (dosyaları yok). Yayına almadan önce
bunları silin veya gerçek açıklama, fiyat ve satılacak dosyayla panelden kaydedin (kaydedince
etiket kalkar).

Yerelde mağazayı denemek için `.env.local` içine `ORDER_DB=pglite` yazın (siparişler yerel
PGlite veritabanına, dosyalar `.private-files/` klasörüne yazılır) ve iyzico **sandbox**
anahtarlarını girin. Ödemeyi uçtan uca otomatik testler sahte bir iyzico sunucusuyla
(`scripts/mock-iyzico.mjs`) sınar.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build (gerçek `content/` ile) |
| `npm start` | Build'i yerelde çalıştırır |
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm test` | Birim + entegrasyon testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright). Test verisiyle ayrı bir build (`.next-e2e`) alır, `localhost:3100` üzerinde çalıştırır. İlk kurulumda `npx playwright install chromium` gerekebilir. |
| `npm run scan:design` | Tasarım denetimi (AI şablon kalıpları + WCAG kontrastı) |
| `npm run hash-password` | Yönetici parolası için scrypt hash üretir |

## Vercel'e dağıtım

1. Projeyi **private** bir GitHub deposuna koyun (yukarıdaki nota bakın).
2. Vercel'de Pro ekibinizde **Add New > Project**, depoyu seçin. Framework: Next.js (otomatik algılanır).
   Build komutu ve çıktı ayarlarını değiştirmeyin.
3. **Settings > Environment Variables** altında (Production ve Preview için) şunları girin:
   `NEXT_PUBLIC_SITE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`,
   `CONTENT_STORE=github`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`.
4. Deploy edin. `https://<alan-adınız>/admin` adresinden giriş yapın.
5. Vercel'in Git entegrasyonu açık olmalı (varsayılan): `GITHUB_BRANCH` dalına gelen her commit
   yeni bir production build başlatır.

> **Doğrulanmadı:** Bu ortamda bir Vercel hesabına erişim olmadığı için panelden atılan commit'in
> otomatik deploy tetiklediği gerçek bir Vercel projesinde test edilemedi. İlk kurulumdan sonra
> panelden bir taslak kaydedip Vercel **Deployments** sekmesinde yeni build'in başladığını kontrol
> edin.

## GitHub entegrasyonu

Panel, içeriği GitHub'ın Git Data API'siyle (blob, tree, commit, ref) tek commit'te yazar.

1. GitHub: **Settings > Developer settings > Personal access tokens > Fine-grained tokens >
   Generate new token**.
2. **Repository access:** *Only select repositories* ve yalnızca sitenin deposu.
3. **Permissions > Repository permissions > Contents: Read and write.** Başka izin vermeyin
   (Metadata: Read otomatik gelir).
4. Bir son kullanma tarihi seçin ve takviminize yenileme hatırlatması koyun.
5. Token'ı yalnızca Vercel ortam değişkeni `GITHUB_TOKEN` olarak girin. Repoya, `.env.example`'a
   veya bir sohbete yazmayın. Token tarayıcıya gönderilmez ve loglanmaz.

Token yoksa panel çalışıyormuş gibi davranmaz: üstte "İçerik deposu yapılandırılmamış" uyarısı
eksik değişkenleri adıyla sayar, panel yayındaki (deploy edilmiş) içeriği **salt okunur** gösterir
ve kayıt işlemleri açık bir hata mesajıyla reddedilir. Token geçersizse GitHub'ın hatası gösterilir.

## Yayın akışı

1. Panelde yazıyı oluşturun; **Taslak** olarak kaydedin. Taslaklar sitede, site haritasında,
   RSS'te ve aramada görünmez (testlerle doğrulanır). **Kaydet ve önizle** ile yazıyı sitedeki
   şablonla görün.
2. **Yayınla**: yazı `status: published` olur, ilk yayın tarihi kaydedilir.
3. Yaklaşık bir dakika içinde Vercel build'i biter ve yazı yayına girer.
4. Yayındaki yazıyı her düzenlediğinizde revizyon numarası bir artar ve "Son güncelleme" tarihi
   yazılır (isterseniz tarihi elle seçebilirsiniz).
5. Aynı yazı iki sekmede açıkken eski sekmeden kayıt reddedilir; değişiklik kaybolmaz.

Gelecek tarihli yayın tarihi olan yazı, o tarihten sonraki ilk build'de görünür; zamanlanmış
otomatik build yoktur.

## Sayfa düzenleyici

**Panel › Sayfalar**: ana sayfa, Hakkımda, İletişim ve sizin açtığınız sayfalar sürükle-bırak
düzenlenir ([Puck](https://puckeditor.com), MIT lisanslı açık kaynak düzenleyici; arayüzü
Türkçedir).

- **Ekran:** solda bloklar, ortada sayfanın canlı önizlemesi (Telefon / Tablet / Masaüstü
  düğmeleri), sağda seçili bloğun ayarları. Hiçbir blok seçili değilken sağ panel sayfa
  ayarlarını gösterir (ad, arama motoru açıklaması; yeni sayfalarda durum ve menü).
  **Kaydet** sayfayı GitHub'a commit eder; site yaklaşık bir dakika sonra güncellenir.
  Geri al / yinele, blok çoğaltma ve silme, "Yapı" sekmesinde iç içe blok ağacı vardır.
- **Bloklar:**
  - **Düzen:** Bölüm (arka plan, iç boşluk, genişlik, hiza), Sütunlar (2–4 sütun, oranlar,
    telefonda sıra), Boşluk, Ayırıcı.
  - **Temel:** Başlık (H1–H4, boyut, renk, vurgu), Metin (Markdown), Görsel (medya
    kütüphanesinden, oran, bağlantı), Düğmeler, İkon listesi, Uyarı kutusu, Kartlar, Alıntı.
  - **Etkileşimli ve medya:** Sık sorulanlar, Sekmeler, Video, Galeri, Sayılar, İlerleme
    çubukları, Sosyal bağlantılar.
  - **Site içeriği:** Sayfa başlığı bandı, Vitrin slaytı, Kayan şerit, Son yazılar, Ürünler,
    Konu dizini, İletişim şeridi, Yazar bilgisi, İletişim bilgileri. Bunlar yazıları,
    ürünleri ve ayarları kendiliğinden gösterir.
- **Her blokta "Gelişmiş":** telefonda veya masaüstünde gizle, üst/alt boşluk, giriş
  animasyonu (hareket azaltma tercihine uyar), sayfa içi bağlantı adı (#adres).
- **Marka uyumu:** renkler, yazı boyutları ve boşluklar yalnızca Güvenli Çalış paletinden
  seçilir (Asfalt, İşaret siyahı, Tehlike sarısı, Baret kırmızısı…). Serbest renk kodu ve
  yazı tipi yoktur; böylece her sayfa okunaklı ve kontrastı denetlenmiş kalır.
- **Varsayılan düzen:** ana sayfa, Hakkımda ve İletişim düzenleyicide ilk kez kaydedilene
  kadar bugünkü tasarımı bloklarla aynen üretir (`src/lib/pages/defaults.ts`).
- **Değiştirilemeyenler:** İletişim sayfasındaki satıcı bilgileri ve KVKK notu yasal
  zorunluluktur, blokların altında sabit durur. Yazılar ve ürünler kendi bölümlerinden
  düzenlenir; üst menü ve alt bilgi sabittir (yeni sayfalar "Ana menüde göster" ile menüye
  eklenir).
- **Güvenlik:** kaydedilen sayfa sunucuda blok tanımlarına göre yeniden denetlenir:
  yalnızca bilinen bloklar ve alanlar, yalnızca `/…`, `#…`, `https://`, `mailto:`, `tel:`
  bağlantıları, yalnızca medya kütüphanesindeki görseller, yalnızca YouTube/Vimeo videosu.
  Metinler Markdown'dır ve yazılardaki temizleyiciden geçer; HTML/kod bloğu yoktur. Video,
  ziyaretçi tıklayana kadar YouTube/Vimeo'dan hiçbir şey yüklemez (youtube-nocookie).
- **Dosyalar:** `content/pages/<adres>.json`. Sayfa adresi sitenin mevcut yollarıyla
  (`/blog`, `/magaza` …) çakışamaz.

## Mağaza kurulumu

Satış ancak aşağıdakilerin hepsi tamamlanınca açılır; eksikler panelde **Siparişler** ve
**Ürünler** sayfalarının üstünde tek tek listelenir.

1. **iyzico şirket hesabı.** iyzico'da bireysel hesaplarda API kullanılamaz; şirket (iyziPOS)
   başvurusu gerekir. Önce [sandbox](https://sandbox-merchant.iyzipay.com/auth/register) hesabı
   açıp deneyin (test kartı: `5528790000000008`, SMS kodu `123456`). Anahtarlar: Merchant Panel >
   Settings > Merchant Settings > API Keys ("Show detail"). Vercel'e `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` ve
   `IYZICO_BASE_URL` (`https://sandbox-api.iyzipay.com`, canlıda `https://api.iyzipay.com`)
   girin.
2. **iyzico bildirim (webhook) adresi.** Merchant Panel > Settings > Merchant Settings > Merchant Notifications:
   `https://<alan-adınız>/odeme/iyzico/bildirim`. Bu, ödeme sonrası tarayıcısını kapatan
   alıcıların siparişini de tamamlar. İmzalı bildirim (`X-IYZ-SIGNATURE-V3`) için
   entegrasyon@iyzico.com'dan imza özelliğinin açılmasını isteyin. İmza gelirse doğrulanır;
   gelmezse bildirim yalnızca siparişin iyzico'dan yeniden sorgulanmasını tetikler, kendi başına
   hiçbir siparişi ödenmiş saymaz.
3. **Sipariş veritabanı.** Vercel > Storage > Create > **Neon (Postgres)**, projeye bağlayın;
   `DATABASE_URL` otomatik eklenir. Tablolar ilk siparişte kendiliğinden oluşur.
4. **Özel dosya deposu.** Vercel > Storage > Create > **Blob**, erişim **Private** seçin (sonradan
   değiştirilemez) ve projeye bağlayın. `BLOB_READ_WRITE_TOKEN` panelden doğrudan yükleme için
   gereklidir. Dosyalar herkese açık değildir; yalnızca ödeme yapmış alıcı, imzalı ve süreli
   bağlantıyla indirebilir.
5. **`DOWNLOAD_SECRET`.** En az 32 karakter rastgele değer (`SESSION_SECRET`'tan farklı):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
6. **E-posta.** [Resend](https://resend.com) hesabında alan adınızı doğrulayın; `RESEND_API_KEY`
   ve `MAIL_FROM` (örneğin `Güvenli Çalış <siparis@alanadiniz.com>`) girin. Onay e-postası
   ön bilgilendirme formunu ve sözleşmeyi içerir (kalıcı veri saklayıcısı); bu yüzden e-posta
   olmadan satış açılmaz.
7. **Satıcı bilgileri.** Panel > Site ayarları > Satıcı bilgileri: unvan, adres, telefon,
   e-posta, vergi dairesi ve numarası (MERSİS, KEP ve meslek odası varsa). Bunlar sözleşmede,
   "Satış ve iade koşulları" ve "İletişim" sayfalarında görünür.
8. **KVKK yurt dışı aktarım.** Vercel (ABD), Neon ve Resend sunucuları yurt dışında olabilir.
   KVKK m. 9 uyarınca bu sağlayıcılarla Kurul'un **standart sözleşmesini** değiştirmeden
   imzalamanız ve imzadan sonra **5 iş günü içinde Kurum'a bildirmeniz** gerekir; gizlilik
   sayfası bu güvenceye dayanıldığını söyler. Ayrıca VERBİS kayıt yükümlülüğünüzü kontrol edin.
9. **Hukuki metinler.** `src/lib/legal.ts` (ön bilgilendirme formu ve sözleşme), "Satış ve iade
   koşulları" ve gizlilik sayfası, Mesafeli Sözleşmeler Yönetmeliği, 6502, 6563, ETHS
   Yönetmeliği ve KVKK'ya göre hazırlanmış **şablonlardır**. Bir hukukçuya inceletin; metni
   değiştirirseniz `CONTRACT_VERSION` değerini de değiştirin (her sipariş onaylanan metni ve
   sürümünü saklar).

## Mağazayı işletmek

- **Ürün eklemek:** Panel > Ürünler > Yeni ürün: ad, açıklama, "Neler var?" maddeleri, KDV
  dahil fiyat, biçim ve **satılacak dosya** (PDF, XLSX, DOCX, PPTX veya ZIP, en fazla 100 MB).
  Dosya tarayıcıdan doğrudan özel Blob deposuna yüklenir; kaydederken sunucu boyutu, türü ve
  dosya imzasını (ör. gerçekten PDF mi) yeniden kontrol eder ve SHA-256 özetini kaydeder.
  Görsel seçilmezse sarı-siyah marka kapağı çizilir.
- **Önizleme sayfaları:** ürün sayfasında belgenin **1. sayfası** ve **ortadan rastgele bir
  sayfası** görsel olarak gösterilir (3 sayfa veya daha kısa belgelerde yalnızca 1. sayfa). Sayfa
  bir kez seçilir ve saklanır; ziyaretçi sayfayı yenileyerek belgenin geri kalanını göremez.
  - **PDF:** görseller ürün kaydedilirken sunucuda çizilir (pdf.js + `@napi-rs/canvas`).
  - **Word, Excel, PowerPoint (.docx/.doc, .xlsx/.xls, .pptx/.ppt):** ek bir şey yüklemeniz
    gerekmez. Kayıt GitHub'a commit edilince **Ürün önizlemeleri** iş akışı
    (`.github/workflows/urun-onizleme.yml`) dosyayı LibreOffice ile PDF'e çevirir, sayfaları
    çizer ve görselleri commit eder; önizleme yaklaşık 2–4 dakika sonra sitede görünür. İş akışı
    dosyayı sitenin `/api/onizleme-kaynagi/<ürün>` adresinden alır; kim olduğunu GitHub'ın
    verdiği OpenID Connect belirteciyle kanıtlar (yalnızca bu deponun `main` dalındaki bu iş
    akışı kabul edilir), GitHub'da saklanan bir anahtar yoktur. Alan adı değişirse GitHub'da
    depo değişkeni `SITE_URL` tanımlayın (Settings › Secrets and variables › Actions ›
    Variables).
  - **ZIP:** sayfası olmadığı için önizleme yok.
  - "Kaydederken ortadan başka bir sayfa seç" yeni bir sayfa seçer; "Önizleme gösterme"
    görselleri kaldırır. Görseller `public/uploads/urunler/<ürün>/` altındadır.
- **Sipariş akışı:** alıcı bilgileri ve üç onay (ön bilgilendirme, sözleşme, anında teslim ve
  cayma hakkı istisnası) > iyzico ödeme sayfası > site, iyzico'dan **imzalı** sonucu sorgular;
  yalnızca imzası doğru, tutarı ve sipariş numarası eşleşen ve risk kontrolünden geçmiş
  (`fraudStatus = 1`) ödeme siparişi "ödendi" yapar. İnceleme süren ödemeler bekler ve bildirimle
  tamamlanır.
- **Teslim:** sipariş sayfasında indirme düğmesi; bağlantı 7 gün ve 5 indirme geçerlidir (posta
  tarayıcıları bağlantıyı açsa bile indirme hakkı harcanmaz). Panel > Siparişler'den onay
  e-postasını yeniden gönderebilir veya **yeni bağlantı** gönderebilirsiniz (eskisi geçersiz olur).
- **Fatura:** 1 Ocak 2026'dan itibaren tüketiciye her satış için **e-Arşiv fatura** düzenlenmesi
  gerekir (VUK 509, 573 ve 589 sayılı tebliğler). Site faturayı otomatik kesmez: GİB e-Arşiv
  Portal'dan veya entegratörünüzden düzenleyip alıcıya e-postayla gönderin, numarasını sipariş
  sayfasına kaydedin. Faturada "Bu satış internet üzerinden yapılmıştır." ibaresi, web adresi,
  ödeme şekli, ödeme ve teslim tarihi bulunmalıdır. Ayrıntıyı mali müşavirinize sorun.
- **İade:** dijital içerikte cayma hakkı yoktur, ama dosya bozuk veya eksikse alıcının yasal
  hakları vardır. İadeyi iyzico panelinden yapın, sonra siparişi panelde "İade edildi" olarak
  işaretleyin (indirme kapanır).
- **Kayıtlar:** her sipariş; onaylanan metni, sürümünü, onay zamanını, IP'yi, teslim edilen
  dosyanın özetini, ödeme numarasını ve olay geçmişini (ödeme, e-posta, indirme) saklar. Mesafeli
  Sözleşmeler Yönetmeliği m. 20 bu kayıtların en az 3 yıl saklanmasını ister; vergi kayıtları
  için daha uzun süreler geçerlidir.

## Marka: logo ve renkler

- Logo, gönderdiğiniz Instagram ekran görüntüsünden kırpıldı
  (`public/uploads/2026/guvenli-calis-logo.webp`, 320 px). Tarayıcı simgesi `src/app/icon.png`
  ve `src/app/apple-icon.png`, paylaşım görseli `public/uploads/2026/guvenli-calis-paylasim.jpg`.
  **Logonun orijinal dosyası (PNG veya SVG) varsa** panelde Medya'dan yükleyip Site ayarları >
  Logo'dan seçin; simge dosyalarını da depoda değiştirin. Ekran görüntüsünden alınan logo küçük
  boyutlarda iyi görünür ama baskı kalitesinde değildir.
- Renkler logodan alındı: siyah zemin, logo sarısı `#ffd306`, baret kırmızısı `#d90102`.
  Ana sayfadaki eğik sarı panel Instagram gönderilerindeki sarı-siyah kesimi tekrarlar.
  Ayrıntılar: [`DESIGN.md`](DESIGN.md).
- Ana sayfadaki dört cümle (sitenin amacı) **Site ayarları > Sitenin amacı** alanından
  değiştirilir.

## Kotalar, maliyet ve aşıldığında ne olur

Değerler 2026-10-29 tarihinde resmî belgelerden okundu; değişebilir, kendiniz kontrol edin.

| Hizmet | Plan içeriği | Bu proje nasıl kullanır | Aşılınca |
|---|---|---|---|
| Vercel Pro: platform ücreti | 20 $/ay; 1 dağıtım koltuğu ve 20 $ kullanım kredisi dahil ([plans/pro-plan](https://vercel.com/docs/plans/pro-plan)) | Tek kişi yönetiyorsa ek koltuk gerekmez | Ek koltuk 20 $/ay; salt okunur izleyici koltuğu ücretsiz |
| Vercel Pro: CDN | Aylık 1 milyon CDN isteği ve 1 TB veri aktarımı (Flat Rate CDN en düşük kademe) | Statik sayfalar, görseller | Kredi bittikten sonra kullanım faturalanır; harcama sınırı koyun |
| Vercel Pro: fonksiyonlar | 20 $ kredinin içinden | Yalnızca panel sayfaları ve işlemleri; giriş (scrypt ~0,4 s, bu ortamda ölçüldü) | Aynı |
| Vercel: Deployments | Plan sınırı (belgelere bakın) | Panelde her kayıt = 1 commit = 1 build | Sınırda yeni deploy başlamaz; site son hâliyle yayında kalır |
| iyzico | iyzico'nun sözleşmenizdeki komisyon oranları | Her kartlı ödeme | Site tarafında ek maliyet yok |
| Neon Postgres (Vercel Storage) | Sağlayıcının güncel ücretsiz/ücretli planı | Sipariş kayıtları (küçük) | Plan sınırında yazma durabilir; satış başlatılamaz, hata gösterilir |
| Vercel Blob (private) | Kullanım 20 $ kredisinden; depolama ~0,023 $/GB-ay, aktarım bölgeye göre | Satılan dosyalar ve indirmeler | Kredi sonrası faturalanır |
| Resend | Sağlayıcının güncel planı | Sipariş onay e-postaları | Gönderim başarısızsa sipariş yine ödenmiş kalır, panelden yeniden gönderilir |
| Vercel Image Optimization | 5.000 dönüşüm | **Kullanılmıyor** (görseller olduğu gibi servis edilir) | — |
| GitHub REST API | Token başına saatlik sınır (GitHub belgelerine bakın) | Panelde sayfa başına birkaç istek | API 403/429 döner; panel "API kotası doldu" hatası gösterir, kayıt yapılmaz |
| Upstash Redis (isteğe bağlı) | Sağlayıcının güncel ücretsiz planı | Yalnızca başarısız giriş sayaçları | İstek başarısız olursa kod bellek içi sınıra döner |

Pro planında kredi aşılınca kullanım ödeme yönteminizden tahsil edilir (Hobby'deki gibi
durdurulmaz). Vercel yeni hesaplarda 200 $ harcamada bildirim açar; daha düşük bir sınır ve
"sınırda projeyi durdur" eylemi için [Spend Management](https://vercel.com/docs/spend-management)
ayarını kullanın. Panel, GitHub veya ağ hatasında işlemi yapmaz ve nedenini gösterir.

İpucu: Günlük deploy sınırını zorlamamak için uzun bir yazıyı panelde parça parça kaydetmek
yerine yerelde hazırlayıp bir kez yapıştırın.

## Yedekleme ve geri yükleme

Tüm içerik Git'tedir; deponun kendisi yedektir.

- **Tam yedek:** `git clone --mirror git@github.com:<sahip>/<depo>.git` (tüm geçmiş). Düzenli
  olarak başka bir yere (harici disk, başka bir hesap) kopyalayın.
- **Yalnızca içerik:** `content/` ve `public/uploads/` klasörlerini zip'leyin.
- **Silinen yazıyı geri getirme:** Panel > İşlem kayıtları'nda silme commit'ini bulun, sonra
  `git log --diff-filter=D -- content/posts/<slug>.md` ile commit'i bulup
  `git checkout <commit>^ -- content/posts/<slug>.md` ve commit + push.
- **Bir değişikliği geri alma:** `git revert <commit>` ve push. Vercel otomatik yeniden build alır.
- **Panel çalışmıyorsa:** Dosyaları doğrudan GitHub web arayüzünden düzenleyebilirsiniz; biçim
  aynıdır.

## İçerik taşıma

- Yazı biçimi standart "front matter + Markdown"dır; Hugo, Astro, Jekyll gibi araçlara az
  değişiklikle aktarılabilir. Alanlar: `title`, `excerpt`, `status`, `createdAt`, `publishedAt`,
  `updatedAt`, `category`, `tags`, `cover {src, alt}`, `seoTitle`, `seoDescription`,
  `references [{title, url}]`, `revision`.
- Başka bir platformdan içe aktarmak için yazıları bu biçimde `content/posts/` altına koyup commit
  edin; build hatalı bir dosyada adını ve hatalı alanı yazarak durur.
- Görselleri `public/uploads/<yıl>/` altına koyun ve `content/media.json`'a `{src, alt, width,
  height, bytes, uploadedAt}` kaydı ekleyin (alt metin zorunlu).

## Güvenlik

- Parola: scrypt (N=2^17, r=8, p=1), yalnızca hash ortam değişkeninde.
- Oturum: HMAC-SHA256 imzalı, 8 saat geçerli, `__Host-` önekli, HttpOnly, Secure,
  SameSite=Strict çerez. `SESSION_VERSION` artırılınca veya parola değiştirilince tüm oturumlar
  düşer.
- Her panel işlemi sunucuda oturum + oturuma bağlı CSRF token'ı + Origin kontrolü yapar;
  `proxy.ts` yalnızca ilk kapıdır.
- Giriş hız sınırı: IP başına 15 dakikada 5 deneme (parola kontrolünden önce atomik sayılır),
  girilen kullanıcı adı başına 20 deneme. Kullanıcı adını tahmin edilemez seçin. Sınır
  varsayılan olarak her sunucu örneğinin belleğindedir (sunucusuz ortamda kısmi koruma);
  paylaşılan sayaç için isteğe bağlı Upstash değişkenleri. `x-forwarded-for` yalnızca Vercel'de
  veya `TRUST_PROXY=1` ile kullanılır.
- Yüklenen görsellerden konum/kamera bilgisi (EXIF, XMP, yorumlar) silinir; yalnızca yön
  bilgisi korunur.
- Markdown'daki ham HTML işlenmez; çıktı ayrıca rehype-sanitize ile temizlenir. Yalnızca http(s),
  mailto ve tel bağlantıları kalır.
- Yükleme: yalnızca JPEG/PNG/WebP, gerçek içerik imzası + uzantı + MIME uyumu, 3 MB, 6000 px
  sınırı, güvenli dosya adı, alt metin zorunlu. SVG kabul edilmez.
- İçerik Güvenlik Politikası (CSP), `X-Frame-Options: DENY`, `nosniff`, HSTS, sıkı
  `Referrer-Policy` ve `Permissions-Policy`.
- Denetim raporu: [`docs/security-audit-report.md`](docs/security-audit-report.md).
- Test raporu: [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md). Tasarım denetimi:
  [`docs/ai-slop-report.md`](docs/ai-slop-report.md).

## Dosya haritası

```
content/                 İçerik (Git'te). posts/*.md, products/*.md, settings.json, categories.json, media.json
public/uploads/          Yüklenen görseller
src/app/(site)/          Public sayfalar (statik); magaza/ ürünler ve ödeme formu, siparis/ alıcının sipariş sayfası
src/app/odeme/           iyzico dönüş adresi ve bildirim (webhook)
src/app/indir/           Ödeme sonrası dosya indirme (POST, imzalı bağlantı)
src/lib/orders/          Sipariş veritabanı, imzalı bağlantılar, ödeme akışı
src/lib/payments/        iyzico istemcisi (imza ve doğrulama)
src/app/admin/           Yönetim paneli (sunucu tarafı), actions.ts = tüm kayıt işlemleri
src/lib/                 İçerik okuma, Markdown, oturum, yükleme doğrulama, depo (GitHub/yerel)
src/proxy.ts             /admin için ilk kapı (Next.js 16'da middleware'in yeni adı)
tests/unit/              Vitest testleri
tests/e2e/               Playwright testleri
tests/fixtures/content/  Otomatik testlerin verisi (dev:test-data ile de açılır)
docs/                    Mimari notlar, test raporu, güvenlik ve tasarım denetim raporları
```
