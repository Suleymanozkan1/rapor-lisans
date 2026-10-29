# Güvenlik denetim raporu

- **Tarih:** 2026-10-29
- **Denetlenen kaynak:** commit `5487d76` (ilk sürüm). Düzeltmeler sonraki commit'lerde.
- **Yöntem:** [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)
  (MIT) iş akışı, bu ortama uyarlanmış hâli (aşağıda "Sapmalar").
- **Makine tarafından okunur kayıtlar:** [`docs/security/findings.json`](security/findings.json)
  (skill'in `report-schema.json` şemasına göre),
  [`docs/security/architecture.md`](security/architecture.md) (güven sınırları haritası).

## Özet

| # | Bulgu | Önem | Durum |
|---|---|---|---|
| 1 | Eşzamanlı isteklerle giriş hız sınırı aşılabiliyordu (kontrol ile kayıt arasında scrypt beklemesi) | **Orta** | Düzeltildi, regresyon testi var |
| 2 | Anonim başarısız denemeler tek yöneticiyi girişten kilitleyebiliyordu | Düşük | Düzeltildi, regresyon testi var |
| 3 | `image-size` JPEG ayrıştırıcısı O(n²): tek bir yükleme dakikalarca CPU yakabiliyordu (yalnızca yönetici) | Düşük | Düzeltildi (bağımlılık kaldırıldı), regresyon testi var |
| 4 | Yüklenen fotoğraflar EXIF/GPS bilgisiyle yayınlanıyordu | Bilgi | Düzeltildi, birim + e2e testi var |

Kritik veya yüksek önemde bulgu yok. Kimlik doğrulama atlatma, yetkisiz Server Action
çağrısı, depolanmış XSS, taslak sızıntısı, yol geçişi (path traversal) veya token sızıntısı
**bulunmadı**. Bunlar "Kapsanan kontroller"de kanıtlarıyla listelendi.

## Kapsam ve güven sınırları

1. Anonim ziyaretçi → statik public sayfalar ve JSON/XML çıktıları
2. Anonim ziyaretçi → `/admin/*` sayfaları ve doğrudan POST edilebilen Server Action uçları
3. Oturum açmış yönetici → GitHub deposu (sunucuda tutulan token ile)
4. Yönetici içeriği (Markdown, YAML, JSON, görsel) → her ziyaretçinin tarayıcısı
5. Sunucu → GitHub API (token gizliliği, yolların depo içinde kalması)
6. Build: depo içeriği → statik çıktı (taslaklar asla çıkmamalı)

Kapsam birimleri: `auth-session` (giriş, oturum, CSRF, proxy, her Server Action),
`content-render` (Markdown temizleme, JSON-LD, RSS, arama dizini, taslak görünürlüğü, YAML),
`store-upload-config` (yol hapsetme, GitHub istemcisi, yükleme doğrulama, ayar doğrulama,
güvenlik başlıkları, bağımlılıklar, sırlar).

## Bulgular

### 1. Giriş hız sınırı eşzamanlı isteklerle aşılabiliyordu (Orta)

- **Kök neden:** `src/app/admin/login-actions.ts` sayaçları okuyordu (`checkLimit`), ardından
  ~0,4 s süren scrypt'i bekliyordu, başarısızlığı ancak sonra kaydediyordu (`recordFailure`).
  Aynı anda gelen tüm istekler sayacı limitin altında görüyordu.
- **Etki:** IP başına 5 ve hesap başına 20 deneme sınırı fiilen işlemiyordu; doğrulayıcı tek
  örnekte saniyede ~5,7 parola denemesi ölçtü. Hesabın ele geçirilmesi yine de parolanın gücüne
  bağlıdır.
- **Saldırgan / önkoşul:** Anonim; yalnızca eşzamanlı istek gönderebilmesi yeter.
- **Düzeltme:** `src/lib/auth/rate-limit.ts` `consume()` her denemeyi hash'ten **önce** atomik
  olarak sayar (bellekte `await` olmadan; Upstash'te tek pipeline'da `INCR` + `EXPIRE NX`).
  Bellek dolduğunda yalnızca süresi geçmiş veya IP kovaları atılır, hesap kovası atılmaz.
- **Regresyon testi:** `tests/unit/login.test.ts` (20 eşzamanlı denemeden tam 5'i
  değerlendiriliyor), `tests/unit/auth.test.ts` (50 eşzamanlı `consume` → 5 izin; 10.050 IP
  anahtarıyla taşırma sonrası hesap kovası duruyor).

### 2. Anonim saldırgan yöneticiyi girişten kilitleyebiliyordu (Düşük)

- **Kök neden:** Hesap sayacı yapılandırılmış kullanıcı adına bağlıydı ve **herhangi bir**
  kullanıcı adıyla yapılan her başarısız denemede artıyordu; 20'ye ulaşınca doğru parola bile
  kontrol edilmeden reddediliyordu. Başarılı giriş yalnızca IP sayacını sıfırlıyordu.
- **Etki:** Yeni yönetici oturumu açılamaz (public site ve açık oturumlar etkilenmez).
- **Düzeltme:** Hesap bütçesi yalnızca gönderilen kullanıcı adı doğruysa harcanıyor; başarılı
  girişte iki sayaç da sıfırlanıyor. **Kullanıcı adını tahmin edilemez seçin** (ör. "admin",
  "ugur" değil); kullanıcı adını bilen biri hâlâ hesap kilidini tetikleyebilir. Bu, kaba kuvvet
  korumasıyla bilinçli bir dengedir.
- **Regresyon testi:** `tests/unit/login.test.ts` (40 farklı IP'den yanlış kullanıcı adıyla
  denemeden sonra doğru giriş başarılı).

### 3. Yüklemede O(n²) JPEG ayrıştırma (Düşük)

- **Kök neden:** `image-size` 2.0.4'ün JPEG ayrıştırıcısı her adımda kalan tamponu
  kopyalıyor (`Uint8Array.slice`). Ölçüm: 100 KB 0,7–0,95 s, 200 KB 2,8 s, 400 KB 11 s;
  3 MB için ~10 dakika tahmini.
- **Saldırgan / önkoşul:** Geçerli yönetici oturumu + CSRF token'ı (ör. yönetici internetten
  indirdiği kötü niyetli bir dosyayı yükler).
