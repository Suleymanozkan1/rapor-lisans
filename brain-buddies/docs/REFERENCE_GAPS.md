# REFERENCE_GAPS — Referans kanıtları ve boşluklar

Etiketler: **GÖZLEMLENDİ** (oynanış/ekran görüntüsünde görüldü), **KAYNAKTA DOĞRULANDI**
(yazılı bir kaynakta geçiyor), **TAHMİN** (makul varsayım), **BİLİNMİYOR**.

## 1. Erişilen kaynaklar

| Kaynak | Durum |
|---|---|
| Depodaki `references/` klasörü | Yok |
| Kullanıcının sağladığı ekran görüntüsü / video | Yok |
| Brain Buddies kaynak kodu | Yok (kapalı kaynak Facebook uygulamasıydı) |
| deutsche-startups.de, "wooga wiegt Gehirne" (14.07.2009) | Okundu |
| openpr.de basın bülteni "Brain Buddies: 1 Million Nutzer in drei Wochen" | Sayfa 403 döndü; yalnızca arama özeti görüldü |
| Oynanış videosu / web arşivi | Aranmadı veya bulunamadı; oyun Flash tabanlıydı ve artık çalışmıyor (TAHMİN) |

Hiçbir erişim engeli aşılmaya çalışılmadı.

## 2. Bulgular

| # | Bulgu | Etiket | Kaynak |
|---|---|---|---|
| 1 | Geliştirici Berlin'deki wooga; Facebook uygulaması, Temmuz 2009 başında 8 dilde çıktı | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 2 | Oyuncu, "az ya da çok zorlayıcı" küçük oyunlarda arkadaşlarıyla yarışır | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 3 | Big Brain Academy ve "Who has the biggest brain?" beyin testine ilham oldu | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 4 | Bir oyun beş dakikadan uzun sürmemeli (wooga'nın genel ilkesi) | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 5 | Arkadaş skor tabloları (Hitlisten), kupalar (Pokale), "hemen önündeki arkadaş" ipuçları | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 6 | Grafikler çekici, kullanıcı yönlendirmesi basit | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 7 | 8 mini oyun vardı, 4 tane daha geliştiriliyordu | KAYNAKTA DOĞRULANDI (yalnızca arama özetinden) | openpr.de |
| 8 | 3 haftada 1 milyon kullanıcı, Facebook'ta ilk 40 | KAYNAKTA DOĞRULANDI (yalnızca arama özetinden) | openpr.de |
| 9 | Sanal eşya ve ileride premium hesap planı | KAYNAKTA DOĞRULANDI | deutsche-startups.de |
| 10 | Mini oyunların adları ve kuralları | **BİLİNMİYOR** | — |
| 11 | Tur süresi, oturum süresi, geri sayım | **BİLİNMİYOR** (yalnızca "≤ 5 dk" ilkesi) | — |
| 12 | Puan formülü, seri/hız bonusu | **BİLİNMİYOR** | — |
| 13 | Zorluk eğrisi | **BİLİNMİYOR** | — |
| 14 | Ekran akışı, menü, sonuç ekranı | **BİLİNMİYOR** | — |
| 15 | Ses ve animasyon geri bildirimi | **BİLİNMİYOR** | — |
| 16 | Kategoriler Big Brain Academy'ye benzer (düşünme, hafıza, hesap, analiz, tanıma) | TAHMİN (bulgu 3'ten) | — |
| 17 | Kısa, zamanlı oturumlar (≈ 1 dk / oyun) | TAHMİN (bulgu 4 ve 3'ten) | — |

Not: Bazı arama sonuçları başka bir oyunla, "Who Has The Biggest Brain?" ile ilgiliydi.
O oyunun kategorileri Brain Buddies'e mal edilmedi.

## 3. Bu boşluklar uygulamayı nasıl etkiledi

- Brain Buddies'in hiçbir mini oyunu "birebir" yeniden kurulmadı; kuralları bilinmiyor.
  Oyunlar master prompt'taki kategorilere ve özgün oyun tanımlarına göre tasarlandı.
- Bilinen tek somut davranışlar uygulandı: kısa oyunlar (varsayılan 60 sn, en fazla 90 sn),
  basit menü akışı, kişisel rekorlar.
- Tek oyunculu kişisel kullanım nedeniyle arkadaş skor tablosu ve "hemen önündeki arkadaş"
  ipucu, **kendi rekorunla yarış** biçimine çevrildi: sonuç ekranında rekora kalan fark
  gösterilir. Kupaların yerine her oyun için rozet seviyeleri yok; bu bir sonraki adım
  olarak `IMPLEMENTATION_PLAN.md`'de duruyor.
- Tüm süre, puan ve zorluk değerleri **TAHMİN / özgün tasarım** olarak `GAMEPLAY_SPEC.md`'de
  belgelendi ve tek bir yerden (`src/games/*` tanımları ve `src/core/score.js`) değiştirilebilir.

## 4. Kullanıcıdan alınabilecek kanıt

Eğer ekran görüntüsü, oynanış videosu veya o döneme ait notların varsa
`brain-buddies/references/` klasörüne koy. Hangi mini oyunun neye benzediğini görürsem
o oyunun kurallarını, süresini ve puanını ona göre ayarlayabilirim.
