# DESIGN.md: Uğur Durak İSG blogu

Bu dosya sitenin tasarım sözleşmesidir. Public site ve yönetim paneli aynı token'ları kullanır
(`src/app/globals.css`, `:root`). Yeni bir renk, boşluk veya yazı tipi gerekiyorsa önce buraya
ekleyin, sonra koda; tek seferlik değer kullanmayın.

## Yön ve gerekçe

Konu iş sağlığı ve güvenliği; okur, işyerinde karar veren ve mevzuatı takip eden biri. Bu yüzden
site bir girişim tanıtım sayfası gibi değil, **kontrollü bir teknik doküman ve uzmanlık yayını**
gibi görünmeli:

- **Renkler ISO 7010 güvenlik işaretlerinden gelir.** Mavi (zorunluluk işareti) "bunu yap"
  anlamındadır: bağlantılar ve birincil eylemler. Sarı (uyarı) ve kırmızı (yasak/tehlike) yalnızca
  gerçek uyarılarda ve geri alınamaz eylemlerde (silme) kullanılır. Yeşil (güvenli durum) yalnızca
  başarı mesajlarında ve "Yayında" durum etiketinde görünür. Dekoratif sarı-siyah şerit, uyarı
  üçgeni süsü vb. kullanılmaz.
- **Zemin soğuk, kâğıt beyazı** (`#f4f5f2`): basılı form ve prosedür kâğıdı. Krem/parşömen değil.
- **Tipografi iki iş yapar:** başlıklar ve arayüz için tabela/teknik doküman karakterli yarı dar
  bir grotesk (Barlow Semi Condensed, Barlow), uzun okuma için kitap serifi (Source Serif 4).
  Üçü de SIL Open Font License; `@fontsource` paketleriyle siteden servis edilir (Google'a istek
  yok).
- **İmza detay: doküman kontrol bloğu.** Her yazının başında İSG prosedürlerindeki doküman başlık
  tablosu gibi bir blok vardır: yazar, yayın tarihi, son güncelleme, revizyon no, kategori, okuma
  süresi. Revizyon numarası gerçek veridir: yayındaki yazı her düzenlendiğinde artar.

## Renk rolleri

| Token | Değer | Rol |
|---|---|---|
| `--paper` | `#f4f5f2` | Sayfa zemini |
| `--surface` | `#ffffff` | Form alanları, tablolar, doküman bloğu |
| `--ink` | `#17202b` | Ana metin, başlıklar |
| `--ink-2` | `#47515d` | İkincil metin (tarih, açıklama) |
| `--rule` | `#c7cdd3` | İnce ayırıcı çizgiler |
| `--rule-strong` | `#17202b` | Bölüm başı kalın çizgi |
| `--action` / `--action-hover` | `#12467f` / `#0b3360` | Bağlantı, birincil düğme, odak halkası |
| `--warn` / `--warn-tint` | `#f2b200` / `#fdf3d3` | Yalnızca uyarı kutusu çerçevesi/zemini |
| `--danger` / `--danger-tint` | `#9e2018` / `#f8e3e1` | Hata mesajı, silme düğmesi |
| `--ok` / `--ok-tint` | `#1c6141` / `#e1efe7` | Başarı mesajı, "Yayında" etiketi |

