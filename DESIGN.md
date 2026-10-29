# DESIGN.md: Güvenli Çalış

Bu dosya sitenin tasarım sözleşmesidir. Public site ve yönetim paneli aynı token'ları kullanır
(`src/app/globals.css`, `:root`). Site **yalnızca koyu temadır**: açık tema yoktur ve
`prefers-color-scheme` kuralı yazılmaz (`npm run scan:design` buna hata verir). Yeni bir renk, boşluk, köşe veya yazı tipi
gerekiyorsa önce buraya ekleyin, sonra koda; tek seferlik değer kullanmayın.

## Tasarım okuması

[donatomm/taste](https://github.com/donatomm/taste) skill'ine göre: **Güvenli Çalış markasının
sitesi: İSG yazıları, çalışan hakları ve mevzuat notları, dijital doküman vitrini. Okur sahada
çalışan, işveren veya İSG profesyoneli. Dil doğrudan ve uyarıcı; marka Instagram hesabıyla aynı:
siyah zemin, logo sarısı, eğik sarı panel, kırmızı baret.**

Kadranlar: `DESIGN_VARIANCE 7` (eğik kesimli hero, bento), `MOTION_INTENSITY 5` (giriş
animasyonları, kaydırmada belirme, hover fiziği, okuma çubuğu), `VISUAL_DENSITY 4`.

Geçmiş: ilk sürüm (çizgili dizin, görselsiz) "fazla sade", ikinci sürüm ISO 7010 sinyal mavisiyle
yapıldı; ardından sitenin Instagram hesabına benzemesi istendi. Bu sürüm hesabın logosunu ve gönderi dilini taşır.

## Marka kaynağı

- **Logo:** sarı daire üzerinde kırmızı kenarlı uyarı üçgeni, kırmızı baret, siyah bant üzerinde
  "GÜVENLİ ÇALIŞ". Dosya kullanıcının gönderdiği ekran görüntüsünden kırpıldı
  (`/uploads/2026/guvenli-calis-logo.webp`); orijinal dosya gelince değiştirilmeli.
- **Gönderi dili:** sarı eğik panel, köşelerde siyah üçgenler, ortada logo ve serif başlık. Bu
  dil üç yerde tekrar eder: ana sayfa hero'su, sayfa bantlarının sağ kenarındaki sarı dilim ve
  görseli olmayan ürünlerin otomatik kapağı (`.product-art`).

## Renk rolleri

| Token | Değer | Rol |
|---|---|---|
| `--paper` | `#0f0f0e` | Sayfa zemini |
| `--surface` / `--surface-2` | `#191917` / `#232320` | Kartlar, form alanları |
| `--ink` / `--ink-2` | `#f2f2ec` / `#b3b3aa` | Metin, ikincil metin |
| `--brand` / `--brand-deep` | `#1b1b19` / `#080808` | Hero'nun siyah alanı, sayfa bantları, footer |
| `--brand-tint` / `--accent-tint` | `#2b260f` | Öne çıkan kart, çipler, bilgi kutuları |
| `--accent` | `#ffd306` | **Tek büyük vurgu (logo sarısı):** hero paneli, birincil düğme, sarı bant, okuma çubuğu |
| `--signal` | `#ff5a4f` | Baret kırmızısı, yalnızca küçük işaretler (onay işaretleri) |
| `--action` / `--focus` | `#ffd306` | Bağlantılar ve odak halkası; sarı zeminlerde siyah |
| `--danger`, `--ok`, `--warn` | | Yalnızca hata, başarı, uyarı mesajları |

Kurallar: sarı hiçbir zaman açık zeminde metin rengi olmaz. Sarı zeminde metin, düğme ve odak
halkası her iki temada sabit siyahtır (`--on-accent`, `.button--black`,
`.button--outline-black`). Kırmızı dolgu yalnızca silme düğmesinde ve hata mesajında
kullanılır. Kontrast `npm run scan:design` ile her renk çifti için hesaplanır; hepsi WCAG AA üstünde.

## Tipografi

| Rol | Yazı tipi | Kullanım |
|---|---|---|
| Hero | Barlow Semi Condensed 800, `clamp(3rem, 2rem + 5vw, 5.8rem)`, satır 0.95 | Ana sayfa h1 |
| Başlık | Barlow Semi Condensed 700/600 | h1, h2, h3, düğmeler, menü |
| Arayüz | Barlow 400/500/600 | Metin, kartlar, formlar |
| Yazı gövdesi | Source Serif 4 400/600 (68ch, satır 1.75) | Yalnızca makale metni |

Serif yalnızca uzun okuma metninde: taste skill serifi varsayılan olarak önermez, burada gerekçe
yayın/makale okunabilirliği. Başlıkta tek kelimeyi farklı renk/yazı tipiyle vurgulama yok.

## Şekil ve derinlik

- Köşe kuralı: kartlar 16px, görseller 20px, form alanları 10px, düğmeler ve çipler tam hap.
- Gölge yalnızca üste binen öğelerde (hero "son yazı" kartı, filtre paneli, doküman bloğu,
  iletişim kartları) ve hover'da. Gölge rengi markaya tonlanır, saf siyah değildir.

## Düzen

- **Ana sayfa slider'ı:** hero bir slider'dır: ilk slayt site tanıtımı (logo, ad, amaç cümleleri),
  ardından son 3 yazı ("Gündem": kategori, başlık, özet, tarih, okuma süresi, kapak) ve 3 mağaza
  ürünü (fiyat, biçim, "Satın al"/"İncele", ürün kapağı) sırayla, karışık. 6,5 saniyede bir
  kendiliğinden geçer; altta duraklat, önceki/sonraki düğmeleri, noktalar ve ilerleme çubuğu
  vardır. Fare üstündeyken veya klavye odağı içindeyken durur; `prefers-reduced-motion`
  isteyen ziyaretçide hiç kendiliğinden geçmez. Görünmeyen slaytlar `inert`'tir (klavye ve ekran
  okuyucu yalnızca görüneni bulur). Tüm slaytlar aynı ızgara hücresinde durur, yükseklik
  zıplamaz. Slaytların düzeni aşağıdaki hero düzeninin aynısıdır.
