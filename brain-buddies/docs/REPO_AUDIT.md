# REPO_AUDIT — Depo denetimi

Tarih: 2026-10-18 · Dal: `ccr-dcedf37e-0j6gta`

## 1. Beklenen ile bulunan

Master prompt, çalışma dizininde bir **REA deposu** olduğunu ve içinde mevcut bir oyun
döngüsü bulunduğunu varsayıyor. Bu oturumda durum farklı:

| Kontrol | Sonuç |
|---|---|
| Çalışma dizini | `rapor-lisans` (GitHub: `Suleymanozkan1/rapor-lisans`, herkese açık) |
| Commit geçmişi | 1 commit: `11d10b5 Add initial lisans.json configuration file` |
| Dosyalar | Yalnızca `lisans.json` (`{"aktif": true, "mesaj": "", "bitis": ""}`) |
| Oyun kodu / motor / build sistemi | **Yok** |
| Asset (görsel, ses, font, animasyon) | **Yok** |
| README, LICENSE, katkı rehberi, mimari belge | **Yok** |
| `references/` klasörü (ekran görüntüsü, video, arşiv) | **Yok** |
| Hesaptaki diğer depolar | 18 depo listelendi; hiçbirinin adı REA değil |

Kullanıcıya soruldu (tek soru), cevap: **"Sıfırdan, bu depoda"**. Bu yüzden oyun,
`lisans.json`'a dokunmadan ayrı bir `brain-buddies/` klasöründe sıfırdan yazıldı.

**Güncelleme:** Kullanıcı daha sonra REA deposunun `https://github.com/morluto/rea` olduğunu belirtti.
REA bir oyun deposu değil, MIT lisanslı bir tersine mühendislik aracıdır (MCP sunucusu + `rea` CLI). İçinde
yeniden kullanılacak oyun kodu yoktur, Flash/SWF desteği de yoktur. Ayrıntılar ve REA ile yapılan analiz:
`REA_ANALYSIS.md`. Bu oturumun `morluto/rea` deposuna yazma yetkisi yok; oyun `rapor-lisans` deposunda kalır.

## 2. `lisans.json` hakkında not

Dosya, başka bir uygulamanın uzaktan okuduğu bir lisans/aktiflik anahtarına benziyor
(`aktif`, `mesaj`, `bitis`). Bu bir **TAHMİN**; dosyayı kullanan kod bu depoda yok.
Dosya değiştirilmedi ve oyun onu okumaz. Depo herkese açık olduğundan, bu klasöre
eklenen her şey de herkese açık olur.

## 3. Lisans durumu

- Depoda lisans dosyası yok. Yeniden kullanılabilecek bir Brain Buddies kodu ya da asset'i
  de yok.
- Yeni oyunun tüm kodu, metni, şekilleri (SVG, kod ile çizilir) ve sesleri (Web Audio ile
  sentezlenir) bu projede **özgün** olarak üretildi. Dış asset kullanılmadı. Ayrıntı:
  `ASSETS.md`.
- Oyun arayüzde **"Zihin Molası"** adını kullanır. "Brain Buddies" adı ve logosu
  wooga'ya aittir; ad yalnızca proje klasöründe ve belgelerde referans olarak geçer.

## 4. Kurulan teknoloji yığını

| Katman | Seçim | Gerekçe |
|---|---|---|
| Dil | Modern JavaScript (ES2022, ES modülleri) | Kurulum gerektirmez, tarayıcıda ve Node'da aynı kod çalışır |
| Arayüz | Vanilla DOM + CSS + satır içi SVG | Çerçeve bağımlılığı yok, çevrimdışı çalışır |
| Ses | Web Audio API ile sentez | Ses dosyası yok, lisans riski yok |
| Kayıt | `localStorage` (sürümlü şema), yedek: bellek | Sunucu/hesap yok |
| Test | `node --test` (Node 22 yerleşik) | Sıfır bağımlılık |
| Lint | ESLint 10 (ortamda kurulu, MIT), bağımlılık olarak eklenmedi | İsteğe bağlı |
| Arayüz testi | Playwright + Chromium (ortamda kurulu, Apache-2.0), bağımlılık olarak eklenmedi | İsteğe bağlı |
| Build | `tools/build.mjs`: kendi yazdığımız küçük paketleyici, tek dosya `dist/zihin-molasi.html` üretir | `file://` ile çift tıklayıp çevrimdışı oynanabilir |

`package.json` içinde **hiç bağımlılık yok** (`dependencies` ve `devDependencies` boş).

## 5. Dosya haritası

```
brain-buddies/
  index.html            geliştirme girişi (ES modülleri, yerel sunucu ister)
  styles.css            tema token'ları, açık/koyu mod, responsive düzen
  package.json          betikler: test, build, start, lint, check, ui
  src/main.js           uygulama girişi
  src/core/             arayüzden bağımsız, test edilen mantık
    rng.js              tohumlu RNG (mulberry32), tekrar sınırlayıcı
    score.js            ScoreCalculator + GameResult
    difficulty.js       DifficultyController
    timer.js            TimerController (enjekte edilebilir saat)
    session.js          GameSession durum makinesi
    storage.js          ProgressRepository (sürüm, göç, bozuk veri)
    stats.js            istatistik ve güçlü alan hesabı
    adaptive.js         Uyarlanabilir Mücadele planlayıcısı
    brainTest.js        Beyin Testi kuralları (kategoriler, gram, rekor, kupalar)
    icons.js            nesne simgeleri
    shapes.js           ortak şekil/renk/desen tanımları
  src/games/            her mini oyun bir modül (ortak arayüz); 8 test + 9 ek oyun
  src/ui/               ekranlar (app.js, brainScreens.js), Profesör Gram (mascot.js), SVG, ses, DOM
  tests/                birim + entegrasyon testleri
  tools/                build, yerel sunucu, arayüz kontrolü
  docs/                 bu belgeler
```

## 6. Build / çalıştırma

```
cd brain-buddies
npm test          # tüm otomatik testler
npm run build     # dist/zihin-molasi.html (tek dosya, çevrimdışı)
npm start         # http://localhost:8080 (geliştirme, ES modülleri)
```

## 7. Teknik borç / riskler

- Gerçek Brain Buddies oynanışı gözlemlenemedi (bkz. `REFERENCE_GAPS.md`). Süreler ve
  puanlar özgün tasarım kararlarıdır.
- Paketleyici yalnızca bu projenin kullandığı `import`/`export` biçimlerini destekler.
  Biçim kuralı `tools/build.mjs` başında yazılı; build bozuk biçimde hata verir.
- `localStorage` gizli pencerede veya engellenmiş site verisinde çalışmayabilir. Oyun bu
  durumda bellekte kaydederek çalışmaya devam eder ve ayarlarda bunu söyler.
