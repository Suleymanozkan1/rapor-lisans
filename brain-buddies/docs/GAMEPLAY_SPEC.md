# GAMEPLAY_SPEC — Oyun kuralları, puanlama, süre ve zorluk

Yapı, kategoriler, gram puanı, rekor kuralı, ek süre ve oyun adları Brain Buddies'e dair bulunan
kanıtlara dayanır; sayısal değerler (gram, süre, seviye tabloları) ise **TAHMİN / özgün tasarım**dır.
Ayrıntı: `REFERENCE_GAPS.md`. Kod karşılıkları parantez içinde.

## 0. Beyin Testi — ana mod (`src/core/brainTest.js`, `src/ui/brainScreens.js`)

```
Ana sayfa (laboratuvar: başlık, 2×2 kategori kartı, Testi başlat, Profesör Gram) → Testi başlat →
  Karşılama ("Hoş geldin, <ad>!", Yükleniyor 0–100; "Hemen başla" ile geçilebilir) →
  4 kez: kategori girişi → 60 sn mini oyun → kategori sonucu (gram)
→ Final tartısı (beyin ağırlığı, kategori dağılımı, rekor, kupalar, açılan oyunlar)
```

| Kural | Değer | Dayanak |
|---|---|---|
| Kategoriler ve sıra | Hafıza → Mantık → Hesap → Görsel | GÖZLEMLENDİ |
| Oyun süresi | Her oyun 60 sn | KAYNAKTA ("Train your brain in 60 seconds") |
| Ek süre | Art arda 10 doğru = +5 sn (her 10'da bir) | OYUNCU ANLATIMI; +5 sn TAHMİN |
| Puan birimi | Gram; toplam = beyin ağırlığı | OYUNCU ANLATIMI |
| Doğru cevap | Oyunun gram değeri × (1 + 0,05 × (seviye − 1)) + hız bonusu (en fazla %25) | TAHMİN |
| Yanlış / yanlış alarm | −1,5 × gram değeri | "Hatalar puanı çok düşürür" |
| Kaçırma / düşen top | −1 × gram değeri | TAHMİN |
| Kategori puanı | 0'ın altına inmez | TAHMİN |
| Zorluk | Her oyun seviye 1'den başlar ve doğrulara göre hızla yükselir (otomatik zorluk ayarından bağımsız) | TAHMİN |
| Rekor | Yalnızca toplam rekor geçilince kaydedilir; kategori en iyileri ayrıca tutulur | KAYNAKTA |
| Karşılaştırma | Ara sonuçta: rekor testindeki aynı kategori ve kategori en iyisi (arkadaş yerine) | Uyarlama |
| Oyun seçimi | Her kategoride 2 oyun, 8'i de baştan açık. Ana sayfadan seçilir; "Rastgele" (varsayılan) ise her testte ikisinden biri gelir | OYUNCU ANLATIMI'ndan sapma: orijinalde 2. oyunlar zamanla açılıyordu; kullanıcı isteğiyle kilit kaldırıldı |
| Yarıda bırakma | Test kaydedilmez | TAHMİN |

Oyunların gram değerleri (iyi bir oyuncu 60 sn'de ≈ 1000 g alacak şekilde):

| Oyun | Kategori | Gram / doğru | Ne yapılır |
|---|---|---|---|
| Deseni Vur | Hafıza | 110 | Izgarada nesnelerin yerini ezberle; kaybolunca aynı karelere tıkla. İlk tıklama nesneleri gizler. 4×4/3 nesneden 6×6/10 nesneye |
| Kayıp Sembol | Hafıza | 100 | 4–10 nesneyi ezberle; biri eksik gösterilince 4 seçenekten eksik olanı seç (seçeneklerin yalnızca biri ilk grupta vardı). "Hazırım" süreyi kısaltır |
| Dişli Çark | Mantık | 85 | Üç dönen dişliden tek dişi farklı olanı bul. 8 → 16 diş; seviye 3+ dönme, 7+ ters yön |
| ABC Sırala | Mantık | 100 | 3–8 harfe Türk alfabesi sırasıyla tıkla (klavyeden de yazılabilir) |
| Düşürme! | Hesap | 38 / top | İşlemli toplar düşer; sonucu tuş takımıyla yaz. Ekranda aynı anda 3–6 top; cevaplar birbirinin öneki olmaz. Yanlış sayı −57 g, düşen top −38 g |
| Sayı Avı | Hesap | 75 | Hedef toplamı veren 2 (5+ seviyede 3) sayıyı seç; tek çözüm garanti |
| Uzaylıyı Dondur | Görsel | 45 / uzaylı | İki sırada ters yönde kayan uzaylılardan hedef nesneyi tutanlara dokun. Her 5 dondurmada hedef değişir. Yanlış uzaylı −68 g, kaçan hedef −45 g |
| Baloncuklar | Görsel | 90 | 4–9 baloncuğa küçükten büyüğe dokun; boyut farkı %32'den %8'e iner |

Kupalar (`TROPHIES`): İlk tartı · 3 kiloluk beyin (3000 g) · 4 kiloluk beyin · Dev beyin (5000 g) ·
Hatasız 2500 · Dengeli beyin (her kategoride 1000 g) · Seri (art arda 20 doğru) · Müdavim (30 test).

Profesör Gram'ın final yorumu toplam ağırlığa göre değişir (<1000, 1000, 2000, 3000, 4000, 5000 g).

Profesör Gram'ın ifadeleri (`src/ui/mascot.js`): ana sayfada mutlu ve el sallar; karşılamada ve oyun
girişinde düşünceli; ara sonuçta kategori rekoru → gururlu, ≥1000 g → şaşkın, ≥600 g → mutlu, altı → teselli
eden; finalde rekor (≥1500 g) → gururlu, ≥4000 g gururlu, ≥2500 g şaşkın, ≥1500 g mutlu, altı teselli eden.
Her zaman göz kırpar ve hafifçe süzülür; konuşurken ağzı oynar. Hareket azaltma ayarında hepsi durur.

## 1. Ortak oturum akışı (`src/core/session.js`, `src/ui/app.js`)

```
Menü → Tanıtım (kurallar, mod seçimi, rekor) → 3-2-1 geri sayım → [alıştırma turu] →
turlar: gösterim → cevap → geri bildirim → sonraki tur → Sonuç ekranı → Tekrar oyna / Menü
```

| Durum | Ne olur |
|---|---|
| `ready` | Oturum kuruldu, henüz tur yok |
| `presenting` | Tur çiziliyor (ör. Hafıza Izgarası yanıp sönüyor). Cevap da kabul edilir |
| `awaiting` | Oyuncu cevap verebilir; tepki süresi buradan ölçülür |
| `feedback` | Doğru/yanlış, puan değişimi, varsa seviye değişimi ve açıklama gösterilir |
| `paused` | Esc veya "Duraklat"; oturum süresi, tur süresi ve zamanlanmış işler durur |
| `ended` | Süre doldu, tur sayısı bitti veya oyuncu "Oyunu bitir" dedi |

- **Süreli mod (varsayılan):** 60 sn (ayarlarda 45/60/90). Süre dolunca açık tur sayılmadan oturum biter.
- **Süre baskısı kapalı:** 12 tur, geri sayım yok. Hafıza Izgarası'nda ezberleme süresini oyuncu
  "Ezberledim" ile bitirir. Yanlış cevaptan sonra açıklama "Devam" düğmesine kadar kalır.
  Çift Odak'ta uyaranlar 1,6 kat uzun kalır.
- **Alıştırma turu:** Bir oyun ilk kez oynanırken 1 tur. Puanlanmaz, zorluğu etkilemez, süreyi
  başlatmaz. Ekranda "ALIŞTIRMA TURU" bandı görünür.
- **Geri bildirim süresi:** doğru 0,52 sn · yanlış 0,9 sn · açıklamalı yanlış 1,7 sn
  (Mantık Devresi adımları 2,8 sn) · Çift Odak'ta hedefsiz bekleme 0,22 sn.
- Uyarlanabilir Mücadele adımları her zaman 30 sn ve süreli oynanır.

## 2. Puanlama (`src/core/score.js`)

| Sonuç | Puan |
|---|---|
| Doğru | `taban + hız + seri + ek` |
| Yanlış | −25 |
| Yanlış alarm (hedef yokken basmak) | −30 |
| Kaçırma (hedef varken basmamak) | −20 |
| Zaman aşımı | −15 |
| Boş bırakma | 0 |
| Doğru bekleme (Çift Odak, hedef yok, basılmadı) | 0, sayılmaz |

- `taban = 100 × (1 + 0,1 × (seviye − 1))` → seviye 1: 100, seviye 10: 190
- `hız = taban × 0,5 × clamp(1,5 − tepki/hedefTepki, 0, 1)` → hedefin yarısı kadar sürede tam bonus
  (%50), hedefin 1,5 katında sıfır. Hız bonusu tabanın yarısını **asla** geçmez; doğruluk her zaman
  baskındır.
- `seri = min(50, 10 × önceki art arda doğru sayısı)`
- `ek` = oyuna özel bonus, en fazla tabanın %50'si (yalnızca Değişen Örüntü kullanır).
- Toplam skor 0'ın altına inmez.
- **Doğruluk %** = doğru / (doğru + yanlış + yanlış alarm + kaçırma + zaman aşımı + boş) × 100,
  tek ondalık. Hiç cevap yoksa %0 (sıfıra bölme yok).
- **Kişisel rekorlar** (oyun başına ayrı): en iyi skor, en iyi doğruluk, en iyi (en kısa)
  ortalama doğru-cevap tepki süresi. 0 puan ya da %0 doğruluk rekor sayılmaz.
  Sonuç ekranı rekor değilse rekora kalan farkı gösterir.

## 3. Zorluk (`src/core/difficulty.js`)

Seviye 1–10. Son 4 cevaba bakılır; iki değişiklik arasında en az 3 cevap olmalıdır (küçük adımlar).

- **Yüksel:** penceredeki doğruluk ≥ %75, son cevap doğru ve doğru cevapların ortalama
  `tepki/hedefTepki` oranı ≤ 1,2.
- **Düş:** penceredeki doğruluk ≤ %50 ve son cevap yanlış.
- Her değişiklik ekranda nedeniyle duyurulur ("Seviye 4 ↑ · Son cevaplarda %100 doğruluk ve hızlı tepki").
- Ayarlarda "Otomatik zorluk" kapatılırsa seviye sabit kalır. Başlangıç seviyesi elle seçilebilir;
  "Otomatik" seçiliyse o oyunda son ulaşılan seviyenin bir altından başlanır.

## 4. İçerik üretimi (`src/core/rng.js`)

- Tohumlu RNG (mulberry32). Ayarlardaki "Sabit tohum" doluysa aynı oyun her seferinde aynı soruları üretir.
- Tekrar sınırlayıcı: aynı oturumda son 12–40 soru anahtarı (oyuna göre) tekrar edilmez; aday bulunamazsa
  oyun kilitlenmez, yine bir soru verir.
- Her üretici tek doğru cevabı doğrular; testler her oyunu 10 seviye × 25 tohum × 4 turda dener.

## 5. Serbest antrenmandaki ek oyunlar (ilk sürüm)

Hedef tepki süreleri (hız bonusu ve zorluk için) her oyunun `definition.targetRtMs` alanındadır.

### 5.1 Hafıza Izgarası — Hafıza (`memoryGrid.js`) · hedef tepki: 700 ms × hücre

- **Kural:** Kareler yanar; sönünce aynı karelere dokun. "Sıra" modunda yanma sırasıyla.
- **Girdi:** dokunma/tıklama, ok tuşlarıyla gezinme + Enter/Boşluk.
- **Başarısızlık:** yanlış kareye ilk dokunuşta tur biter; kaçırılan kareler kesikli çerçeveyle,
  sıra modunda numaralarla gösterilir.

| Seviye | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Izgara | 3×3 | 3×3 | 4×4 | 4×4 | 4×4 | 5×5 | 5×5 | 5×5 | 6×6 | 6×6 |
| Yanan kare | 3 | 4 | 4 | 5 | 6 | 6 | 7 | 8 | 8 | 9 |

Gösterim süresi: `600 + kare × max(260, 460 − 20 × seviye)` ms. Sıra modunda kare başına
`max(420, 750 − 30 × seviye)` ms.

### 5.2 Hızlı Eşleştirme — Hızlı eşleştirme (`quickMatch.js`) · hedef 1600 ms

- **Kural:** Hedef şeklin şekil + renk/desen olarak aynısını seç. Tam olarak bir eşleşme vardır.
- **Zorluk:** seçenek 4 → 6 → 9 → 12; seviye 3'ten itibaren çeldiricilerin yarısı, 6'dan itibaren
  tamamı hedefle bir özelliği paylaşır; 8+ şekiller döndürülür (döndürme önemsiz).
- Her rengin ayrı deseni vardır (düz, çizgili, noktalı, kareli, içi boş, yarım).

### 5.3 Zihinden Hesap — Sayısal (`mentalMath.js`) · hedef 2600 ms

- **Kural:** İşlemin sonucunu 4 seçenekten seç (1–4 tuşları).
- **Zorluk:** seviye 1–2 toplama/çıkarma (≤ 9, ≤ 12); 3–4 çarpma (6'lık tabloya kadar); 5+ bölme
  (tam bölünür); 7+ %60 olasılıkla iki adımlı `(a op b) ± c`. Sonuç hiçbir zaman negatif değildir.
- Çeldiriciler: ±1, ±2, ±3, ±5, ±10, ±11, −9 gibi yakın değerler; tekil ve negatif değil.

### 5.4 Çift Odak (Dual Focus) — Dikkat ve tepki (`dualFocus.js`) · hedef 700 ms

- **Kural:** Solda şekil, sağda sayı akar. Ekrandaki kural tutuyorsa BAS (Boşluk/Enter).
- **Kural kademeleri:** seviye 1–2 tek koşul (şekil), 3 tek koşul (sayı: çift/tek/5'ten büyük/küçük),
  4+ iki koşul VE (şekil veya renk + sayı). Kademe değişince "Yeni kural" sarı bantla duyurulur.
- **Akış:** hedef olasılığı %35; 5 hedefsiz uyarandan sonra hedef zorunlu. İki koşulda hedef olmayan
  uyaranların %60'ı "yarı hedeftir" (bir koşulu sağlar).
- **Süre:** uyaran `max(800, 1700 − 90 × seviye)` ms ekranda kalır. 7+ seviyede 1–4 dikkat dağıtıcı öğe.
- **Puan:** isabet = doğru; yanlış alarm −30; kaçırma −20.

### 5.5 Değişen Örüntü (Pattern Shift) — Görsel örüntü (`patternShift.js`) · hedef 2200 ms

- **Kural:** Üstteki kartı gizli kurala göre (renk, şekil, adet; 6+ boyut da) eşleştir. Her seçenek
  hedefle tam olarak bir özellikte eşleşir, bu yüzden her kuralın tek cevabı vardır.
- **Kural değişimi:** art arda 4–5 (5+ seviyede 3–5) doğrudan sonra kural sessizce değişir.
- **Görünürlük:** 1–2 kural yazılı; 3–4 yalnızca "Kural değişti!" duyurulur; 5+ hiç duyurulmaz.
- **Ek puan:** değişimden sonraki ilk iki denemede yeni kuralı bulursan +40 ("hızlı fark etme").
  Eski kurala göre seçersen açıklama: "Eski kurala göre seçtin."

### 5.6 Mantık Devresi (Logic Circuit) — Mantık (`logicCircuit.js`) · hedef 4500 ms

- **Kapılar:** VE, VEYA, DEĞİL (2+), YA DA (3+), VE-DEĞİL (8+).
- **Devre:** 1–2 tek kapı; 3–6 iki kapılı zincir; 7+ üç kapılı ağaç.
- **Soru türleri:** ÇIKIŞ kaç? (1+) · eksik giriş "?" kaç olmalı? (4+) · ÇIKIŞ=x yapan tek A, B ikilisi (6+).
  Eksik giriş ve ikili sorularında tek cevap olmayan devreler üretici tarafından elenir.
- **Yanlışta:** çözüm adım adım gösterilir: `G1 = VE(A=1, B=0) = 0 · ÇIKIŞ = VEYA(G1=0, C=1) = 1`.

### 5.7 Dizi Dedektifi (Sequence Detective) — Görsel örüntü (`sequenceDetective.js`) · hedef 4000 ms

- **Kurallar:** sabit fark (1+), katlanma (3+), iç içe iki dizi (4+), kareler (6+), Fibonacci benzeri (7+),
  artan fark (8+), ok dönüşü (2+), tekrar eden şekil (3+).
- **Eksik öğe:** 1–4 son öğe, 5+ herhangi bir konum. Uzunluk 5 → 6 → 7.
- **Tek cevap:** Hiçbir çeldirici, dizi içine konduğunda desteklenen **herhangi** bir kurala uyan bir dizi
  oluşturamaz (test edilir).

### 5.8 Kelime Kutuları — Sözel (`wordSort.js`) · hedef 1800 ms

- 11 kategori × 12–14 Türkçe kelime; listeler ayrıktır (test edilir).
- Seviye 1–2: kelimeyi 2 uzak kategoriden birine at; 3: 2 yakın kategori (Meyve/Sebze, Memeli/Kuş…);
  4–5: 3 kategori; 6–7: 4 kelimeden farklı olanı bul; 8+: yakın kategorilerle farklı olanı bul.
- Klavye: 1–3, ← →.

### 5.9 Döndür ya da Aynala — Mekânsal (`mentalRotation.js`) · hedef 3500 ms

- **Kural:** Seçeneklerden yalnızca biri parçanın döndürülmüş hâli; diğerleri ayna görüntüsünün döndürülmüş hâlleri.
- Parçalar "kiral" seçilir (aynası hiçbir dönüşüne eşit değil) → tek doğru cevap (test edilir).
- Seviye 1–2: 4 hücre (0° dönüş de olabilir); 3–5: 5; 6–7: 6; 8+: 7 hücre. Seçenek 3 (1–3), sonra 4.

### 5.10 Uyarlanabilir Mücadele (Adaptive Challenge) (`src/core/adaptive.js`)

- 5 oyun × 30 sn, her biri farklı kategoriden.
- Seçim: 1) ısınma için en güçlü alan, 2) en zayıf iki alan, 3) hiç oynanmamış alanlar, 4) kalan yer
  rastgele. Güç = oturumlardaki cevap sayısıyla ağırlıklı doğruluk.