- **Ana sayfa:** hero solda eğik kenarlı sarı panel (logo, site adı, sitenin amacını anlatan
  dört kısa cümle ve ikonları, "Hazırlayan: Uğur Durak", "Yazıları oku" ve "Mağaza"
  düğmeleri), sağda siyah alan üzerinde temsili fotoğraf, arkasında sarı blok, üstüne binen
  "Son yazı" kartı. Telefonda hero tamamen sarıdır, fotoğrafın arkasındaki blok siyaha döner.
  Ardından öne çıkan yazı ızgarası (2x2 büyük kart + 5 kart), "Mağazadan" (3 ürün kartı), konu
  alanları bento'su (6 kutu, boşluksuz), sarı iletişim bandı, siyah footer.
- **Liste sayfaları:** siyah sayfa bandı (geniş ekranda sağ kenarda sarı eğik dilim, içerik
  sütununun dışında) + üstüne binen arama/filtre paneli + kart ızgarası.
- **Yazı sayfası:** siyah başlık bandı + üstüne binen **doküman kontrol bloğu** (yazar, tarih,
  son güncelleme, revizyon, kategori, okuma süresi) + metin ve yapışkan içerik tablosu +
  kaynakça + etiket ve paylaşım hapları + ilgili yazılar.
- **Mağaza:** sayfa bandı + ürün kartları (görsel veya marka kapağı, ad, açıklama, fiyat, biçim)
  + "Satın alma nasıl işler?" kutusu. **Ürün sayfası:** solda 4:5 ürün görseli, sağda yapışkan
  satın alma kutusu (büyük fiyat, biçim, sarı "Shopier'de satın al" düğmesi, ödemenin Shopier'de
  yapıldığı notu), altında "Neler var?" listesi ve açıklama.
- **Ödeme sayfası:** üç kart: fatura bilgileri (iki sütun, telefonda tek), sözleşme ve onaylar
  (ön bilgilendirme formu ve sözleşme açılır kutularda, girdikçe alıcı bilgileriyle güncellenir;
  en az 16 px metin, MSY m. 6/1), ardından açık sarı **sipariş özeti** (ürün, toplam, ödeme,
  teslimat, cayma hakkı) ve hemen üstünde "ödeme yükümlülüğü" cümlesiyle tek sarı "Onayla ve öde"
  düğmesi. Onay kutuları önceden işaretli değildir; hatalı alan kırmızı çerçeve ve altında metinle
  gösterilir, girilen değerler kaybolmaz.
- **Sipariş sayfası:** sayfa bandında durum başlığı ve sipariş numarası; tek kartta durum
  ikonu ve cümlesi, ürün/tutar/tarih/indirme hakkı satırları ve büyük sarı indirme düğmesi;
  altında onaylanan metin açılır kutuda.