Kontrast (WCAG 2.1, `npm run scan:design` ile her çalıştırmada hesaplanır): ana metin 15.0:1,
ikincil metin 7.4:1, bağlantı 8.7:1, düğme metni 9.5:1, uyarı kutusu metni 14.8:1. Sarı hiçbir
zaman metin rengi olarak kullanılmaz (beyaz zeminde AA'yı geçmez).

## Tipografi

| Rol | Yazı tipi | Boyut / satır | Kullanım |
|---|---|---|---|
| Display | Barlow Semi Condensed 700 | `clamp(2.1rem, 1.4rem + 3vw, 3.4rem)` / 1.12 | Sayfa başlığı (h1) |
| Başlık | Barlow Semi Condensed 600 | h2 `clamp(1.5rem…1.9rem)`, h3 1.3rem | Bölüm başlıkları |
| Arayüz | Barlow 400/600 | 1rem / 1.55 | Menü, form, tablo, meta bilgi |
| Metin | Source Serif 4 400/600, italik | 1.15rem / 1.7, en fazla 68ch | Yazı gövdesi, özetler |

Kurallar: büyük harfli etiket (ALL CAPS), harf aralığı açılmış "eyebrow", başlıkta tek kelimeyi
renklendirme yok. Etiketler cümle düzeninde ve gövde yazı tipindedir. Orta nokta (`·`) ile meta
birleştirme yerine ayrı satır veya virgül kullanılır.

## Boşluk ve grid

Ölçek: `--s1` 0.25rem, `--s2` 0.5, `--s3` 0.75, `--s4` 1, `--s5` 1.5, `--s6` 2, `--s7` 3,
`--s8` 4.5, `--s9` 7rem. Bölümler arası `--s7`/`--s8`, bileşen içi `--s2`–`--s4`.

- Sayfa genişliği `--page` 74rem; kenar boşluğu mobilde 1rem, 48rem üstünde 2rem.
- Ana sayfa girişi 60rem üstünde 7/5 iki sütun (biyografi | konu alanları), altında tek sütun.
- Yazı listesi kart ızgarası değil, **çizgili bir dizin**: solda tarih + kategori (9.5rem), sağda
  başlık + özet.
- Yazı sayfası 64rem üstünde metin (68ch) + sağda yapışkan içerik tablosu (14–18rem).
- Köşe yarıçapı 2px (`--radius`); gölge kullanılmaz. Yüzeyler 1px çizgiyle ayrılır.

## Responsive kurallar

- Tüm sayfalar 390px genişlikte yatay kaydırma olmadan çalışır (Playwright ile test edilir).
- Tablolar (yazı içi ve panel) dar ekranda kendi içinde yatay kayar; sayfa kaymaz.
- Menü dar ekranda sarar; hamburger menü yok (dört bağlantı sığar).
- Dokunma hedefleri en az 44px yükseklikte (`.button`, form alanları).

## Erişilebilirlik

- Her sayfada tek `h1`, başlık seviyeleri atlanmaz (testte denetlenir).
- "İçeriğe geç" bağlantısı ilk odaklanabilir öğedir; tüm etkileşimli öğelerde 3px görünür odak
  halkası (`:focus-visible`).
- Form alanlarının hepsinde `<label>`; yardım metni `aria-describedby` ile bağlı; hatalı alanda
  `aria-invalid`. Hata kutuları `role="alert"`, başarı `role="status"`.
- Görsellerde alt metin zorunludur (yükleme sırasında doğrulanır).
- `prefers-reduced-motion: reduce` altında tüm animasyon ve geçişler kapanır. Site zaten hareket
  kullanmaz; kural ileride eklenecek animasyonlar için emniyettir.
- Dil `tr`; tarih biçimi `tr-TR`, saat dilimi Europe/Istanbul.

## Panel

Panel aynı token'ları daha yoğun kullanır: koyu üst bar (`--ink`), solda dikey menü, beyaz
yüzeyli form grupları. Durum renkleri yalnızca anlamlı yerde: "Yayında" yeşil, silme kırmızı,
önizleme uyarısı sarı çerçeve.

## Görseller

Yalnızca kullanım hakkı olan fotoğraflar yüklenir. Temsili bir görsel gerçek olay fotoğrafı gibi
sunulmaz; gerekirse alt metinde ve metinde "temsili" denir. Stok "gülümseyen ekip" fotoğrafı,
3D blob, yapay zekâ ile üretilmiş sahte saha fotoğrafı kullanılmaz.

## Yapılmayacaklar (tasarım denetimi)

Mor-mavi degrade, ortalanmış dev hero, üçlü ikon kartı, cam efekti, parıltı, her yüzeye gölge,
anlamsız ikon, dekoratif 01/02/03, oklu düğme metni ("Devam →"), sahte istatistik şeridi, sahte
müşteri logosu/yorumu/sertifika. `npm run scan:design` bunların koddan tespit edilebilenlerini
denetler.