- **Düzeltme:** `image-size` kaldırıldı. `src/lib/image-meta.ts` doğrusal, bölüm sayısı sınırlı
  (5.000) bir JPEG/PNG/WebP okuyucu. Panel rotalarında `maxDuration = 30`.
- **Regresyon testi:** `tests/unit/image-meta.test.ts` (3 MB'lık iki saldırı dosyası 500 ms
  altında reddediliyor).

### 4. EXIF/GPS bilgisi yayınlanıyordu (Bilgi)

- **Kök neden:** Doğrulanan dosya byte'ı byte'ına commit ediliyordu.
- **Etki:** Telefon fotoğraflarındaki konum, cihaz ve zaman bilgisi `/uploads` üzerinden ve Git
  geçmişinden okunabiliyordu.
- **Düzeltme:** Aynı okuyucu JPEG APP1–APP15 (ICC ve Adobe hariç) ve yorum bölümlerini, PNG
  `tEXt/zTXt/iTXt/eXIf/tIME` parçalarını, WebP `EXIF/XMP` parçalarını siler. Yalnızca JPEG yön
  bilgisi küçük bir EXIF bloğu olarak korunur (fotoğraflar yan dönmesin). Dosya sonundaki fazla
  veri (resim + HTML "polyglot" yükü) atılır.
