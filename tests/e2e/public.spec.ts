import { test, expect, type Page } from '@playwright/test'

const SECRET_MARKERS = ['TASLAK-URUN-GIZLI', 'gizli-taslak-urun', 'TASLAK-GIZLI', 'gizli-taslak', 'Gizli taslak', 'ILERI-TARIHLI', 'ileri-tarihli', 'taslak-etiketi', 'Taslak etiketi']

function trackConsole(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('home page renders with one h1, topics and latest posts', async ({ page }) => {
  const errors = trackConsole(page)
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText('Güvenli Çalış')
  await expect(page.locator('.hero__motto li')).toHaveText(['Güvensiz çalışma = Risk', 'Güvenli çalışma = Hayat'])
  await expect(page.locator('.hero').getByRole('link', { name: 'Uğur Durak' })).toHaveAttribute('href', '/hakkimda')
  await expect(page.getByRole('heading', { name: 'Konu alanları' })).toBeVisible()
  await expect(page.locator('.post-card')).toHaveCount(6)
  await expect(page.locator('.product-card')).toHaveCount(2)
  await expect(page.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Mağaza' })).toBeVisible()
  await noHorizontalScroll(page)
  expect(errors).toEqual([])
})

test('home slider: intro first, then posts and products; controls, pause and auto-advance', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.goto('/')
  const slides = page.locator('.hero-slide')
  // Intro + 3 posts + 2 published products (the fixtures have two).
  await expect(slides).toHaveCount(6)
  await expect(slides.nth(0)).toHaveClass(/is-active/)
  await expect(page.locator('.hero-slider')).toHaveAttribute('aria-roledescription', 'carousel')
  // Hidden slides are inert: their links are not reachable.
  expect(await page.locator('.hero-slide[inert] a').count()).toBeGreaterThan(0)
  expect(await page.locator('.hero-slide.is-active[inert]').count()).toBe(0)
  await expect(slides.nth(2)).toContainText('Mağaza')

  await page.getByRole('button', { name: 'Sonraki' }).click()
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await expect(slides.nth(1)).toContainText('Gündem')
  await page.getByRole('button', { name: /^3\. Mağaza:/ }).click()
  await expect(slides.nth(2)).toHaveClass(/is-active/)
  await page.getByRole('button', { name: 'Önceki' }).click()
  await expect(slides.nth(1)).toHaveClass(/is-active/)

  await page.getByRole('button', { name: 'Otomatik geçişi durdur' }).click()
  await expect(page.getByRole('button', { name: 'Otomatik geçişi başlat' })).toBeVisible()
  await expect(page.locator('.story__fill--run')).toHaveCount(0)
  await page.getByRole('button', { name: 'Otomatik geçişi başlat' }).click()
  await expect(page.locator('.story__fill--run')).toHaveCount(1)
  // The "next" preview names what comes after the current slide.
  await expect(page.locator('.hero-slider__next')).toContainText('Sıradaki')

  // Auto-advance once the pointer and focus leave the slider.
  await page.locator('h2', { hasText: 'Son yazılar' }).focus().catch(() => {})
  await page.mouse.move(5, 5)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await expect(slides.nth(2)).toHaveClass(/is-active/, { timeout: 10_000 })
})

test('home slider does not rotate when reduced motion is preferred', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.locator('.story__fill--run')).toHaveCount(0)
  await page.waitForTimeout(1500)
  await expect(page.locator('.hero-slide').nth(0)).toHaveClass(/is-active/)
  await ctx.close()
})

test('security headers are set', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['content-security-policy']).toContain("object-src 'none'")
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(h['x-powered-by']).toBeUndefined()
  expect(res.headers()['set-cookie']).toBeUndefined()
})

test('skip link is the first focusable element and focus is visible', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText('İçeriğe geç')
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(outline).not.toBe('none')
})

test('blog list paginates and filters by category and tag', async ({ page }) => {
  await page.goto('/blog')
  await expect(page.locator('h1')).toHaveText('Yazılar')
  await expect(page.locator('.post-card')).toHaveCount(10)
  await page.getByRole('link', { name: 'Sonraki sayfa' }).click()
  await expect(page).toHaveURL(/\/blog\/sayfa\/2$/)
  await expect(page.locator('.post-card')).toHaveCount(3)
  await expect(page.getByText('Sayfa 2 / 2')).toBeVisible()
  expect((await page.request.get('/blog/sayfa/3')).status()).toBe(404)
  expect((await page.request.get('/blog/sayfa/abc')).status()).toBe(404)

  await page.goto('/blog')
  await page.getByRole('navigation', { name: 'Kategoriler' }).getByRole('link', { name: 'Mevzuat' }).click()
  await expect(page).toHaveURL(/\/kategori\/mevzuat$/)
  await expect(page.locator('h1')).toHaveText('Mevzuat')
  for (const row of await page.locator('.post-card__cat').allTextContents()) expect(row).toBe('Mevzuat')

  await page.goto('/blog/ornek-yazi-1')
  await page.getByRole('link', { name: 'Yüksekte çalışma' }).click()
  await expect(page).toHaveURL(/\/etiket\/yuksekte-calisma$/)
  await expect(page.locator('h1')).toHaveText('Etiket: Yüksekte çalışma')
  expect((await page.request.get('/etiket/kkd')).status()).toBe(200)
  expect((await page.request.get('/etiket/taslak-etiketi')).status()).toBe(404)
})

