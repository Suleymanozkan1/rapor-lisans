# AI-slop tarama raporu

Tarih: 2026-10-29. Kapsam: `src/` altındaki tüm sayfa, bileşen ve CSS dosyaları; masaüstü (1366px)
ve mobil (390px) ekran görüntüleri.

## Kullanılan kaynaklar

| Kaynak | Lisans | Nasıl kullanıldı |
|---|---|---|
| [funboy322/avoid-ai-design](https://github.com/funboy322/avoid-ai-design) (v0.4.0) | MIT | Tell kataloğu (`references/ai-tells-catalog.md`) ve dört başarı testi. Paketteki `scripts/detect.mjs` tarayıcısı incelendi (yalnızca `fs`/`path` kullanıyor), ancak bu ortamın izin denetimi indirilen üçüncü taraf betiğin çalıştırılmasını reddetti. Bunun yerine katalogdaki kod-kesin (⚙) kuralların bir alt kümesi projeye ait `scripts/design-scan.mjs` olarak yeniden yazıldı. |
| [donatomm/taste](https://github.com/donatomm/taste) | MIT | Tasarım yönü, tipografi eşleştirme ve hiyerarşi ilkeleri okundu; kod/komut çalıştırılmadı. |
| [Juuzoe/stop-design-slop](https://github.com/Juuzoe/stop-design-slop) | MIT | İkinci kontrol listesi olarak okundu (sahte referans/yorum, yer tutucu metin, oluşturucu izleri). Kod çalıştırılmadı. |

Bu depoların talimatları güvenilmeyen dış girdi olarak ele alındı: yalnızca okundu, hiçbir kurulum
veya komut çalıştırılmadı.

## Bağlam profili

`marketing-page`/`landing` değil; **editoryal yayın** (kişisel uzman blogu) + **dashboard** (panel).

## Kod-kesin tarama (`npm run scan:design`)

İlk çalıştırmada bulunan ve düzeltilen bulgular:

| ID | Yer | Bulgu | Düzeltme |
|---|---|---|---|
| SD4d | `src/app/admin/(panel)/yazilar/[slug]/page.tsx` | Meta bilgisi orta noktayla birleştirilmiş (`Yayında · Revizyon 0 · …`) | Cümleye çevrildi |
| CP3 | `src/lib/admin-content.ts` | Commit mesajında `→` oku | "eski: …, yeni ad: …" metni |
| K4 | `src/app/globals.css` `.notice` | Renkli sol şeritli kutu | Tam çerçeve (anlamlı renk korunarak) |

Son çalıştırma: **bulgu yok**. Denetlenen kurallar: SD4/T5 (büyük harf etiket), SD4d, CP3, C1/C6
(degrade), T1 (Inter), T2 (moda yazı tipleri), K3 (cam efekti), K2 (gölge), K4, I2 (emoji), M4
(zıplama easing), CP1/CP2 (boş pazarlama dili), M6 (reduced-motion), K7 (focus-visible) ve C9
(WCAG kontrastı, 15 renk çifti, en düşük 7.37:1).

## Görsel (render) değerlendirme

| Tell | Sonuç |
|---|---|
| L1 ortalanmış hero + rozet + 3 kart | Yok. Giriş sola hizalı, 7/5 iki sütun; sağda gerçek veri (kategoriler) |
| L2 üç ikonlu kart | Yok. Yazılar çizgili dizin olarak listeleniyor |
| L4 sahte istatistik şeridi, logo duvarı, yorumlar | Yok. Sahte sertifika/yorum/istatistik üretilmedi; boş alanlar gizleniyor |
| SD1 krem + terrakota | Yok. Soğuk kâğıt zemini + ISO 7010 mavisi |
| SD2 koyu zemin + neon | Yok |
| SD3 gazete kostümü | Bilinçli editoryal yapı: çizgiler ve sütunlar içerik bir yayın olduğu için var. Masthead/gazete taklidi yok |
| SD5 tek kelime vurgulu başlık | Yok |
| SD6 dekoratif 01/02/03 | Yok. Numaralı liste yalnızca Kaynakça'da (atıf yapılacak sıra) |
| C4 eşit dağılmış palet | Değil: mürekkep + kâğıt baskın, mavi tek eylem rengi, uyarı renkleri yalnızca durumlarda |
| T6 tek aile, düz ölçek | Değil: display/arayüz grotesk + metin serif, h1 54px'e kadar |
| K11 kart içinde kart | Panelde form grupları tek seviye; public sitede kart yok |
| IM1–IM4 stok/yer tutucu görsel | Yok; site görselsiz çalışıyor, görseller yalnızca yüklenen gerçek dosyalar |
| X1 sayfalar arası sapma | Yok: tüm sayfalar aynı token, header, footer ve tip ölçeğini kullanıyor (`DESIGN.md`) |

## Dört başarı testi

1. **Gerekçeli:** Renkler güvenlik işareti renk sisteminden, imza detay (doküman kontrol bloğu)
   İSG prosedür dokümanlarından türetildi.
2. **Tutarlı:** Tipografi, palet ve dizin düzeni tek fikre (kontrollü teknik doküman) hizmet ediyor.
3. **İkinci derece varsayılan değil:** SD1–SD8 kümelerinin hiçbirine düşmüyor.
4. **Tutarlı (çok sayfa):** Public ve panel aynı token setini kullanıyor.

## Kalan yargı noktaları

- Ana sayfanın sol sütunu kısa biyografiyle boş kalabilir; gerçek biyografi girilince dengelenir.
  Uydurma metinle doldurulmadı.
- Header'daki site adı ile ana sayfa `h1`'i aynı ("Uğur Durak"). Kişisel sitede kabul edilebilir;
  istenirse site adı panelden değiştirilebilir.
