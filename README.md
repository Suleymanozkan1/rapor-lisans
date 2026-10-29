# Uğur Durak: İSG blogu ve yönetim paneli

İş sağlığı ve güvenliği uzmanı Uğur Durak için Türkçe kişisel blog ve yönetim paneli.
Next.js 16 (App Router, TypeScript) ile yazıldı, Vercel Hobby (ücretsiz) planında çalışacak
şekilde tasarlandı. Ücretli servis, abonelik veya veritabanı gerektirmez.

> **Önce okuyun: iki uyumluluk notu**
>
> 1. **Vercel Hobby yalnızca kişisel ve ticari olmayan kullanım içindir.** Vercel'in
>    [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)
>    sayfası (son güncelleme 2026-09-14) "bir ürün veya hizmetin satışını reklam etmeyi" ve
>    "siteyi oluşturmak/barındırmak için ödeme almayı" açıkça ticari kullanım sayar. Site ücretli
>    İSG danışmanlığı tanıtmak, müşteri kazanmak veya iş almak için kullanılacaksa Hobby planı
>    **uygun değildir**. Bu durumda seçenekler: Vercel Pro (ücretli), ya da site tamamen statik
>    olduğu için public kısmı statik barındırmaya taşımak (yönetim paneli sunucu gerektirir, ayrı
>    değerlendirilmeli). Emin değilseniz Vercel destek ekibine sorun. Bu proje şartları aşmaya
>    yönelik hiçbir yöntem içermez.
> 2. **İçerik deposu gizli (private) olmalı.** Taslaklar da Git'e commit edilir. Bu kod şu an
>    **public** bir GitHub deposunda (`rapor-lisans`). Public depoda taslaklar, silinen yazılar ve
>    commit geçmişi herkes tarafından okunabilir. Yayına almadan önce projeyi **private** bir
>    depoya taşıyın (Vercel Hobby private depoları destekler). Ayrıca bu depodaki `lisans.json`
>    başka bir uygulamanın kullandığı bir dosya gibi görünüyor; ona dokunulmadı, taşırken
>    kendi deposunda bırakın.

## İçindekiler