- **Regresyon testi:** `tests/unit/image-meta.test.ts`; `tests/e2e/admin.spec.ts` GPS içeren
  ve sonuna HTML eklenmiş bir JPEG yükler, kaydedilen dosyada GPS/HTML olmadığını ve dosyanın
  Chromium'da çözülebildiğini doğrular.

> **Not:** Düzeltmeden önce yüklenmiş görsel yok (depoda hiç görsel yok). Public bir depoya
> daha önce yüklenmiş fotoğraflar Git geçmişinde kalır; silmek geçmişten silmez.

## Uygulanan sertleştirmeler (bulgu değil)

| Not | Değişiklik |
|---|---|
| Başlık id'leri temizlikten sonra öneksiz üretiliyordu: `## __next_f` başlığı `window.__next_f`'i gölgeleyip sayfanın hidrasyonunu bozuyordu; şablon id'leriyle çakışma | Ayrılmış id'ler ve harf/rakamla başlamayan id'ler `bolum-` önekiyle yeniden adlandırılıyor |
| Dipnot id'leri çift önekleniyordu (bağlantılar kırık) | Sanitizer `clobberPrefix: ''` (ham HTML zaten imkânsız) |
| HTML yorumları arama dizinine ve meta açıklamaya giriyordu | `toString(..., { includeHtml: false })` |
| Panel dışından commit edilen geçersiz dosya adı RSS/rotaları bozabilirdi | Build geçersiz adda açık hatayla durur; RSS URL'leri kaçışlanır, XML'de geçersiz kontrol karakterleri atılır |
| `x-forwarded-for` her ortamda güveniliyordu | Yalnızca Vercel'de veya `TRUST_PROXY=1` ile |
| Parola değişince eski oturumlar geçerli kalıyordu | Oturum sürümü parola hash'inden türetiliyor |
| Bozuk `Origin` başlığında TypeError | Açık "kaynak doğrulanamadı" hatası |
| `?durum=__proto__` boş bir uyarı kutusu gösteriyordu | `Object.hasOwn` kontrolü |
| Upstash hatası sessizce bellek sınırına düşüyordu | Uyarı loglanıyor |
| `CONTENT_STORE=local` production'da (Vercel dışı) seçilebiliyordu | Production'da yalnızca `E2E_LOCAL_STORE=1` ile |
| GitHub blob okumaları sınırsız paralel | En fazla 6 eşzamanlı istek |
| Eksik dosyalı medya silinemiyordu | Dosya yoksa yalnızca dizin kaydı silinir |
| Varsayılan paylaşım görseli medya dizininde doğrulanmıyordu | Doğrulanıyor |
| `.gitignore` `.env.production` vb. kapsamıyordu | `.env*` + `!.env.example` |
| E2E sunucusu tüm arayüzlerde dinliyordu | `-H 127.0.0.1` |

## Kapsanan kontroller (bulgu çıkmadı)

- **Yetkisiz Server Action:** Yalnızca iki `'use server'` dosyası var. `actions.ts`'teki 9
  dışa aktarımın hepsi ilk iş `requireAdminAction` çağırıyor; `login` bilinçli olarak açık,
  `logout` oturum + CSRF olmadan hiçbir şey yapmıyor. Yakalanan bir isteğin çerezsiz tekrarı
  proxy'de yönlendiriliyor, sahte çerezle tekrarı action içinde reddediliyor (e2e testi).
- **Oturum:** HMAC-SHA256 imzası JSON ayrıştırmadan önce sabit zamanlı karşılaştırılıyor;
  `session.`/`csrf.` önekleri iki HMAC alanını ayırıyor; süre, gelecek tarihli `iat`, kullanıcı
  ve sürüm kontrol ediliyor. Çerez `__Host-`, HttpOnly, Secure, SameSite=Strict (e2e testi).
- **CSRF:** Oturum kimliğine bağlı token her formda; Origin başlığı olmayan isteklerde de token
  zorunlu (Next.js bu durumda yalnızca uyarı verir).
