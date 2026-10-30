# DESIGN.md: Güvenli Çalış

Bu dosya sitenin tasarım sözleşmesidir. Public site ve yönetim paneli aynı token'ları kullanır
(`src/app/globals.css`, `:root`). Site **yalnızca koyu temadır**: açık tema yoktur ve
`prefers-color-scheme` kuralı yazılmaz (`npm run scan:design` buna hata verir). Yeni bir renk, boşluk, köşe veya yazı tipi
gerekiyorsa önce buraya ekleyin, sonra koda; tek seferlik değer kullanmayın.

## Tasarım okuması

**Güvenli Çalış: sahadan konuşan bir İSG yayını ve doküman mağazası. Dil kısa cümle, açık talimat.
Görsel dil iş güvenliği levhalarından gelir: işaret siyahı zemin, tehlike sarısı, baret kırmızısı,
yol levhası harfleri.** Son yeniden tasarım "pro-design" sürecine göre yapıldı (marka, desen
kütüphanesi, hareket, tarayıcıda doğrulama).

**Marka sayfası**

| Ad | Hex | Rol |
|---|---|---|
| İşaret Siyahı | `#121211` | Zemin (`--paper`) |
| Asfalt | `#1c1c1a` | Yüzeyler, paneller (`--surface`) |
| Tebeşir | `#f2f0e8` | Metin (`--ink`) |
| Beton | `#a8a69d` | İkincil metin (`--ink-2`) |
| Tehlike Sarısı | `#ffd306` | İmza renk: hero, birincil düğme, bağlantılar, işaret üçgeni (`--accent`) |
| Baret Kırmızısı | `#e2231a` | Yalnızca küçük uyarı işaretleri, metin değil (`--signal`) |