- [Mimari kısaca](#mimari-kısaca)
- [Yerel kurulum](#yerel-kurulum)
- [Komutlar](#komutlar)
- [Vercel'e dağıtım](#vercele-dağıtım)
- [GitHub entegrasyonu](#github-entegrasyonu)
- [Yayın akışı](#yayın-akışı)
- [Ücretsiz kotalar ve aşıldığında ne olur](#ücretsiz-kotalar-ve-aşıldığında-ne-olur)
- [Yedekleme ve geri yükleme](#yedekleme-ve-geri-yükleme)
- [İçerik taşıma](#içerik-taşıma)
- [Güvenlik](#güvenlik)
- [Dosya haritası](#dosya-haritası)

## Mimari kısaca

- **Public site statik üretilir.** Yazılar `content/posts/*.md` (YAML ön bilgi + Markdown),
  ayarlar `content/settings.json`, kategoriler `content/categories.json`, medya dizini
  `content/media.json`, görseller `public/uploads/`. Build sırasında yalnızca yayımlanmış ve
  yayın tarihi geçmiş yazılar sayfalara, site haritasına, RSS'e ve arama dizinine girer.
- **Yönetim paneli** (`/admin`) sunucu tarafında çalışır. Her kayıt, GitHub API üzerinden depoya
  bir commit atar; Vercel o commit'ten yeniden build alır ve site güncellenir. Sunucu
  fonksiyonunun dosya sistemi kalıcı veri için kullanılmaz.
- Ayrıntılar ve kararların gerekçesi: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
  Tasarım sistemi: [`DESIGN.md`](DESIGN.md).

## Yerel kurulum

Gereksinim: Node.js 20.9 veya üstü (`.nvmrc`: 22).

```bash
npm ci
cp .env.example .env.local
npm run hash-password          # parolayı sorar, ADMIN_PASSWORD_HASH değerini yazdırır
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SESSION_SECRET
```

`.env.local` içinde en az şunları doldurun: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`,
`SESSION_SECRET`. Yerelde `CONTENT_STORE=local` yazarsanız panel değişiklikleri doğrudan
çalışma klasörüne yazar (GitHub gerekmez).

```bash
npm run dev             # http://localhost:3000, panel: http://localhost:3000/admin
npm run dev:test-data   # otomatik testlerin kullandığı veriyle (XSS denemesi dahil)
```

### Örnek (demo) içerik

`content/posts/` altında sitenin görünümünü göstermek için hazırlanmış **9 örnek yazı ve 1 taslak**
vardır. Her birinin ön bilgisinde `sample: true` bulunur ve yazı sayfasında "Örnek içerik" notu
gösterilir. Yazılar genel bilgilendirme amaçlıdır; Uğur Durak tarafından gözden geçirilmemiştir.
Yayına almadan önce her yazıyı panelden okuyun: düzeltip kaydettiğinizde not kalkar, istemediğiniz
yazıyı silin. Kapak görselleri `public/uploads/2026/` altındadır (lisanslar:
`public/images/CREDITS.md`).

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build (gerçek `content/` ile) |
| `npm start` | Build'i yerelde çalıştırır |
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm test` | Birim + entegrasyon testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright). Test verisiyle ayrı bir build (`.next-e2e`) alır, `localhost:3100` üzerinde çalıştırır. İlk kurulumda `npx playwright install chromium` gerekebilir. |
| `npm run scan:design` | Tasarım denetimi (AI şablon kalıpları + WCAG kontrastı) |
| `npm run hash-password` | Yönetici parolası için scrypt hash üretir |

## Vercel'e dağıtım

1. Projeyi **private** bir GitHub deposuna koyun (yukarıdaki nota bakın).
2. Vercel'de **Add New > Project**, depoyu seçin. Framework: Next.js (otomatik algılanır).
   Build komutu ve çıktı ayarlarını değiştirmeyin.
3. **Settings > Environment Variables** altında (Production ve Preview için) şunları girin:
   `NEXT_PUBLIC_SITE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`,
   `CONTENT_STORE=github`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`.
4. Deploy edin. `https://<alan-adınız>/admin` adresinden giriş yapın.
5. Vercel'in Git entegrasyonu açık olmalı (varsayılan): `GITHUB_BRANCH` dalına gelen her commit
   yeni bir production build başlatır.

> **Doğrulanmadı:** Bu ortamda bir Vercel hesabına erişim olmadığı için panelden atılan commit'in
> otomatik deploy tetiklediği gerçek bir Vercel projesinde test edilemedi. İlk kurulumdan sonra
> panelden bir taslak kaydedip Vercel **Deployments** sekmesinde yeni build'in başladığını kontrol
> edin.

## GitHub entegrasyonu

Panel, içeriği GitHub'ın Git Data API'siyle (blob, tree, commit, ref) tek commit'te yazar.

1. GitHub: **Settings > Developer settings > Personal access tokens > Fine-grained tokens >
   Generate new token**.
2. **Repository access:** *Only select repositories* ve yalnızca sitenin deposu.
3. **Permissions > Repository permissions > Contents: Read and write.** Başka izin vermeyin
   (Metadata: Read otomatik gelir).
4. Bir son kullanma tarihi seçin ve takviminize yenileme hatırlatması koyun.
5. Token'ı yalnızca Vercel ortam değişkeni `GITHUB_TOKEN` olarak girin. Repoya, `.env.example`'a
   veya bir sohbete yazmayın. Token tarayıcıya gönderilmez ve loglanmaz.

Token yoksa veya geçersizse panel çalışıyormuş gibi davranmaz: üstte "İçerik deposu
yapılandırılmamış" uyarısı çıkar, kayıt işlemleri açık bir hata mesajıyla reddedilir.

## Yayın akışı

1. Panelde yazıyı oluşturun; **Taslak** olarak kaydedin. Taslaklar sitede, site haritasında,
   RSS'te ve aramada görünmez (testlerle doğrulanır). **Kaydet ve önizle** ile yazıyı sitedeki
   şablonla görün.
2. **Yayınla**: yazı `status: published` olur, ilk yayın tarihi kaydedilir.
3. Yaklaşık bir dakika içinde Vercel build'i biter ve yazı yayına girer.
4. Yayındaki yazıyı her düzenlediğinizde revizyon numarası bir artar ve "Son güncelleme" tarihi
   yazılır (isterseniz tarihi elle seçebilirsiniz).
5. Aynı yazı iki sekmede açıkken eski sekmeden kayıt reddedilir; değişiklik kaybolmaz.

Gelecek tarihli yayın tarihi olan yazı, o tarihten sonraki ilk build'de görünür; zamanlanmış
otomatik build yoktur.

## Ücretsiz kotalar ve aşıldığında ne olur

Değerler 2026-10-29 tarihinde resmî belgelerden okundu; değişebilir, kendiniz kontrol edin.

| Hizmet | Ücretsiz kota (aylık) | Bu proje nasıl kullanır | Aşılınca |
|---|---|---|---|
| Vercel Hobby: Fast Data Transfer | 100 GB | Statik sayfalar, görseller | Hobby'de ek ücret yok; özellik 30 gün dolana kadar durdurulur ([plans/hobby](https://vercel.com/docs/plans/hobby)) |
| Vercel Hobby: Function Invocations | 1.000.000 | Yalnızca panel sayfaları ve işlemleri | Aynı |
| Vercel Hobby: Active CPU | 4 saat | Panel; giriş (scrypt ~0,4 s, bu ortamda ölçüldü) | Aynı |
| Vercel Hobby: Deployments | 100 / gün | Panelde her kayıt = 1 commit = 1 build | Günlük sınırda yeni deploy başlamaz; site son hâliyle yayında kalır |
| Vercel Image Optimization | 5.000 dönüşüm | **Kullanılmıyor** (görseller olduğu gibi servis edilir) | — |
| GitHub REST API | Token başına saatlik sınır (GitHub belgelerine bakın) | Panelde sayfa başına birkaç istek | API 403/429 döner; panel "API kotası doldu" hatası gösterir, kayıt yapılmaz |
| Upstash Redis (isteğe bağlı) | Sağlayıcının güncel ücretsiz planı | Yalnızca başarısız giriş sayaçları | İstek başarısız olursa kod bellek içi sınıra döner |

Uygulama hiçbir yerde ücretli kullanıma otomatik geçmez: Hobby planında ödeme yöntemi yoktur,
kota dolunca Vercel ilgili özelliği durdurur. Panel, GitHub veya ağ hatasında işlemi yapmaz ve
nedenini gösterir.

İpucu: Günlük deploy sınırını zorlamamak için uzun bir yazıyı panelde parça parça kaydetmek
yerine yerelde hazırlayıp bir kez yapıştırın.

## Yedekleme ve geri yükleme

Tüm içerik Git'tedir; deponun kendisi yedektir.

- **Tam yedek:** `git clone --mirror git@github.com:<sahip>/<depo>.git` (tüm geçmiş). Düzenli
  olarak başka bir yere (harici disk, başka bir hesap) kopyalayın.
- **Yalnızca içerik:** `content/` ve `public/uploads/` klasörlerini zip'leyin.
- **Silinen yazıyı geri getirme:** Panel > İşlem kayıtları'nda silme commit'ini bulun, sonra
  `git log --diff-filter=D -- content/posts/<slug>.md` ile commit'i bulup
  `git checkout <commit>^ -- content/posts/<slug>.md` ve commit + push.
- **Bir değişikliği geri alma:** `git revert <commit>` ve push. Vercel otomatik yeniden build alır.
- **Panel çalışmıyorsa:** Dosyaları doğrudan GitHub web arayüzünden düzenleyebilirsiniz; biçim
  aynıdır.

## İçerik taşıma

- Yazı biçimi standart "front matter + Markdown"dır; Hugo, Astro, Jekyll gibi araçlara az
  değişiklikle aktarılabilir. Alanlar: `title`, `excerpt`, `status`, `createdAt`, `publishedAt`,
  `updatedAt`, `category`, `tags`, `cover {src, alt}`, `seoTitle`, `seoDescription`,
  `references [{title, url}]`, `revision`.
- Başka bir platformdan içe aktarmak için yazıları bu biçimde `content/posts/` altına koyup commit
  edin; build hatalı bir dosyada adını ve hatalı alanı yazarak durur.
- Görselleri `public/uploads/<yıl>/` altına koyun ve `content/media.json`'a `{src, alt, width,
  height, bytes, uploadedAt}` kaydı ekleyin (alt metin zorunlu).

## Güvenlik

- Parola: scrypt (N=2^17, r=8, p=1), yalnızca hash ortam değişkeninde.
- Oturum: HMAC-SHA256 imzalı, 8 saat geçerli, `__Host-` önekli, HttpOnly, Secure,
  SameSite=Strict çerez. `SESSION_VERSION` artırılınca veya parola değiştirilince tüm oturumlar
  düşer.
- Her panel işlemi sunucuda oturum + oturuma bağlı CSRF token'ı + Origin kontrolü yapar;
  `proxy.ts` yalnızca ilk kapıdır.
- Giriş hız sınırı: IP başına 15 dakikada 5 deneme (parola kontrolünden önce atomik sayılır),
  girilen kullanıcı adı başına 20 deneme. Kullanıcı adını tahmin edilemez seçin. Sınır
  varsayılan olarak her sunucu örneğinin belleğindedir (sunucusuz ortamda kısmi koruma);
  paylaşılan sayaç için isteğe bağlı Upstash değişkenleri. `x-forwarded-for` yalnızca Vercel'de
  veya `TRUST_PROXY=1` ile kullanılır.
- Yüklenen görsellerden konum/kamera bilgisi (EXIF, XMP, yorumlar) silinir; yalnızca yön
  bilgisi korunur.
- Markdown'daki ham HTML işlenmez; çıktı ayrıca rehype-sanitize ile temizlenir. Yalnızca http(s),
  mailto ve tel bağlantıları kalır.
- Yükleme: yalnızca JPEG/PNG/WebP, gerçek içerik imzası + uzantı + MIME uyumu, 3 MB, 6000 px
  sınırı, güvenli dosya adı, alt metin zorunlu. SVG kabul edilmez.
- İçerik Güvenlik Politikası (CSP), `X-Frame-Options: DENY`, `nosniff`, HSTS, sıkı
  `Referrer-Policy` ve `Permissions-Policy`.
- Denetim raporu: [`docs/security-audit-report.md`](docs/security-audit-report.md).
- Test raporu: [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md). Tasarım denetimi:
  [`docs/ai-slop-report.md`](docs/ai-slop-report.md).

## Dosya haritası

```
content/                 İçerik (Git'te). posts/*.md, settings.json, categories.json, media.json
public/uploads/          Yüklenen görseller
src/app/(site)/          Public sayfalar (statik)
src/app/admin/           Yönetim paneli (sunucu tarafı), actions.ts = tüm kayıt işlemleri
src/lib/                 İçerik okuma, Markdown, oturum, yükleme doğrulama, depo (GitHub/yerel)
src/proxy.ts             /admin için ilk kapı (Next.js 16'da middleware'in yeni adı)
tests/unit/              Vitest testleri
tests/e2e/               Playwright testleri
tests/fixtures/content/  Otomatik testlerin verisi (dev:test-data ile de açılır)
docs/                    Mimari notlar, test raporu, güvenlik ve tasarım denetim raporları
```