test('post page has metadata, document block, ToC, references and JSON-LD', async ({ page }) => {
  const errors = trackConsole(page)
  await page.goto('/blog/ornek-yazi-3')
  await expect(page).toHaveTitle('Örnek yazı 3 | Güvenli Çalış')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'http://localhost:3100/blog/ornek-yazi-3')
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', 'Test verisi özet 3.')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('.doc-control')).toContainText('Revizyon')
  await expect(page.getByRole('navigation', { name: 'Bu yazıda' }).getByRole('link')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Kaynakça' })).toBeVisible()
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)
  expect(ld['@type']).toBe('BlogPosting')
  expect(ld.headline).toBe('Örnek yazı 3')
  expect(ld.author.name).toBe('Uğur Durak')
  // Heading order: h1 then h2s, no skipped levels before the first h2.
  const levels = await page.locator('main h1, main h2, main h3').evaluateAll((els) => els.map((e) => Number(e.tagName[1])))
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
  await noHorizontalScroll(page)
  expect(errors).toEqual([])
})

test('drafts and future posts never reach public output', async ({ request }) => {
  for (const url of ['/blog/gizli-taslak', '/blog/ileri-tarihli']) expect((await request.get(url)).status(), url).toBe(404)
  expect((await request.get('/magaza/gizli-taslak-urun')).status()).toBe(404)
  for (const url of ['/', '/blog', '/blog/sayfa/2', '/sitemap.xml', '/rss.xml', '/search-index.json', '/kategori/mevzuat', '/magaza', '/magaza/test-kontrol-listesi']) {
    const body = await (await request.get(url)).text()
    for (const m of SECRET_MARKERS) expect(body, `${url} contains ${m}`).not.toContain(m)
  }
})

test('stored XSS in a post does not execute', async ({ page }) => {
  const dialogs: string[] = []
  page.on('dialog', (d) => {
    dialogs.push(d.message())
    void d.dismiss()
  })
  await page.goto('/blog/xss-denemesi')
  await expect(page.locator('h1')).toContainText('<script>alert(1)</script>')
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  const prose = page.locator('.prose')
  expect(await prose.locator('script, iframe, [onerror]').count()).toBe(0)
  expect(await prose.locator('a[href^="javascript:"]').count()).toBe(0)
  await prose.getByText('tıkla').click().catch(() => {})
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  expect(dialogs).toEqual([])
})

test('store lists published products; a product for sale links to its own checkout', async ({ page }) => {
  const errors = trackConsole(page)
  await page.goto('/magaza')
  await expect(page.locator('h1')).toHaveText('Mağaza')
  await expect(page.locator('.product-card')).toHaveCount(2)
  await expect(page.locator('.product-card').first()).toContainText('₺149,90')
  await expect(page.locator('.product-card').nth(1)).toContainText('Örnek ürün')
  await expect(page.getByRole('link', { name: 'Satış ve iade koşulları' }).first()).toHaveAttribute('href', '/satis-bilgileri')
  await noHorizontalScroll(page)

  await page.locator('.product-card').first().click()
  await expect(page).toHaveURL(/\/magaza\/test-kontrol-listesi$/)
  await expect(page.locator('h1')).toHaveText('Test kontrol listesi')
  await expect(page.getByRole('link', { name: 'Satın al' })).toHaveAttribute('href', '/magaza/test-kontrol-listesi/satin-al')
  await expect(page.locator('.product-features li')).toHaveText(['Birinci madde', 'İkinci madde'])
  // No third-party purchase links any more: outbound links are only the social profiles.
  const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hostname))
  for (const h of hrefs) expect(['localhost', 'www.instagram.com']).toContain(h)
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)
  expect(ld['@type']).toBe('Product')
  expect(ld.offers).toMatchObject({ price: '149.90', priceCurrency: 'TRY', url: 'http://localhost:3100/magaza/test-kontrol-listesi' })
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await noHorizontalScroll(page)
  expect(errors).toEqual([])
})