- **Yazı tipleri:** Big Shoulders Display (başlıklar; endüstriyel levha harfi, logodaki kalın
  dar yazıya yakın) ve Barlow (metin ve arayüz; yol levhası grotesk'i). Üçüncü bir aile yok.
- **Ses:** Sahadan konuşan, açık ve uyarıcı; kısa cümle, net talimat.
- **İmza öğe:** sarı panelin eğik kenarı (hero, iletişim şeridi, ürün kapakları) ve kategori
  işaretleri olarak **ISO 7010 uyarı üçgeni** (sarı üçgen içinde kategori piktogramı).
- **Cesaret tek yerde:** hero slider'ı. Sayfanın geri kalanı sessizdir: koyu zemin, ince
  çizgiler, sarı yalnızca eylem ve işarette.

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
halkası sabit siyahtır (`--on-accent`, `.button--black`,
`.button--outline-black`). Kırmızı dolgu yalnızca silme düğmesinde ve hata mesajında
kullanılır. Kontrast `npm run scan:design` ile her renk çifti için hesaplanır; hepsi WCAG AA üstünde.

## Tipografi

| Rol | Yazı tipi | Token |
|---|---|---|
| Hero | Big Shoulders Display 900, satır 0.86 | `--fs-hero` |
| h1 / h2 / h3 | Big Shoulders Display 900 / 800 / 800 | `--fs-h1`, `--fs-h2`, `--fs-h3` |
| Metin, arayüz, düğmeler | Barlow 400/500/600/700 | `--fs-body`, `--fs-small` |
| Yazı gövdesi | Barlow 400, 68ch, satır 1.7 | `.prose` |

Başlıkta tek kelimeyi farklı renge boyama yok; her başlığın üstünde büyük harfli etiket yok.

## Şekil ve derinlik

- Köşeler levha plakası gibi küçük: paneller ve görseller 6px, düğmeler ve alanlar 4px, yalnızca
  etiket hapları yuvarlak.
- Gölge yalnızca hero görsellerinde. Kartlar kutu değildir: yazı listeleri çizgili satırlar,
  ürünler rafta duran kapaklar, konular tek bir levha tahtası.

## Düzen

- **Ana sayfa slider'ı (Instagram hikâyesi gibi):** ilk slayt site tanıtımı, ardından son 3 yazı
  ("Gündem") ve 3 mağaza ürünü karışık sırayla. Her slayt kendi sarı-siyah afişidir; yenisi
  eskisinin üzerinden **panelin eğik kenarı boyunca silerek** gelir (geri giderken tersten),
  eskisi hafifçe geri kayar, fotoğrafta yavaş yakınlaşma olur, metin kademeli yükselir. Üstte
  slayt başına bir **hikâye çubuğu**: geçmişler dolu, şimdiki dolarak zamanlayıcı olur (6,5 sn),
  çubuğa dokunmak o slayta gider. Altta duraklat, önceki, sonraki ve **"Sıradaki"** kartı (bir
  sonraki slaytın türü ve başlığı). Telefonda kaydırma (swipe), klavyede ok tuşları. Fare
  üstündeyken veya odak içindeyken durur; `prefers-reduced-motion` isteyende ne silme ne
  kendiliğinden geçiş vardır. Görünmeyen slaytlar `inert`'tir. Telefonda yazı ve ürün slaytları
  haber kartı gibidir (üstte 16:9 görsel, altta başlık 3 satır ve özet 2 satırla kırpılır),
  tanıtım slaytı temsili fotoğrafı göstermez; böylece slaytlar aynı yükseklikte kalır.
- **Ana sayfa desenleri (neden):**
  - *Hero (tip öncelikli afiş slider'ı):* İSG sitelerinin en iyi örnekleri tek tehlike, tek talimat,
    tek eylemle açılır; slider her slaytta bunu yapar.
  - *Gündem (öne çıkan yazı + başlık listesi):* yayın sitelerinin en okunur deseni; aynı kartların
    tekrarı yerine hiyerarşi.
  - *Doküman rafı:* ürün kapağı gözün tutunduğu nesnedir (dergi kapağı gibi); telefonda yatay kayan raf.
  - *Konu levhaları:* kategoriler bir levha tahtası; her biri uyarı üçgeni, ad, açıklama, yazı sayısı.
  - *İletişim şeridi:* tek bir sarı an, eğik kesimli.
- **Ana sayfa (ayrıntı):** hero solda eğik kenarlı sarı panel (logo, site adı, sitenin amacını anlatan
  dört kısa cümle ve ikonları, "Hazırlayan: Uğur Durak", "Yazıları oku" ve "Mağaza"
  düğmeleri), sağda siyah alan üzerinde temsili fotoğraf, arkasında sarı blok, üstüne binen
  "Son yazı" kartı. Telefonda hero tamamen sarıdır, fotoğrafın arkasındaki blok siyaha döner.
  Ardından öne çıkan yazı ızgarası (2x2 büyük kart + 5 kart), "Mağazadan" (3 ürün kartı), konu
  alanları bento'su (6 kutu, boşluksuz), sarı iletişim bandı, siyah footer.
- **Liste sayfaları:** tip öncelikli sayfa başlığı (dev başlık, altında kısa sarı çubuk) + arama
  ve filtre paneli + çizgiyle ayrılmış yazı satırları (solda kategori üçgeni, başlık, özet, tarih;
  sağda küçük kapak).
- **Yazı sayfası:** tip öncelikli başlık + altında **doküman kontrol bloğu** (yazar, tarih,
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

Hepsi CSS (slider'ın zamanlayıcısı da hikâye çubuğunun CSS animasyonudur), hareket kütüphanesi yok; `prefers-reduced-motion: reduce` altında tamamen kapanır.

| Hareket | Ne anlatır |
|---|---|
| Yalnızca hero'da kademeli yükselme (`.rise`) | Okuma sırası: başlık, metin, düğmeler |
| Hero fotoğrafının yukarıdan açılması (`.reveal-media`) | Sayfanın ana görselini öne çıkarır |
| Hover ve odakta renk değişimi, menüde sarı çubuğun açılması, ürün kapağında sarı çerçeve (180 ms) | Tıklanabilirlik geri bildirimi |
| Yazı sayfasında sarı okuma ilerleme çubuğu (`animation-timeline: scroll()`) | Okurun metindeki yeri |
| Slider: eğik kenar boyunca silme, eski slaytın geri kayması, fotoğrafta yavaş yakınlaşma, hikâye çubuğunun dolması | Sıradaki habere/ürüne geçiş ve ne zaman geçileceği |

Kural: tek orkestralı an hero'dur. Bölümler ve kartlar kaydırınca belirmez (içerik hiçbir zaman
animasyon beklerken gizli kalmaz); kartlar hover'da yükselmez. Arayüz geçişleri 150-250 ms,
hero dizisi 600-900 ms, hepsi ease-out.

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
halkası, form etiketleri, zorunlu alt metin, AA kontrast, reduced-motion desteği,
dokunma hedefleri en az 44px (testlerle denetlenir).

## Ürün kapağı (`.product-art`)

Görseli olmayan ürün için CSS ile çizilen kapak: siyah zemin, `clip-path` ile eğik sarı panel,
ortada logo ve Big Shoulders Display ile ürün adı.
Boyutlar kapsayıcı birimiyle (`cqi`) ölçeklenir; kartta 4:3, ürün sayfasında 4:5. Gerçek bir
ürün fotoğrafı veya önizleme görseli yüklenirse onun yerine o gösterilir. Kapak sahte bir ekran
görüntüsü veya sahte ürün fotoğrafı değildir; markanın gönderi şablonudur.

## Yapılmayacaklar

Mor-mavi degrade, ortalanmış hero, üç eşit ikon kartı, cam efekti, neon parıltı, büyük harfli
eyebrow her bölümde, dekoratif 01/02/03, oklu düğme metni, em-dash, sahte istatistik, sahte
logo/yorum/sertifika, aynı köşe ve gölgeye sahip özdeş kart ızgaraları, her bölümde kaydırınca belirme, sahte indirim veya "son 3 ürün" gibi baskı dili, uydurma takipçi sayısı, div'den sahte ekran görüntüsü, kartın içinde boş hücre. `npm run
scan:design` bunların koddan tespit edilebilenlerini denetler.
