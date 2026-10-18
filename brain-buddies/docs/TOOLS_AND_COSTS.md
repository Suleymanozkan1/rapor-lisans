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
| Cloudflare security-audit-skill | güvenlik denetimi iş akışı | MIT (LICENSE okundu) | Ücretsiz | Evet (doğrulayıcılar sıfır bağımlılıklı Node betikleri) | Yok | Hayır (projeye kopyalanmadı) |

Notlar:
- `npx eslint .` ESLint kurulu değilse npm kayıt defterinden indirir (ücretsiz, ağ gerekir). Bu oturumda
  global kurulu sürüm kullanıldı; ağdan bir şey indirilmedi.
- security-audit-skill depoyu `git clone` ile indirmek için bir kez ağ kullanıldı. Kurulum için önerilen
  `npx skills add` kullanılmadı.
- Brain Buddies hakkında bilgi için iki web araması/okuma yapıldı (`REFERENCE_GAPS.md`). Oyunun kendisi ağ kullanmaz.

## 3. Hangi kontroller gerçekten çalıştırıldı

| Kontrol | Komut | Sonuç |
|---|---|---|
| Sözdizimi | `npm run check` | 33/33 dosya geçti |
| Otomatik testler | `npm test` | 65/65 geçti |
| Build | `npm run build` | `dist/zihin-molasi.html` üretildi (~164 KB, 24 modül) |
| Lint | `eslint .` | 0 hata, 0 uyarı (1 `prefer-const` hatası bulundu ve düzeltildi) |
| Uçtan uca arayüz | `npm run ui` | tüm kontroller geçti: 9 oyunun tam oturumu (telefon), taşma (dikey/yatay/masaüstü), klavye, Esc ile duraklatma, kalıcılık, koyu tema, erişilebilir adlar, konsol hatası yok |
| Kontrast (WCAG AA) | `tests/a11y.test.mjs` | açık + koyu tema geçti (2 renk düzeltildi) |
| Güvenlik denetimi | Cloudflare security-audit-skill, quick profil | bkz. `SECURITY_AUDIT.md` |
| Bağımlılık denetimi (`npm audit`) | — | Çalıştırılmadı: denetlenecek bağımlılık ve kilit dosyası yok |
