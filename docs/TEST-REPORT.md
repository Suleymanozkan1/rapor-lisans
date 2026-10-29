# Test raporu

Tarih: 2026-10-29. Ortam: Linux, Node.js 22.22.0, npm 10.9.4, Chromium (Playwright 1.63.0).
Son durum, deponun taze bir kopyasında (`git clone` + `npm ci`) README'deki komutlarla
çalıştırıldı.

## Sonuç

| Komut | Sonuç |
|---|---|
| `npm ci` | Başarılı, 0 bilinen açık (`npm audit`: 0 vulnerabilities) |
| `npm run lint` | Başarılı, 0 hata, 0 uyarı (`--max-warnings 0` ile de denendi) |
| `npm run typecheck` | Başarılı |
| `npm test` (Vitest) | **67/67 geçti**, 9 dosya |
| `npm run build` | Başarılı; public rotalar statik (○/●), `/admin/*` dinamik (ƒ); uyarı yok |
| `npm run test:e2e` (Playwright) | **37/37 geçti** (masaüstü Chrome 25, mobil Pixel 7 12) |
| `npm run scan:design` | Bulgu yok; 15 kontrast çiftinin hepsi WCAG AA üstünde (en düşük 7.37:1) |

Atlanan, silinen veya gevşetilen test yok.

## Birim ve entegrasyon testleri (`tests/unit`)

| Dosya | Kapsam |
|---|---|
| `markdown.test.ts` | Ham HTML/script/olay işleyicisi/iframe/style düşürülüyor; `javascript:`, `data:`, `vbscript:` URL'leri temizleniyor; dış bağlantı sertleştirme; içerik tablosu id eşleşmesi; DOM clobbering; `__next_f` ve şablon id'lerinin yeniden adlandırılması; dipnot bağlantıları; düz metinde HTML yorumları yok; kelime sayısı |
| `frontmatter.test.ts` | Gidiş-dönüş; ön bilgisiz dosya; `---js` motoru çalışmıyor; YAML alias ve özel etiket reddi; kapak yolu, kaynak URL'si, etiket doğrulaması |
| `slug-search-posts.test.ts` | Türkçe slug; ayrılmış slug'lar; taslak/gelecek tarih görünürlüğü; sayfalama; ilgili yazılar; etiket gruplama; Türkçe duyarsız arama ve filtreler |
| `auth.test.ts` | scrypt doğru/yanlış/bozuk hash; oturum token'ı sahteciliği, süre, kullanıcı, sürüm; CSRF bağlama; hız sınırı penceresi, eşzamanlı atomiklik, sıfırlama, taşırmada hesap kovasının korunması |
| `login.test.ts` | Doğru girişte çerez; yanlış kullanıcı adlarıyla sahibin kilitlenmemesi; eşzamanlı 20 denemeden tam 5'inin değerlendirilmesi; güvenilir IP yokken kilitlenmeme; doğru ve yanlış kullanıcı adının aynı biçimde sınırlanması; parola değişince oturumun düşmesi |
| `upload.test.ts` | İçerik imzası; güvenli dosya adı; SVG, sahte uzantı/MIME, eksik alt metin, boş ve büyük dosya reddi |
| `image-meta.test.ts` | Gerçek JPEG/PNG/WebP boyutları; EXIF/GPS, yorum, PNG metin/eXIf, WebP EXIF/XMP, JFXX, C2PA ve bilinmeyen parçaların silinmesi; yön bilgisinin korunması ve boyutların döndürülmesi; dosya sonu yükünün atılması; 3 MB saldırı dosyalarının 500 ms altında reddi; kesik dosyalar |
| `store.test.ts` | Yol geçişi reddi; yerel depo iyimser kilit ve çakışmada hiçbir şey yazmama; sahte GitHub API ile atomik çok dosyalı commit, yol eşleme, token'ın yalnızca başlıkta olması, eski SHA reddi, hızlı ileri sarılamayan ref çakışması, hata mesajında token olmaması; yazı yaşam döngüsü (taslak, yayın, revizyon, slug değişimi, çakışma, etiket yeniden adlandırma, silme ve işlem kaydı) |
| `seo.test.ts` | JSON-LD `</script>` kaçışı; metin kırpma |

## Uçtan uca testler (`tests/e2e`)

Test verisiyle (`tests/fixtures/content`: 12 yayımlanmış yazı, 1 taslak, 1 gelecek tarihli,
1 XSS denemesi) ayrı bir production build alınır ve `127.0.0.1:3100` üzerinde çalıştırılır.

