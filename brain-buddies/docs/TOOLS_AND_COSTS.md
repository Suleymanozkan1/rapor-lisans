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
| REA (`rea-agents` 6.7.0, morluto/rea) | statik JavaScript analizi | MIT | Ücretsiz | Evet (statik analiz) | Belgelenmemiş; analiz yerelde çalıştı | Hayır (geçici klasöre `--ignore-scripts` ile kuruldu) |

Notlar:
- `npx eslint .` ESLint kurulu değilse npm kayıt defterinden indirir (ücretsiz, ağ gerekir). Bu oturumda
  global kurulu sürüm kullanıldı; ağdan bir şey indirilmedi.
- security-audit-skill depoyu `git clone` ile indirmek için bir kez ağ kullanıldı. Kurulum için önerilen
  `npx skills add` kullanılmadı.
- Brain Buddies hakkında bilgi için web araması ve Wayback dizin sorguları yapıldı (`REFERENCE_GAPS.md`, `REA_ANALYSIS.md`). Oyunun kendisi ağ kullanmaz.
- `rea-agents` npm kayıt defterinden (ücretsiz) geçici bir klasöre indirildi; proje bağımlılığı değildir.

## 3. Hangi kontroller gerçekten çalıştırıldı

| Kontrol | Komut | Sonuç |
|---|---|---|
| Sözdizimi | `npm run check` | 47/47 dosya geçti |
| Otomatik testler | `npm test` | 92/92 geçti (Beyin Testi ve geliştirme sunucusu testleri dahil) |
| Build | `npm run build` | `dist/zihin-molasi.html` üretildi (~251 KB, 36 modül) |
| Lint | `eslint .` | 0 hata, 0 uyarı (1 `prefer-const` hatası bulundu ve düzeltildi) |
| Uçtan uca arayüz | `npm run ui` | 61/61 kontrol geçti: tam Beyin Testi (4 oyun + final tartısı), rekorun kalıcılığı, antrenmandaki 13 açık oyunun tam oturumu ve 4 kilitli oyun, taşma (dikey/yatay/masaüstü), klavye (1–4 ve Düşürme!'de rakamlar), Esc ile duraklatma, dışa/içe aktarma onayı, koyu tema, erişilebilir adlar, konsol hatası yok |
| Kontrast (WCAG AA) | `tests/a11y.test.mjs` | açık + koyu tema geçti (2 renk düzeltildi) |
| Güvenlik denetimi | Cloudflare security-audit-skill, quick profil, 6 alt ajan | 0 doğrulanmış açık, 0 doğrulama bekleyen iz, 7 sertleştirme notu (6'sı uygulandı); iki doğrulayıcı PASS. Hedef kod sandbox'ta çalıştırılmadı (bkz. `SECURITY_AUDIT.md`) |
| REA statik analizi | `rea analyze-javascript-application` | 34 dosya, 0 ayrıştırma hatası; ağ uç noktası yok (bkz. `REA_ANALYSIS.md`) |
| Bağımlılık denetimi (`npm audit`) | — | Çalıştırılmadı: denetlenecek bağımlılık ve kilit dosyası yok |
