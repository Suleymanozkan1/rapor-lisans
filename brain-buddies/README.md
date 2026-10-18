# Zihin Molası

Kişisel kullanım için tek oyunculu, çevrimdışı çalışan bir beyin egzersizi oyunu. wooga'nın 2009
Facebook oyunu Brain Buddies'in "kısa, hızlı, tekrar oynanabilir zihin oyunları" hissinden ilham alan
**özgün** bir yeniden yapım. Hiçbir orijinal kod, görsel, ses veya metin kullanılmadı.

- 9 mini oyun, 8 beyin kategorisi, Uyarlanabilir Mücadele modu
- Puanlama, seri ve hız bonusu, otomatik zorluk (kapatılabilir), alıştırma turu
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
npm test          # 75 otomatik test (node:test)
npm run check     # tüm .js/.mjs dosyalarında sözdizimi denetimi
npm run build     # dist/zihin-molasi.html üretir (tek dosya)
npm start         # http://localhost:8080 — ES modülleriyle geliştirme sunucusu
npm run verify    # check + test + build

# İsteğe bağlı (global kurulu araçlar gerekir, proje bağımlılığı değildir):
npm run lint      # ESLint (MIT)
npm run ui        # Playwright + Chromium ile uçtan uca arayüz kontrolü (Apache-2.0)
```

## Oyunlar

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