**Public site** (masaüstü ve mobil):
ana sayfa (tek h1, `lang="tr"`, konsol hatası yok), güvenlik başlıkları ve ziyaretçiye çerez
yazılmaması, "İçeriğe geç" bağlantısı ve görünür odak, blog sayfalama (10 + 3, geçersiz sayfa
404), kategori ve etiket filtreleri (Türkçe etiket adı ile), yazı sayfası meta verisi (title,
canonical, description, og:type, doküman bloğu, içerik tablosu, kaynakça, BlogPosting JSON-LD,
başlık seviyeleri), taslak ve gelecek tarihli yazının hiçbir public çıktıda olmaması (sayfa,
site haritası, RSS, arama dizini, kategori), XSS yazısında betik çalışmaması, arama (Türkçe
büyük harf, kategori filtresi, boş sonuç, taslak metni aranamaması), 404, robots/sitemap/RSS,
hakkımda (Person JSON-LD), iletişim, gizlilik, tüm görsellerde alt metin, 390 px'te yatay
kaydırma olmaması.

**Yönetim paneli**:
anonim kullanıcının tüm panel rotalarından yönlendirilmesi ve taslak içeriğin sızmaması, sahte
oturum çerezinin reddi, genel hata mesajı ve 5 denemeden sonra hız sınırı, çerez bayrakları
(`__Host-`, HttpOnly, Secure, SameSite=Strict), `noindex` başlığı, çıkış; yazı yaşam döngüsü
(taslak, önizleme, Markdown'daki betiğin önizlemede düşmesi, yayınla, düzenle, revizyon artışı,
yayından kaldır, yanlış ve doğru onayla silme, işlem kaydı); iki sekmede eski kaydın
reddedilmesi; sahte ve eksik CSRF token'ının reddi (dosya değişmiyor); yakalanan bir Server
Action isteğinin çerezsiz ve sahte çerezle tekrarının reddi; kategori ekleme, kullanımdaki
kategorinin silinememesi; medya: SVG, sahte PNG, uzantı uyuşmazlığı reddi, PNG yükleme, GPS ve
HTML yükü eklenmiş JPEG'in temizlenip Chromium'da çözülebilmesi; ayarlar: `javascript:` URL
reddi, geçerli kayıt, paylaşım görselinin ardışık kayıtlarda korunması; etiket yeniden
adlandırma; panel sayfalarının 390 px'te kullanılabilirliği.

## Geliştirme sırasında testlerin yakaladığı hatalar

| Hata | Kök neden | Düzeltme |
|---|---|---|
| `/admin` sayfaları build'de statik üretiliyordu (runtime'da panel açılmazdı) | Env yokken `cookies()` çağrılmadan yönlendirme yapılıyordu | `cookies()` önce okunuyor; panel layout'unda `force-dynamic` |
| İşlem sonrası başarı mesajı kayboluyordu | `revalidatePath` sonrası form yeniden mount oluyordu | Başarılı işlemler sabit mesaj koduyla yönlendiriliyor |
| Etiketler Türkçe karakterlerini kaybediyordu ("yuksekte calisma") | Etiket slug olarak saklanıyordu | Görünen ad saklanıyor, URL türetiliyor |
| Ayarlar kaydı paylaşım görselini siliyordu | Form alanı adı uyuşmazlığı | Düzeltildi, e2e testi eklendi |
| Temiz kurulumda `typecheck` başarısızdı | Next'in ürettiği `PageProps` tipleri yoktu | Betik önce `next typegen` çalıştırıyor |
| Düz metin blokları birleştiriyordu ("Başlıkkalın") | `mdast-util-to-string` blokları ayırmıyor | Blok bazlı metin çıkarma |

## Çalıştırılamayan veya doğrulanamayan kontroller

- **Gerçek Vercel dağıtımı ve otomatik deploy:** Bu ortamda Vercel hesabı yok. Panelden
  commit sonrası build'in başladığı doğrulanamadı.
- **Gerçek GitHub API ile yazma:** Token verilmedi; GitHub deposu sahte bir API ile test edildi
  (`tests/unit/store.test.ts`).
- **Upstash yolu:** Yapılandırılmadı; yalnızca bellek içi sınırlayıcı test edildi.
- **Lighthouse / ekran okuyucu ile manuel erişilebilirlik testi:** Yapılmadı. Otomatik
  kontroller: tek h1, başlık sırası, alt metin, odak halkası, etiketler, kontrast, mobil taşma.
- **Firefox/Safari:** Yalnızca Chromium ile test edildi.
- **Dış tarayıcı betikleri:** `avoid-ai-design/scripts/detect.mjs` ve
  `security-audit-skill/validate-findings.cjs` bu ortamın izin denetimince reddedildi (bkz.
  ilgili raporlar).
