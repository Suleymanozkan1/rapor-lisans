# REA_ANALYSIS — REA ile yapılan inceleme

Kullanıcı, master prompttaki "REA deposu" olarak `https://github.com/morluto/rea` deposunu belirtti
(2026-10-18, commit `b0b485a`).

## 1. REA nedir

REA ("Reverse Engineer Anything") bir oyun deposu değil, bir **tersine mühendislik aracıdır**: AI kod
ajanlarına bağlanan bir MCP sunucusu ve `rea` komut satırı aracı. Lisansı MIT, npm paketi `rea-agents`.
Ücretsiz ve yerelde çalışır. Ücretli bir servis gerektirmez; Hopper/IDA gibi ticari motorlar isteğe bağlıdır,
Ghidra gibi ücretsiz alternatifleri vardır.

Bu yüzden promptun "REA deposundaki mevcut oyun döngüsünü incele" kısmı uygulanamadı: REA içinde oyun
kodu yok. Doğru okuma, REA'nın **eski Brain Buddies'i incelemek için araç** olarak kullanılmasıdır.

## 2. REA ile Brain Buddies incelenebilir mi

| Soru | Sonuç | Kanıt |
|---|---|---|
| REA Flash/SWF/ActionScript çözümleyebilir mi? | **Hayır** | REA kaynağında `swf`, `actionscript`, `ruffle`, `jpexs` geçmiyor; desteklenen hedefler native ikililer, JS/Electron, web siteleri, HAR kayıtları, .NET, Android, WASM, EVM vb. (README "What you can analyze") |
| Brain Buddies'in bir kopyası var mı? | Bu oturumda **yok** | `references/` yok; kullanıcı dosya sağlamadı |
| Web arşivinde iz var mı? | **Var** (Wayback Machine dizin API'si) | `apps.facebook.com/brainbuddies` (2010-06-30), `www.wooga.com/games/brain-buddies/` (2010-09-29), `www.facebook.com/BrainBuddies` (2010-01-20), `www.wooga.com/games/` (2010-05-25) |
| Bu arşiv sayfaları okunabildi mi? | **Hayır** | Bu bulut ortamının ağ politikası `web.archive.org` bağlantılarını kesiyor; WebFetch de bu alan adını reddediyor |

Arşiv sayfaları okunabilseydi REA'nın web sitesi ve HAR analizleri sayfa yapısını, betikleri ve SWF
adreslerini çıkarabilirdi. SWF'nin içindeki oyun kuralları için ayrıca ücretsiz bir Flash çözümleyici
(ör. JPEXS FFDec, GPL) gerekir; bu REA'nın parçası değildir.

## 3. REA'nın bu projeye uygulanması

REA'nın statik JavaScript çözümleyicisi oyunun kendi kodunda bağımsız bir kontrol olarak çalıştırıldı.
Kod çalıştırılmaz, yalnızca okunur.

```
npm install --ignore-scripts rea-agents@6.7.0     # geçici klasöre, projeye eklenmedi
rea analyze-javascript-application brain-buddies --json
```

| Ölçüm | Değer |
|---|---|
| Ayrıştırılan JS dosyası | 34 (hata 0) |
| Modül grafiği | 291 düğüm, 536 kenar |
| Ziyaret edilen AST düğümü | 34 658 |
| Electron penceresi / preload / IPC / native eklenti | 0 / 0 / 0 / 0 |
| Ağ uç noktası | Bulunmadı |
| Veri ayrıştırma sınırları (`JSON.parse`) | `src/core/storage.js:192` (açılışta kayıt okuma), `src/core/storage.js:292` (içe aktarma), bir test dosyası |
| Sayı dönüştürme sınırları | `tools/serve.mjs:10` (PORT), `src/ui/app.js:854`, `tools/ui-check.mjs:119` |

REA, uygulamanın dış veri aldığı yalnızca iki yer olduğunu doğruladı: tarayıcıda saklanan kayıt ve
içe aktarılan JSON. İkisi de aynı `migrate()` → `sanitize()` yolundan geçer. Güvenlik denetimi de aynı
sonuca vardı (`SECURITY_AUDIT.md`).

REA'nın belirttiği sınırlamalar:
- `dist/zihin-molasi.html` içindeki tek satır içi betik incelenmedi. Kaynak `src/` ayrıca tamamen incelendi.
- Statik ilişkiler çalışma zamanında yürütüldüğünü kanıtlamaz; grafik kapsamı eksiksiz değildir.

## 4. Brain Buddies'i gerçekten incelemek için ne gerekir

En az biri yeterli:
1. Ortamın ağ ayarlarında `web.archive.org` alan adına izin ver. Sonra arşiv sayfalarını okur, SWF
   adreslerini çıkarır ve `REFERENCE_GAPS.md` tablosunu güncellerim.
2. Elinde ekran görüntüsü, oynanış videosu veya kaydedilmiş SWF/HAR dosyası varsa
   `brain-buddies/references/` klasörüne koy.

Her iki durumda da yalnızca **kurallar, süreler ve puanlama** çıkarılır. Orijinal grafik, ses, metin ve kod
kopyalanmaz.
