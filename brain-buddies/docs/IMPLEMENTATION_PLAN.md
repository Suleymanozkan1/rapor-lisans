# IMPLEMENTATION_PLAN — Geliştirme planı ve durum

Durum etiketleri: **TAMAM** (çalışıyor ve test edildi) · **KISMİ** · **SONRAKİ ADIM**.

## Milestone 1 — Keşif · TAMAM

| İş | Çıktı | Kabul kriteri | Durum |
|---|---|---|---|
| Depo analizi | `REPO_AUDIT.md` | Dosya haritası, yığın, build adımları | TAMAM |
| Referans kanıtları | `REFERENCE_GAPS.md` | Her bulgu etiketli; boşluklar açık | TAMAM |
| Lisans kontrolü | `REPO_AUDIT.md §3`, `ASSETS.md` | Dış asset yok; tüm görsel/ses özgün | TAMAM |
| Teknik plan | bu belge | Öncelik, bağımlılık, kabul kriteri | TAMAM |
| Kritik soru | Kullanıcıya tek soru soruldu: "REA yok, nasıl devam?" → "Sıfırdan, bu depoda" | — | TAMAM |

## Milestone 2 — Oynanabilir temel · TAMAM

| Dosya | Sorumluluk (prompt §6 karşılığı) |
|---|---|
| `src/core/session.js` | GameSession + GameState (durum makinesi, tur aşaması) |
| `src/core/timer.js` | TimerController (enjekte edilebilir saat, duraklatma) |
| `src/core/score.js` | ScoreCalculator + GameResult |
| `src/core/difficulty.js` | DifficultyController |
| `src/core/storage.js` | ProgressRepository (sürüm, göç, bozuk veri) |
| `src/games/index.js` | GameDefinition kaydı + ortak arayüz |
| `src/ui/app.js` | ekranlar, GameInput (dokunma, tıklama, klavye) |
| `src/ui/audio.js` | AudioManager · animasyonlar CSS ile, `reduce-motion` sınıfıyla kapatılır |

Kabul: menüden en fazla iki adımda oyun başlar (oyun satırı → Başla); süre, skor, sonuç ekranı çalışır.
Test: `tests/core.test.mjs`, `tests/session-storage.test.mjs`.

## Milestone 3 — İlk oyun grubu · TAMAM

Hafıza Izgarası (konum + sıra), Hızlı Eşleştirme, Zihinden Hesap. Test: `tests/games.test.mjs`.

## Milestone 4 — Özgün oyunlar · TAMAM

Çift Odak, Değişen Örüntü, Mantık Devresi, Dizi Dedektifi. 7.1'deki kategorilerin hepsini kapsamak için
ek olarak Kelime Kutuları (sözel) ve Döndür ya da Aynala (mekânsal) eklendi.
Kabul: her üretilen sorunun tek doğru cevabı otomatik testle doğrulanır (10 seviye × 25 tohum × 4 tur).

## Milestone 5 — İlerleme · TAMAM

Yerel kayıt, kişisel rekorlar (skor, doğruluk, tepki süresi), günlük/haftalık oturum sayısı, oyun bazında
eğilim ve son 10 skor çizgisi, kategori güçlü alanları, Uyarlanabilir Mücadele, dışa/içe aktarma, sıfırlama, silme.

## Milestone 6 — Cilalama · TAMAM

Açık/koyu tema (sistem + elle), WCAG AA kontrast testi, renk + desen + metin ile anlam, klavye ile tam oynanış,
`prefers-reduced-motion` + elle hareket ayarı, ses aç/kapat, telefon dikey/yatay ve masaüstü düzeni.

## Milestone 7 — Doğrulama · TAMAM

`npm run verify` (sözdizimi + 65 test + build), `eslint .`, `npm run ui` (Chromium'da 9 oyunun uçtan uca
oynanışı, taşma, klavye, kalıcılık), Cloudflare security-audit-skill denetimi (`SECURITY_AUDIT.md`).

## Bilinen eksikler ve sonraki adımlar

| # | Konu | Neden | Öneri |
|---|---|---|---|
| 1 | Gerçek Brain Buddies oyunlarıyla birebir eşleme yok | Kanıt yok | `references/` klasörüne görüntü/video eklenirse kurallar ona göre ayarlanır |
| 2 | Kupa/rozet sistemi yok | Kaynakta "Pokale" var ama kuralları bilinmiyor | Oyun başına bronz/gümüş/altın skor eşikleri |
| 3 | Döndür ya da Aynala ekran okuyucuyla oynanamaz | Görev doğası gereği görsel | Seçenekleri hücre koordinatlarıyla tarif eden metin modu |
| 4 | Hafıza Izgarası sıra modunda, ezberleme sırasında duraklatma yanıp sönmeyi dondurur ama ekranı gizler | Tasarım tercihi | Devam edince gösterimi baştan oynatma |
| 5 | PWA / ana ekrana ekleme yok | Tek dosya `file://` ile zaten çevrimdışı | İstenirse manifest + service worker |
| 6 | Paketleyici yalnızca projenin kendi import biçimlerini destekler | Bilinçli sadelik | Biçim dışı kodda build açık hata verir |
