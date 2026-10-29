import { test, expect, type Page } from '@playwright/test'

const SECRET_MARKERS = ['TASLAK-GIZLI', 'gizli-taslak', 'Gizli taslak', 'ILERI-TARIHLI', 'ileri-tarihli', 'taslak-etiketi', 'Taslak etiketi']

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
  await expect(page.locator('h1')).toHaveText('Uğur Durak')
  await expect(page.getByRole('heading', { name: 'Konu alanları' })).toBeVisible()
  await expect(page.locator('.post-card')).toHaveCount(6)
  await noHorizontalScroll(page)
  expect(errors).toEqual([])
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
  await expect(page).toHaveTitle('Örnek yazı 3 | Uğur Durak')
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
  for (const url of ['/', '/blog', '/blog/sayfa/2', '/sitemap.xml', '/rss.xml', '/search-index.json', '/kategori/mevzuat']) {
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
  for (const url of ['/', '/blog', '/blog/ornek-yazi-1', '/hakkimda']) {
    await page.goto(url)
    expect(await page.locator('img:not([alt])').count(), url).toBe(0)
  }
})