- **Panel sayfaları:** 11 sayfanın hepsi veri okumadan önce `requireAdmin()` çağırıyor; slug
  parametreleri `isValidSlug` ile doğrulanıyor. Açık yönlendirme yok; durum mesajları sabit
  metin.
- **Depolanmış XSS:** `remark-rehype` ham HTML'i düşürüyor, `rehype-sanitize` ikinci katman.
  Denenen yükler: `<script>`, `onerror`, `javascript:` (büyük/küçük harf, HTML varlıkları,
  sekme/satır sonu bölmeli), `vbscript:`, `data:` bağlantı ve görselleri; hepsi temizlendi.
  Sosyal bağlantılar ve kaynak URL'leri yalnızca http(s); e-posta `z.email()`; telefon yalnızca
  rakam ve `+`. JSON-LD'de `<` kaçışlanıyor; RSS tüm metni kaçışlıyor.
- **Taslak sızıntısı:** Public kodun tamamı `getPublishedPosts()` üzerinden okuyor; site
  haritası, RSS, arama dizini, ilgili yazılar, etiket/kategori sayfaları ve sayıları dahil.
  Geçersiz tarih "yayımlanmamış" sayılıyor. E2E testi tüm public çıktılarda taslak
  işaretlerini arıyor.
- **YAML:** `core` şema; alias, bilinmeyen etiket ve yinelenen anahtar reddediliyor;
  `__proto__` prototipi kirletmiyor; serileştirme ön bilgi sınırının dışına taşamıyor.
- **Yol hapsetme:** Tüm depo yolları `assertLogicalPath` (kök `content|uploads`, segment
  `^[a-z0-9][a-z0-9._-]*$`, `..` yok); yerel depo ayrıca çözümlenen yolu kök dizine karşı
  kontrol ediyor. Medya silme yalnızca dizindeki kayıtlara uygulanıyor.
- **GitHub istemcisi:** Token yalnızca `Authorization` başlığında; hata mesajları token
  içermiyor; dal adı URL-kodlanıyor; kullanıcı girdisi URL'ye girmiyor; iyimser kilit +
  `force:false` ref güncellemesi; kesilmiş ağaç açık hata veriyor. İstemci bileşenleri sunucu
  modüllerini içe aktarmıyor.
- **Yükleme:** Gerçek içerik imzası, uzantı ve MIME uyumu; SVG reddi; sunucu üretimi dosya
  adı; `/uploads` için `nosniff` + `sandbox` CSP.
- **Bağımlılıklar:** Kilit dosyası v3, tüm paketler `registry.npmjs.org` ve bütünlük hash'li.
  `npm install` 0 bilinen açık bildirdi (2026-10-29).

## Kalan riskler

1. **Public depo:** Taslaklar, silinen içerik ve geçmiş GitHub'da herkese açık. Projeyi private
   depoya taşıyın (README).
2. **CSP `script-src 'unsafe-inline'`:** Statik sayfalarda nonce kullanılamıyor; XSS'e karşı tek
   katman sunucu tarafı temizleme. Markdown hattını değiştirirken (`allowDangerousHtml`,
   `rehype-raw`, şemayı genişletmek) XSS testleri mutlaka çalıştırılmalı.
3. **Durumsuz oturum:** Çıkış, çalınmış bir çerezi sunucuda iptal etmez (en fazla 8 saat).
   Şüphede `SESSION_VERSION` artırın veya parolayı değiştirin.
4. **Hız sınırı örnek başına:** Upstash yapılandırılmadıkça sayaçlar sunucusuz örnekler arasında
   paylaşılmaz. Uzun, rastgele bir parola kullanın.
5. **Kullanıcı adını bilen saldırgan** hesap kilidini tetikleyebilir (bilinçli denge: kaba
   kuvvete karşı sınır). Kullanıcı adı artık commit mesajlarında yer almıyor; yine de tahmin
   edilemez bir ad seçin. Kilitlenirseniz 15 dakika bekleyin veya yeniden deploy edin (bellek
   sayaçları sıfırlanır).