test('sample product is labelled, not for sale, noindex and kept out of the sitemap', async ({ page, request }) => {
  await page.goto('/magaza/test-ornek-urun')
  await expect(page.locator('.sample-notice')).toContainText('Örnek ürün')
  await expect(page.locator('.buy-box__price')).toHaveText('Fiyat yakında')
  await expect(page.locator('.buy-box__soon')).toHaveText('Örnek ürün: satın alınamaz.')
  await expect(page.getByRole('link', { name: 'Satın al' })).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
  await page.goto('/magaza/test-ornek-urun/satin-al')
  await expect(page.getByRole('status')).toContainText('satışta değil')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<loc>http://localhost:3100/magaza</loc>')
  expect(sitemap).toContain('<loc>http://localhost:3100/magaza/test-kontrol-listesi</loc>')
  expect(sitemap).toContain('<loc>http://localhost:3100/satis-bilgileri</loc>')
  expect(sitemap).not.toContain('test-ornek-urun')
})

test('sales terms page shows the seller identity', async ({ page }) => {
  await page.goto('/satis-bilgileri')
  await expect(page.locator('h1')).toHaveText('Satış ve iade koşulları')
  for (const t of ['Test Satıcı Ltd. Şti.', '0123456789000017', '1234567890', 'Kadıköy', 'İstanbul Ticaret Odası', 'madde 15']) await expect(page.locator('main')).toContainText(t)
  await noHorizontalScroll(page)
})

test('stored XSS in a product description does not execute', async ({ page }) => {
  await page.goto('/magaza/test-kontrol-listesi')
  const prose = page.locator('.prose')
  await expect(prose).toContainText('Test verisi ürün gövdesi.')
  expect(await prose.locator('script, [onerror]').count()).toBe(0)
  expect(await prose.locator('a[href^="javascript:"]').count()).toBe(0)
  await prose.getByText('tıkla').click().catch(() => {})
  expect(await page.evaluate(() => (window as unknown as { __urunXss?: number }).__urunXss)).toBeUndefined()
})

test('search: Turkish-insensitive query, category filter, empty state', async ({ page }) => {
  await page.goto('/ara')
  await page.getByLabel('Aranacak kelime').fill('KORKULUK')
  await page.getByRole('button', { name: 'Ara' }).click()
  await expect(page).toHaveURL(/q=KORKULUK/)
  await expect(page.getByText('12 sonuç bulundu.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sonraki sayfa' })).toBeVisible()

  await page.goto('/ara?q=yazi&kategori=mevzuat')
  await expect(page.getByText(/sonuç bulundu/)).toBeVisible()
  const titles = await page.locator('.post-card__cat').allTextContents()
  expect(titles.length).toBeGreaterThan(0)
  for (const t of titles) expect(t).toBe('Mevzuat')

  await page.goto('/ara?q=bulunmayan-kelime-xyz')
  await expect(page.getByText('Sonuç bulunamadı.')).toBeVisible()

  await page.goto('/ara?q=TASLAK-GIZLI')
  await expect(page.getByText('Sonuç bulunamadı.')).toBeVisible()
})

test('404 page', async ({ page }) => {
  const res = await page.goto('/olmayan-sayfa')
  expect(res?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('Sayfa bulunamadı')
})

test('robots, sitemap and RSS are valid', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toMatch(/Disallow: \/admin/)
  expect(robots).toContain('Sitemap: http://localhost:3100/sitemap.xml')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<loc>http://localhost:3100/blog/ornek-yazi-1</loc>')
  expect(sitemap).not.toContain('/admin')
  const rss = await request.get('/rss.xml')
  expect(rss.headers()['content-type']).toContain('application/rss+xml')
  const xml = await rss.text()
  expect(xml).toContain('<rss version="2.0"')
  expect(xml).toContain('&lt;script&gt;')
  expect(xml).not.toContain('<script>')
})

test('about, contact and privacy pages', async ({ page }) => {
  await page.goto('/hakkimda')
  await expect(page.locator('h1')).toHaveText('Hakkımda')
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)
  expect(ld['@type']).toBe('Person')
  expect(ld.name).toBe('Uğur Durak')
  await page.goto('/iletisim')
  await expect(page.getByRole('link', { name: 'ornek@example.com' })).toHaveAttribute('href', 'mailto:ornek@example.com')
  await page.goto('/gizlilik')
  await expect(page.locator('h1')).toContainText('KVKK')
  await noHorizontalScroll(page)
})

test('all images have alt attributes', async ({ page }) => {
  for (const url of ['/', '/blog', '/blog/ornek-yazi-1', '/hakkimda', '/magaza', '/magaza/test-kontrol-listesi']) {
    await page.goto(url)
    expect(await page.locator('img:not([alt])').count(), url).toBe(0)
  }
})