- Her adımın nedeni oyuncuya gösterilir ("Gelişime açık alan (%55 doğruluk)").
- Başlangıç seviyesi oyunda son ulaşılan seviye. "Otomatik zorluk" kapalıysa kategoriler rastgele
  seçilir ve seviye sabit kalır; ekranda bu yazılır.
- Özet: toplam skor, toplam doğruluk ve her adımın skoru, doğruluğu, seviyesi, seçilme nedeni.

## 6. Kayıt (`src/core/storage.js`)

- Anahtar `zihin-molasi:v` (localStorage). Şema sürümü 2. Sürümsüz eski biçim (`bestScores`) → 1 → 2 sırayla dönüştürülür;
  2. sürüm `brain` alanını ekler (test sayısı, rekor test, kategori en iyileri, son 50 test, oyun seçimleri, kupalar).
- Bozuk JSON, nesne olmayan değer veya bu uygulamadan yeni bir sürüm → eski metin `zihin-molasi:v:bozuk`
  anahtarına yedeklenir, varsayılan veri ile devam edilir ve ayarlarda uyarı gösterilir.
- Yüklenen her kayıt `sanitize()` ile tür ve sınır denetiminden geçer; bilinmeyen alanlar atılır.
- Oyun başına son 30 sonuç, toplamda son 500 oturum tutulur.
- localStorage engelliyse oyun bellekte kaydederek çalışır ve bunu menüde/ayarlarda söyler.
- Ayarlar → Veriler: dışa aktar (JSON indirme + panoya kopya + metin kutusu), içe aktar (en fazla 1 MB;
  önce özet gösterilir, "Mevcut verinin yerine yaz" ile onaylanır), istatistikleri sıfırla (ayarlar korunur),
  tüm verileri sil. Silme işlemleri ikinci basışla onaylanır.
- Kayıttaki kimlikler (oyun, kategori, seçenek) biçim denetiminden geçer; doğruluk 0–100, seviye 1–10 aralığına çekilir.
