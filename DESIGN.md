# DESIGN.md: Uğur Durak İSG blogu

Bu dosya sitenin tasarım sözleşmesidir. Public site ve yönetim paneli aynı token'ları kullanır
(`src/app/globals.css`, `:root` ve koyu tema bloğu). Yeni bir renk, boşluk, köşe veya yazı tipi
gerekiyorsa önce buraya ekleyin, sonra koda; tek seferlik değer kullanmayın.

## Tasarım okuması

[donatomm/taste](https://github.com/donatomm/taste) skill'ine göre: **bir İSG uzmanının
editoryal blogu; okur işyerinde karar veren, mevzuatı takip eden biri. Dil sahaya yakın, canlı ve
güven veren; ISO 7010 güvenlik işaretlerinin sinyal mavisi ve güvenlik sarısı, cesur sans
başlıklar.**

Kadranlar: `DESIGN_VARIANCE 7` (asimetrik hero ve bento), `MOTION_INTENSITY 5` (giriş
animasyonları, kaydırmada belirme, hover fiziği, okuma çubuğu), `VISUAL_DENSITY 4`.

İlk sürüm (çizgili dizin, gölgesiz, görselsiz) "fazla sade" bulundu; bu sürüm taste skill'in şu
kurallarını uygular: gerçek görseller, hareket, iki tema, tek vurgu rengi, kart/bento
çeşitliliği, boş hücresiz ızgara, eyebrow kısıtı, em-dash yasağı.

## Renk rolleri

| Token | Açık | Koyu | Rol |
|---|---|---|---|
| `--paper` | `#f5f7fa` | `#0d131a` | Sayfa zemini |
| `--surface` / `--surface-2` | `#ffffff` / `#edf1f6` | `#141c26` / `#1b2531` | Kartlar, form alanları |
| `--ink` / `--ink-2` | `#111a24` / `#4a5563` | `#e9eef4` / `#a9b4c2` | Metin, ikincil metin |
| `--brand` / `--brand-deep` | `#0c3c78` / `#082a55` | `#0f3466` / `#0a2346` | Sinyal mavisi: hero, sayfa bantları, footer |
| `--brand-tint` | `#e3ebf6` | `#17263a` | Öne çıkan kart, çipler, açık kutular |
| `--accent` | `#ffc61a` | aynı | **Tek vurgu:** birincil düğme, okuma çubuğu, sarı bant, marka işareti |
| `--action` | `#0c4a94` | `#8cb8ff` | Bağlantılar, odak halkası |
| `--danger`, `--ok`, `--warn` | | | Yalnızca hata, başarı, uyarı mesajları |

Sarı hiçbir zaman açık zeminde metin rengi olarak kullanılmaz; sarı zeminde metin `--on-accent`
(mürekkep). Kontrast `npm run scan:design` ile iki temada toplam 50 ölçüm olarak hesaplanır; hepsi WCAG AA
üstünde.

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

- **Ana sayfa:** mavi tam genişlik hero (solda ad, unvan, kısa biyografi, iki düğme; sağda
  fotoğraf, arkasında sarı blok, üstüne binen "Son yazı" kartı) → öne çıkan yazı ızgarası
  (2x2 büyük kart + 5 kart, 3 sütunu tam doldurur) → konu alanları bento'su (6 kutu, 4 sütunda
  boşluksuz: fotoğraflı, sarı, açık, koyu ve iki geniş kutu) → sarı iletişim bandı (sağda
  çapraz kesilmiş fotoğraf) → koyu mavi footer.
- **Liste sayfaları:** mavi sayfa bandı + üstüne binen arama/filtre paneli + kart ızgarası.
- **Yazı sayfası:** mavi başlık bandı + üstüne binen **doküman kontrol bloğu** (imza detay:
  İSG prosedür dokümanlarındaki başlık tablosu; yazar, tarih, son güncelleme, revizyon,
  kategori, okuma süresi, her biri ikonlu) + metin ve yapışkan içerik tablosu + kaynakça kartı +
  etiket ve paylaşım hapları + ilgili yazı kartları.
- Mobilde tüm çok sütunlu düzenler tek sütuna iner; 390px'te yatay kaydırma yok (testli).

## Hareket

Hepsi CSS, JavaScript kütüphanesi yok; `prefers-reduced-motion: reduce` altında tamamen kapanır.

| Hareket | Ne anlatır |
|---|---|
| Hero ve sayfa başlıklarında kademeli yükselme (`.rise`) | Okuma sırası: unvan, ad, metin, düğmeler |
| Hero fotoğrafının yukarıdan açılması (`.reveal-media`) | Sayfanın ana görselini öne çıkarır |
| Kart ve kutuların görünür alana girince belirmesi (`animation-timeline: view()`) | İçeriğin sırayla gelmesi |
| Kart, düğme ve kutularda hover'da yükselme, görselde hafif büyüme | Tıklanabilirlik geri bildirimi |
| Yazı sayfasında sarı okuma ilerleme çubuğu (`animation-timeline: scroll()`) | Okurun metindeki yeri |

## İkonlar

[Phosphor](https://phosphoricons.com) (MIT), tek aile. Yalnızca anlam taşıyan yerlerde: kategori
kimliği (risk: pano, kaza: ilk yardım, mevzuat: terazi, eğitim: tahta, saha: baret, acil: siren),
doküman bloğu alanları, tarih/okuma süresi, paylaşım ve iletişim kanalları, arama.

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

## Yapılmayacaklar

Mor-mavi degrade, ortalanmış hero, üç eşit ikon kartı, cam efekti, neon parıltı, büyük harfli
eyebrow her bölümde, dekoratif 01/02/03, oklu düğme metni, em-dash, sahte istatistik, sahte
logo/yorum/sertifika, div'den sahte ekran görüntüsü, kartın içinde boş hücre. `npm run
scan:design` bunların koddan tespit edilebilenlerini denetler.
