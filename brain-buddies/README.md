# Zihin Molası

Kişisel kullanım için tek oyunculu, çevrimdışı çalışan bir beyin oyunu. wooga'nın 2009 Facebook oyunu
**Brain Buddies**'in yapısını yeniden kurar: Profesör Gram beynini 4 kategoride (Hafıza, Mantık, Hesap,
Görsel) 60'ar saniyelik mini oyunlarla test eder ve sonunda **beyninin kaç gram olduğunu** söyler.
Hiçbir orijinal kod, görsel, ses veya metin kullanılmadı; karakter ve çizimler özgündür.

- **Beyin Testi:** 4 × 60 sn, gram puanı, toplam beyin ağırlığı, rekor yalnızca toplamı geçince kaydedilir
- Orijinal menünün yerleşimi: laboratuvar sahnesi, 2×2 kategori kartı, büyük "Testi başlat", adınla karşılama
- 8 test oyunu (her kategoride 2, hepsi baştan açık; her testte kategoriden biri rastgele gelir ya da ana sayfadan seçilir), art arda 10 doğruya ek süre, 8 kupa
- **Ek oyunlar ana sayfada:** 9 ek beyin oyunu tek dokunuşla başlar
- **Serbest antrenman:** 17 oyunun hepsi, süre/zorluk ayarları, Uyarlanabilir Mücadele
- Otomatik zorluk, alıştırma turu, süre baskısını kapatma (antrenmanda)
- Kişisel rekorlar, günlük/haftalık istatistikler, güçlü alanlar
- Açık/koyu tema, klavyeyle tam oynanış, hareket azaltma, sesler aç/kapat
- Hiçbir veri dışarı gönderilmez; kayıt yalnızca tarayıcıda (localStorage)
- Sıfır bağımlılık, ücretli servis yok

## Hemen oyna

`dist/zihin-molasi.html` dosyasını çift tıklayıp tarayıcıda aç. İnternet gerekmez.

## Geliştirme

Gereken tek şey Node.js 20+ (ücretsiz). `npm install` gerekmez; projede bağımlılık yok.

```bash
cd brain-buddies
npm test          # 92 otomatik test (node:test)
npm run check     # tüm .js/.mjs dosyalarında sözdizimi denetimi
npm run build     # dist/zihin-molasi.html üretir (tek dosya)
npm start         # http://localhost:8080 — ES modülleriyle geliştirme sunucusu
npm run verify    # check + test + build

# İsteğe bağlı (global kurulu araçlar gerekir, proje bağımlılığı değildir):
npm run lint      # ESLint (MIT)
npm run ui        # Playwright + Chromium ile uçtan uca arayüz kontrolü (Apache-2.0)
npm run apk       # Android APK (JDK 17+ ve Android SDK gerekir, bkz. aşağısı)
```

## Android (APK)

`android/` klasörü oyunu çevrimdışı açan küçük bir Android uygulamasıdır: `dist/zihin-molasi.html`
derlemede `assets/index.html` olarak kopyalanır ve tam ekran WebView'da açılır. Kütüphane bağımlılığı yok
(AndroidX dahil), internet izni istemez, Android 8.0+ (API 26) üzerinde çalışır.

- Geri tuşu: oyun sürerken duraklatır, alt ekranlarda ana sayfaya döner, ana sayfada uygulamadan çıkar.
- Ayarlar → Dışa aktar "Farklı kaydet" penceresini açar; İçe aktar dosya seçiciyi açar.
- Kayıtlar uygulamanın kendi alanında tutulur; uygulama silinince kayıtlar da silinir (önce dışa aktar).

Derleme (hepsi ücretsiz): JDK 17+, Android SDK `platforms;android-35` ve `build-tools;35.0.0`
(`sdkmanager` ile). `android/local.properties` içine `sdk.dir=<SDK yolu>` yaz, sonra `npm run apk`.
Çıktı: `android/app/build/outputs/apk/release/app-release.apk`.

İmzalama: `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`) varsa
sürüm anahtarıyla, yoksa hata ayıklama anahtarıyla imzalanır. Anahtar ve şifre depoya eklenmez
(`.gitignore`). Güncellemeyi kayıtları silmeden kurmak için hep aynı anahtar kullanılmalıdır.

## Beyin Testi oyunları

| Kategori | Oyun 1 | Oyun 2 |
|---|---|---|
| Hafıza | Deseni Vur: nesnelerin yerini ezberle, karelere tıkla | Kayıp Sembol: eksik nesneyi bul |
| Mantık | Dişli Çark: üç dişliden farklı olanı bul | ABC Sırala: harflere alfabe sırasıyla tıkla |
| Hesap | Düşürme!: düşen toplardaki işlemi tuş takımıyla çöz | Sayı Avı: hedef toplamı veren sayıları seç |
| Görsel | Uzaylıyı Dondur: hedef nesneyi tutan uzaylıları dondur | Baloncuklar: küçükten büyüğe dokun |

## Serbest antrenmandaki ek oyunlar

| Oyun | Kategori | Özet |
|---|---|---|
| Hafıza Izgarası | Hafıza | Yanan kareleri ezberle; konum veya sıra modu |
| Hızlı Eşleştirme | Hızlı eşleştirme | Hedef şeklin tıpatıp aynısını bul |
| Zihinden Hesap | Sayısal | Dört işlem, iki adımlı işlemler |
| Değişen Örüntü | Görsel örüntü | Gizli eşleştirme kuralı değişir; hemen fark et |
| Dizi Dedektifi | Görsel örüntü | Sayı/ok/şekil dizisinde eksik öğe |
| Çift Odak | Dikkat ve tepki | İki akış; yalnızca kural tutunca bas |
| Kelime Kutuları | Sözel | Kategoriye ayır, farklı olanı bul |
| Döndür ya da Aynala | Mekânsal | Döndürülmüş hâli ayna görüntüsünden ayırt et |
| Mantık Devresi | Mantık | VE/VEYA/DEĞİL/YA DA kapılarıyla çıkışı bul |

Kurallar, puan formülleri, süreler ve seviye tabloları: [docs/GAMEPLAY_SPEC.md](docs/GAMEPLAY_SPEC.md).

## Yeni oyun eklemek

1. `src/games/yeniOyun.js` oluştur; `definition`, `createState`, `nextRound`, `evaluate`, `render` dışa aktar
   (arayüz `src/games/index.js` başında anlatılır).
2. `src/games/index.js` içindeki `GAMES` listesine ekle.
3. `tests/helpers.mjs` içinde doğru/yanlış cevap üreticisi gerekiyorsa ekle; ortak testler yeni oyunu
   otomatik olarak 10 seviyede dener.

Başka bir dosyanın değişmesi gerekmez.

## Belgeler

- [docs/REPO_AUDIT.md](docs/REPO_AUDIT.md) — depo denetimi, yığın, dosya haritası
- [docs/GAMEPLAY_SPEC.md](docs/GAMEPLAY_SPEC.md) — oyun kuralları ve puanlama
- [docs/REFERENCE_GAPS.md](docs/REFERENCE_GAPS.md) — Brain Buddies hakkında bilinenler ve bilinmeyenler
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — kilometre taşları, bilinen eksikler
- [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) — güvenlik denetimi sonucu
- [docs/REA_ANALYSIS.md](docs/REA_ANALYSIS.md) — REA ile yapılan inceleme
- [docs/TOOLS_AND_COSTS.md](docs/TOOLS_AND_COSTS.md) — kullanılan araçlar, lisanslar, maliyet
- [ASSETS.md](ASSETS.md) — görsel ve ses kaynakları