- Mobilde tüm çok sütunlu düzenler tek sütuna iner; 390 px'te yatay kaydırma yok (testli).
  Telefonda menüdeki "Ara" yalnızca büyüteç ikonu olarak görünür, erişilebilir adı korunur.

## Hareket

Hepsi CSS (slider'ın zamanlayıcısı da ilerleme çubuğunun CSS animasyonudur), hareket kütüphanesi yok; `prefers-reduced-motion: reduce` altında tamamen kapanır.

| Hareket | Ne anlatır |
|---|---|
| Hero ve sayfa başlıklarında kademeli yükselme (`.rise`) | Okuma sırası: unvan, ad, metin, düğmeler |
| Hero fotoğrafının yukarıdan açılması (`.reveal-media`) | Sayfanın ana görselini öne çıkarır |
| Kart ve kutuların görünür alana girince belirmesi (`animation-timeline: view()`) | İçeriğin sırayla gelmesi |
| Ürün kartında hover'da sarı panelin eğiminin hafifçe açılması | Kartın tıklanabilir olduğu |
| Kart, düğme ve kutularda hover'da yükselme, görselde hafif büyüme | Tıklanabilirlik geri bildirimi |
| Yazı sayfasında sarı okuma ilerleme çubuğu (`animation-timeline: scroll()`) | Okurun metindeki yeri |
| Slider: slaytlar arasında solma, yeni slaytta metnin kademeli yükselmesi ve görselin açılması, ilerleme çubuğu | Sıradaki habere/ürüne geçiş ve ne zaman geçileceği |

## İkonlar

[Phosphor](https://phosphoricons.com) (MIT), tek aile. Yalnızca anlam taşıyan yerlerde: kategori
kimliği (risk: pano, kaza: ilk yardım, mevzuat: terazi, eğitim: tahta, saha: baret, acil: siren),
doküman bloğu alanları, tarih/okuma süresi, paylaşım ve iletişim kanalları, arama. Hero'daki
amaç cümlelerinin ikonları (uyarı, kitap, baret, alışveriş çantası) Instagram biyografisindeki
emojilerin karşılığıdır ve dekoratiftir (`aria-hidden`); emoji kullanılmaz.

## Görseller

`public/images/` altında, Unsplash Lisansı ile; lisans her fotoğrafın sayfasından doğrulandı
(`public/images/CREDITS.md`). Hepsi **temsilidir**: hero altında "Temsili görsel" notu, footer'da
ve gizlilik sayfasında kaynak belirtilir. Ziyaretçi tarayıcısı Unsplash'e istek atmaz (dosyalar
sitede barındırılır). Güvensiz uygulama gösteren fotoğraflar (ör. emniyet kemersiz yüksekte
çalışma) bilinçli olarak seçilmedi. Yönetici panelden portre yüklerse hero'da temsili görsel
yerine portre gösterilir.

## Erişilebilirlik

Tek h1, atlanmayan başlık seviyeleri, ilk odak "İçeriğe geç", tüm etkileşimli öğelerde 3px odak
halkası, form etiketleri, zorunlu alt metin, iki temada AA kontrast, reduced-motion desteği,
dokunma hedefleri en az 44px (testlerle denetlenir).

## Ürün kapağı (`.product-art`)

Görseli olmayan ürün için CSS ile çizilen kapak: siyah zemin, `clip-path` ile eğik sarı panel,
ortada logo ve Source Serif 4 ile ürün adı (Instagram gönderilerindeki serif başlıklar gibi).
Boyutlar kapsayıcı birimiyle (`cqi`) ölçeklenir; kartta 4:3, ürün sayfasında 4:5. Gerçek bir
ürün fotoğrafı veya önizleme görseli yüklenirse onun yerine o gösterilir. Kapak sahte bir ekran
görüntüsü veya sahte ürün fotoğrafı değildir; markanın gönderi şablonudur.

## Yapılmayacaklar

Mor-mavi degrade, ortalanmış hero, üç eşit ikon kartı, cam efekti, neon parıltı, büyük harfli
eyebrow her bölümde, dekoratif 01/02/03, oklu düğme metni, em-dash, sahte istatistik, sahte
logo/yorum/sertifika, sahte indirim veya "son 3 ürün" gibi baskı dili, uydurma takipçi sayısı, div'den sahte ekran görüntüsü, kartın içinde boş hücre. `npm run
scan:design` bunların koddan tespit edilebilenlerini denetler.