6. **Doğrulanmamış dağıtım gerçekleri:** Vercel'in `x-forwarded-for` başlığını üzerine yazması,
   statik dosyalara başlıkların uygulanması ve gerçek otomatik deploy davranışı bu ortamda
   gözlemlenemedi.

## Yeniden denetim (düzeltmelerden sonra)

Düzeltme commit'leri (`5487d76..b4c3134`) ayrı bir bağımsız ajan tarafından yeniden denetlendi.
Ajan düzeltmeleri kodun kopyasında çalıştırdı: 50 paralel denemeden tam 5'i değerlendirildi;
3 MB'lık saldırı dosyaları 5–39 ms'de işlendi; 600.000 vakalık bozma/kesme testi
`ImageFormatError` dışında hiçbir istisna üretmedi.

| Sonuç | Durum |
|---|---|
| Bulgu 1–4'ün dördü de kapandı | Doğrulandı |
| **Yeni (düşük):** Vercel dışında, `TRUST_PROXY` olmadan tüm istemciler tek bir IP kovasını paylaşıyordu; 5 anonim istek sahibi kilitleyebiliyordu (Bulgu 2'nin daha kolay bir biçimi) | Düzeltildi: güvenilir adres yoksa IP kovası kullanılmıyor, kullanıcı adı kovası tahmini sınırlıyor. Regresyon testi `tests/unit/login.test.ts` |
| **Yeni (düşük):** Hesap kovası yalnızca doğru kullanıcı adında harcandığı için yanıt farkı kullanıcı adının doğru olup olmadığını sızdırıyordu; ayrıca kullanıcı adı her commit mesajında (`panel(<kullanıcı>)`) yazıyordu | Düzeltildi: her deneme yazdığı kullanıcı adının kovasını harcıyor (yanlış adlar hash'lenmiş, atılabilir anahtarla); doğru ve yanlış ad aynı biçimde sınırlanıyor (testli). Commit mesajlarından kullanıcı adı çıkarıldı (`panel: …`) |
| **İşlevsel hata:** Ayarlar her kaydedildiğinde varsayılan paylaşım görseli siliniyordu (form alanı adı uyuşmazlığı, ilk düzeltme turunda girdi) | Düzeltildi, e2e testi iki ardışık kayıtta değerin korunduğunu doğruluyor |
| Görsel temizleyici yasak listesi kullanıyordu: C2PA, JFXX küçük resmi, bilinmeyen/özel parçalar kalabiliyordu | İzin listesine çevrildi (JPEG: kare/tablo/tarama + JFIF/ICC/Adobe; PNG: kritik + görüntüyü etkileyen parçalar; WebP: VP8/VP8L/VP8X/ALPH/ANIM/ANMF/ICCP). Testli |
| `TRUST_PROXY=1` iken en soldaki (istemcinin yazabildiği) `x-forwarded-for` girdisi alınıyordu | Artık son vekilin eklediği en sağdaki girdi alınıyor |
| Upstash'te `EXPIRE … NX` desteklenmezse sayaç süresiz kalabilirdi | `SET … EX … NX` + `INCR` sırası |
| WebP'nin son tek boyutlu parçasında dolgu baytı düşüyordu | Eklendi |

Bu ikinci tur düzeltmeler ayrıca yeniden denetlenmedi; her biri kendi testiyle ve tüm test
paketinin yeniden çalıştırılmasıyla doğrulandı.

## Mağaza ve marka değişikliği denetimi (2026-10-29)

Kapsam: `content/products`, `/magaza` sayfaları, panelde ürün ekleme, düzenleme ve silme,
ayarlara eklenen `motto` ve `shop.url` alanları, panel formlarının `onSubmit` ile gönderilmesi.
Yeni bulgu yok. Kontrol edilenler:

| Konu | Sonuç |
|---|---|
| Satın alma bağlantısıyla zararlı adrese yönlendirme | Şema yalnızca `https:` + `shopier.com` / `www.shopier.com` ana makinesini, kimlik bilgisi ve port olmadan, boş olmayan bir yolla kabul eder. `shopier.com.evil.example`, `evilshopier.com`, `www.shopier.com.`, `//`, `javascript:` ve ters eğik çizgi denemeleri reddedilir veya Shopier'e çözülür (birim testi). Kural panelde ve build'de aynı şemadan uygulanır; elle commit edilen bozuk dosya build'i durdurur. |
| Ürün açıklamasında saklanan XSS | Açıklama yazılarla aynı `rehype-sanitize` hattından geçer; e2e testi `<script>`, `onerror` ve `javascript:` bağlantısının çalışmadığını doğrular. Özellik maddeleri ve amaç cümleleri düz metin olarak işlenir. |
| JSON-LD enjeksiyonu | `Product` verisi mevcut `jsonLd()` kaçışıyla yazılır. |
| Yetkisiz yazma | `saveProductAction` ve `deleteProductAction` ilk satırda `requireAdminAction` çağırır (oturum + CSRF + Origin). Anonim istekler tüm `/admin/urunler` rotalarından yönlendirilir (e2e). |
| Yol geçişi | Ürün yolları `isValidSlug` ile doğrulanır ve depo katmanının mantıksal yol kontrolünden geçer. |
| Eşzamanlı düzenleme | Ürün kaydı blob SHA ile iyimser kilit kullanır; eski sekmeden kayıt reddedilir (birim testi). |
| Kişisel veri | Site sipariş, ödeme veya müşteri verisi almaz; gizlilik sayfasına Shopier'in bu verileri işlediği bilgisi eklendi. Dış bağlantılar `rel="noopener noreferrer"` ile açılır. |
| Sahte teklif | Örnek ürünler etiketli, `noindex`, site haritası ve JSON-LD dışında; yayına almadan önce silinmeleri README'de belirtildi. |
| Form değerlerinin korunması | `onSubmit` yolu aynı Server Action'ı aynı FormData ile (CSRF alanı dahil) çağırır; güvenlik denetimleri değişmedi. |

## Sapmalar (yöntem uyarlaması)

- Skill altı aşamalı tam denetimi ve her aday için bağımsız doğrulamayı öngörür. Bu çalışmada:
  1 keşif (mimari + kapsam), 3 bağımsız avcı ajan (her biri bir kapsam birimi), 1 bağımsız
  doğrulayıcı ajan (dört adayı çürütmeye çalıştı, dördünü de doğruladı) kullanıldı. Kapsam
  eleştirmeni ve ikinci tur kayıt doğrulama yapılmadı.
- Skill'in `validate-findings.cjs` doğrulayıcısı ve `avoid-ai-design` tarayıcısı gibi indirilen
  üçüncü taraf betiklerin çalıştırılması bu ortamın izin denetimince reddedildi. `findings.json`
  şemanın zorunlu alan ve tür kurallarına karşı kendi yazdığımız yapısal bir kontrolle
  doğrulandı; skill'in ek anlamsal kuralları (ör. görünür metin kontrolleri) çalıştırılmadı.
- Avcılar yalnızca kaynak okudu; hedef kodu OS düzeyinde izole bir sandbox'ta çalıştırma imkânı
  olmadığından uygulama çalıştırılmadı. Ölçümler, kurulu kütüphanelerin sahte veriyle tek
  başına çağrılmasıyla yapıldı. Uygulama davranışı ayrıca projenin kendi test paketiyle
  doğrulandı.
- Düzeltmelerden sonra tüm kod tabanı baştan denetlenmedi; yalnızca düzeltme farkı bağımsız bir
  ajana yeniden denetletildi (yukarıda).
