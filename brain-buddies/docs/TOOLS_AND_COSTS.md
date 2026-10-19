# TOOLS_AND_COSTS — Kullanılan araçlar, lisanslar ve maliyet

**Sonuç: Projeye hiçbir ücretli servis, abonelik, ücretli API veya kotalı bulut hizmeti eklenmedi.**
`package.json` içinde `dependencies` ve `devDependencies` boştur. Oyun çalışırken hiçbir ağ isteği yapmaz.

## 1. Oyunun çalışma zamanı

| Bileşen | Lisans | Ücret | Çevrimdışı | Ücretli API / abonelik |
|---|---|---|---|---|
| Tarayıcı (HTML, CSS, JS, SVG, Web Audio, localStorage) | — (platform) | Ücretsiz | Evet | Hayır |
| Projenin kendi kodu | Projeye ait | — | Evet | Hayır |
| Web yazı tipi | Kullanılmadı (sistem yazı tipleri) | — | Evet | Hayır |
| Analitik / telemetri / hata izleme | Kullanılmadı | — | — | Hayır |

## 2. Geliştirme araçları

| Araç | Ne için | Lisans | Ücret | Çevrimdışı | Telemetri | Proje bağımlılığı mı? |
|---|---|---|---|---|---|---|
| Node.js 22 | test, build, geliştirme sunucusu | MIT | Ücretsiz | Evet | Yok | Hayır (önkoşul) |
| `node:test` | birim/entegrasyon testleri | MIT (Node'un parçası) | Ücretsiz | Evet | Yok | Hayır |
| `tools/build.mjs`, `serve.mjs`, `check-syntax.mjs` | paketleme, sunucu, sözdizimi | Projeye ait | — | Evet | Yok | — |
| ESLint 10.1.0 | lint (yalnızca yerleşik kurallar) | MIT | Ücretsiz | Evet (kuruluysa) | Yok | Hayır (ortamda global kurulu) |
| Playwright + Chromium | uçtan uca arayüz kontrolü | Apache-2.0 / BSD | Ücretsiz | Evet (kuruluysa) | Yok | Hayır (ortamda global kurulu) |
| Python 3 + Pillow | yalnızca ekran görüntülerini birleştirmek için (geliştirme oturumunda) | PSF / HPND | Ücretsiz | Evet | Yok | Hayır |
| Web araması / WebFetch | Brain Buddies kanıtlarını bulmak (oturum araçları) | — | Ek ücret yok | Hayır (ağ) | — | Hayır |
| Cloudflare security-audit-skill | güvenlik denetimi iş akışı | MIT (LICENSE okundu) | Ücretsiz | Evet (doğrulayıcılar sıfır bağımlılıklı Node betikleri) | Yok | Hayır (projeye kopyalanmadı) |
| OpenJDK 21 | Android derlemesi | GPLv2 + Classpath istisnası | Ücretsiz | Evet | Yok | Hayır (ortamda kurulu) |
| Gradle 8.14.3 (wrapper) | Android derlemesi | Apache-2.0 | Ücretsiz | İlk indirmeden sonra evet | Varsayılan olarak yok (build scan kullanılmadı) | Hayır (yalnızca derleme aracı) |
| Android Gradle Plugin 8.10.1 | APK paketleme | Apache-2.0 | Ücretsiz | İlk indirmeden sonra evet | AGP kullanım istatistiği varsayılan kapalı | Hayır (derleme aracı; APK'ya girmez) |
| Android SDK (platform 35, build-tools 35.0.0, cmdline-tools) | APK derleme ve imzalama | Android SDK Lisans Sözleşmesi (ücretsiz) | Ücretsiz | İlk indirmeden sonra evet | `sdkmanager` istatistiği sorulmadı/gönderilmedi | Hayır (önkoşul) |
| REA (`rea-agents` 6.7.0, morluto/rea) | statik JavaScript analizi | MIT | Ücretsiz | Evet (statik analiz) | Belgelenmemiş; analiz yerelde çalıştı | Hayır (geçici klasöre `--ignore-scripts` ile kuruldu) |

Notlar:
- `npx eslint .` ESLint kurulu değilse npm kayıt defterinden indirir (ücretsiz, ağ gerekir). Bu oturumda
  global kurulu sürüm kullanıldı; ağdan bir şey indirilmedi.
- security-audit-skill depoyu `git clone` ile indirmek için bir kez ağ kullanıldı. Kurulum için önerilen
  `npx skills add` kullanılmadı.
- Brain Buddies hakkında bilgi için web araması ve Wayback dizin sorguları yapıldı (`REFERENCE_GAPS.md`, `REA_ANALYSIS.md`). Oyunun kendisi ağ kullanmaz.
- Android SDK, AGP ve Gradle Google/Gradle sunucularından bir kez (ücretsiz) indirildi. APK'da hiçbir kütüphane yok; uygulama internet izni istemez.
- `rea-agents` npm kayıt defterinden (ücretsiz) geçici bir klasöre indirildi; proje bağımlılığı değildir.

## 3. Hangi kontroller gerçekten çalıştırıldı

| Kontrol | Komut | Sonuç |
|---|---|---|
| Sözdizimi | `npm run check` | 48/48 dosya geçti |
| Otomatik testler | `npm test` | 92/92 geçti (Beyin Testi ve geliştirme sunucusu testleri dahil) |
| Build | `npm run build` | `dist/zihin-molasi.html` üretildi (~270 KB, 37 modül) |
| Lint | `eslint .` | 0 hata, 0 uyarı (1 `prefer-const` hatası bulundu ve düzeltildi) |
| Uçtan uca arayüz | `npm run ui` | 74/74 kontrol geçti: laboratuvar ana ekranı ve karşılama, 8 test oyununun baştan açık ve seçilebilir olması, ana sayfadaki 9 ek oyun kartı, tam Beyin Testi (4 oyun + final tartısı), rekorun kalıcılığı, antrenmandaki 17 oyunun tam oturumu, taşma (dikey/yatay/masaüstü), klavye (1–4 ve Düşürme!'de rakamlar), Esc ile duraklatma, dışa/içe aktarma onayı, koyu tema, erişilebilir adlar, konsol hatası yok |
| Kontrast (WCAG AA) | `tests/a11y.test.mjs` | açık + koyu tema geçti (2 renk düzeltildi) |
| Güvenlik denetimi | Cloudflare security-audit-skill, quick profil, 6 alt ajan | 0 doğrulanmış açık, 0 doğrulama bekleyen iz, 7 sertleştirme notu (6'sı uygulandı); iki doğrulayıcı PASS. Hedef kod sandbox'ta çalıştırılmadı (bkz. `SECURITY_AUDIT.md`) |
| REA statik analizi | `rea analyze-javascript-application` | 34 dosya, 0 ayrıştırma hatası; ağ uç noktası yok (bkz. `REA_ANALYSIS.md`) |
| Android APK | `npm run apk` (Gradle `assembleRelease`) | ~90 KB APK; `apksigner verify` v2 imzası geçerli; `aapt2 dump badging`: minSdk 26, targetSdk 35, izin yok. Cihazda/emülatörde denenmedi (ortamda KVM yok); geri tuşu betiği ve dışa aktarma köprüsü Chromium'da 6/6 duman testi geçti |
| Bağımlılık denetimi (`npm audit`) | — | Çalıştırılmadı: denetlenecek bağımlılık ve kilit dosyası yok |
