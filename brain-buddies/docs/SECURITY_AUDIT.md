# SECURITY_AUDIT — Güvenlik denetimi

Araç: [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) (MIT).
Önce README, SKILL.md ve LICENSE okundu. Kurulum veya çalıştırma ücret gerektirmiyor, ücretli servis kullanılmadı.
Ham çıktılar: [`security-audit-run-1/`](security-audit-run-1/) (REPORT.md, findings.json, coverage-ledger.json,
architecture.md, run-metadata.json).

## 1. Nasıl çalıştırıldı

| Konu | Değer |
|---|---|
| Mod | Tam denetim, **quick** profil (tek avcı dalgası + tek son kapsam eleştirmeni). Kısmi bir geçiştir, kapsamın tamamı değildir. |
| Kapsam | `brain-buddies/` ve depo kökündeki `lisans.json` |
| Ajanlar | 6 bağımsız alt ajan: 4 keşif (ürün/yığın, yetki ve sınırlar, giriş yüzeyleri, yerel çalıştırma), 1 avcı, 1 eleştirmen. Doğrulayıcı gerekmedi (aday çıkmadı). Bütçe 10'du. |
| Hedef kodun çalıştırılması | **Yapılmadı.** Skill; ağ kapalı, salt okunur, kaynak sınırlı bir OS sandbox'ı ister. Ortamda `unshare`, `prlimit` ve tmpfs var, ama birleştirilmiş sarmalayıcı ve güvenli kanıt aktarıcı doğrulanmadı. Bu yüzden inceleme yalnızca kaynak kod üzerinden yapıldı. |
| Doğrulayıcılar | `validate-findings.cjs`: PASS (0 bulgu) · `validate-coverage-ledger.cjs`: PASS (8 birim) |
| Alt ajan desteği | Bu ortamda var; skill'in istediği izole alt ajan akışı uygulandı. |

## 2. Sonuç

**Doğrulanmış güvenlik açığı yok. Doğrulama bekleyen iz yok.**

| Kapsam birimi | Saldırı sınıfı | Durum |
|---|---|---|
| İçe aktarılan JSON → `sanitize()` | Prototype pollution | kapsandı |
| İçe aktarılan JSON → DOM | DOM tabanlı XSS | kapsandı |
| İçe aktarma ile üzerine yazma | Özellik kötüye kullanımı | kapsandı |
| Açılışta okunan kayıt | Tarayıcı deposu ifşası | kapsandı |
| Geliştirme sunucusu yolu | Dosya/yol işleme | kapsandı |
| Geliştirme sunucusu erişimi | Erişim kontrolü | kapsandı |
| Depo içeriği | Bariz açıklar (sır, eval, hata ayıklama) | kapsandı |
| Paketleyici girdileri | Enjeksiyon | uygulanamaz (girdi geliştiricinin kendi kodu) |

Son eleştirmen eksik birim ya da yeniden atama önermedi.

## 3. Sertleştirme notları ve uygulanan düzeltmeler

Denetim bunları açık değil, sertleştirme olarak raporladı. Denetimden **sonra** uygulandı ve testlendi:

| # | Not | Düzeltme | Test |
|---|---|---|---|
| 1 | Geliştirme sunucusunda Host kontrolü yok (DNS rebinding) | `localhost:PORT` / `127.0.0.1:PORT` dışındaki Host 421; yalnızca GET/HEAD (diğerleri 405) | `tests/serve.test.mjs` |
| 2 | Sunucu sembolik bağları izliyor | `realpath` ile kök kontrolü, tek dosya tanıtıcısından okuma | `tests/serve.test.mjs` |
| 3 | `options` anahtarları doğrulanmıyor (`__proto__`) | Oyun kimliği, anahtar ve değer biçimi kısıtlandı; en fazla 50 oyun × 10 anahtar | `tests/session-storage.test.mjs` |
| 4 | Oturum metinleri ve sayıları sınırsız | `gameId`/`category` kimlik biçimine, doğruluk 0–100'e, seviye 1–10'a, cevap sayısı 0–10000'e sınırlandı | aynı |
| 5 | İçe aktarma sınırsız ve onaysız | 1 MB sınırı; önce özet ("N oyun kaydı, M oturum"), sonra "Mevcut verinin yerine yaz" onayı | `tests/session-storage.test.mjs`, `npm run ui` |
| 6 | Bozuk kayıt yedeği başarısız olsa da "yedeklendi" diyor | `setItem` sonucu denetleniyor; başarısızsa uyarı bunu söylüyor | `tests/session-storage.test.mjs` |
| 7 | `lisans.json` herkese açık depoda bir aktiflik anahtarı gibi duruyor | Kod değişikliği yok. Bu dosyayı okuyan başka bir uygulama varsa, karar yalnızca bu depoya yazma yetkisi kadar güvenilirdir; imzalamak düşünülebilir. | — |

## 4. Bilinen sınırlar

- Quick profil tek geçiştir. Daha kapsamlı bir `standard` çalıştırma, iş mantığı ve "wildcard" sınıflarını
  da ekleyebilir.
- Hedef kod sandbox'ta çalıştırılmadığı için hiçbir bulgu yerel çalıştırmayla kanıtlanmadı (zaten aday yoktu).
- `file://` ile açılan tek dosyada localStorage'ın hangi sayfalarla paylaşıldığı tarayıcıya bağlıdır.
  Saklanan veri yalnızca oyun ilerlemesidir; gizli bilgi içermez.
- Sertleştirme düzeltmeleri denetimden sonra yapıldı; yeni bir denetim turu bunları ayrıca gözden geçirmedi.
- Beyin Testi (8 yeni oyun, `brainTest.js`, kayıt şeması 2) denetimden **sonra** eklendi ve yeniden denetlenmedi.
  Yeni dış girdi yüzeyi yok: kayıttaki `brain` alanı da `sanitizeBrain()` ile tür/aralık denetiminden geçer
  (`tests/brain.test.mjs`). Yeni kod da `innerHTML` kullanmaz (ESLint kuralı).
