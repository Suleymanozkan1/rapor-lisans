# Asset kaynakları ve lisansları

Projede **hiç dış asset dosyası yoktur** (görsel, ses, font, ikon dosyası yok).

| Tür | Nasıl üretiliyor | Kaynak | Lisans |
|---|---|---|---|
| Şekiller (daire, kare, üçgen, yıldız, baklava, altıgen) | Kodla çizilen SVG (`src/ui/svg.js`) | Bu proje | Proje ile aynı |
| Renk desenleri (çizgili, noktalı, kareli, yarım, içi boş) | SVG `pattern` / `linearGradient` | Bu proje | Proje ile aynı |
| Oklar, ızgara parçaları, grafikler | Kodla çizilen SVG (`svg.js`, `app.js`) | Bu proje | Proje ile aynı |
| Oyun ikonları (▦ ◈ ∑ ◐ ⇄ ⊻ ⋯ Aa ⟳) | Unicode karakterleri | Unicode standardı | Serbest |
| Sesler | Web Audio osilatörleriyle sentez (`src/ui/audio.js`) | Bu proje | Proje ile aynı |
| Yazı tipleri | Cihazın sistem yazı tipleri (`ui-rounded`, `system-ui`, `ui-monospace`) | İşletim sistemi | Yüklenmez, dağıtılmaz |
| Kelime listeleri | Yaygın Türkçe adlar (`src/games/wordSort.js`) | Bu proje | Proje ile aynı |

Web yazı tipi (ör. Google Fonts) bilinçli olarak kullanılmadı: oyun çevrimdışı çalışmalı ve hiçbir dış
sunucuya istek yapmamalı.

"Brain Buddies" adı ve logosu wooga'ya aittir; oyunda kullanılmaz. Arayüz adı "Zihin Molası"dır.
