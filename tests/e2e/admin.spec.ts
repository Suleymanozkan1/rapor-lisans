import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const work = path.resolve(import.meta.dirname, '../../.e2e')
const creds = () => JSON.parse(readFileSync(path.join(work, 'credentials.json'), 'utf8')) as { username: string; password: string }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

/**
 * Each test gets its own client IP so the login limiter does not leak between
 * tests (random, because Playwright restarts the worker after a failure).
 */
function freshIp() {
  const b = () => Math.floor(Math.random() * 254) + 1
  return `10.${b()}.${b()}.${b()}`
}

async function login(page: Page, password = creds().password) {
  await page.goto('/admin/giris')
  await page.getByLabel('Kullanıcı adı').fill(creds().username)
  await page.getByLabel('Parola').fill(password)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  if (password === creds().password) await page.waitForURL(/\/admin$/)
}

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': freshIp() })
})

test('anonymous users are redirected from every admin route', async ({ request }) => {
  for (const url of ['/admin', '/admin/yazilar', '/admin/yazilar/yeni', '/admin/yazilar/gizli-taslak', '/admin/yazilar/gizli-taslak/onizleme', '/admin/ayarlar', '/admin/medya', '/admin/kayitlar']) {
    const res = await request.get(url, { maxRedirects: 0 })
    expect(res.status(), url).toBeGreaterThanOrEqual(300)
    expect(res.status(), url).toBeLessThan(400)
    expect(res.headers()['location'], url).toContain('/admin/giris')
    expect(await res.text()).not.toContain('TASLAK-GIZLI')
  }
})

test('a forged session cookie does not grant access', async ({ page, context }) => {
  await context.addCookies([
    { name: '__Host-isg_admin', value: 'eyJzdWIiOiJ5b25ldGljaSJ9.forged', url: 'https://127.0.0.1:3100', secure: true },
    { name: 'isg_admin', value: 'eyJzdWIiOiJ5b25ldGljaSJ9.forged', url: 'http://127.0.0.1:3100' },
  ])
  await page.goto('/admin/yazilar/gizli-taslak/onizleme')
  await expect(page).toHaveURL(/\/admin\/giris$/)
  await expect(page.locator('body')).not.toContainText('TASLAK-GIZLI')
})

test('wrong password shows a generic error; repeated failures are rate limited', async ({ page }) => {
  await login(page, 'yanlis-parola')
  await expect(page.locator('main').getByRole('alert')).toHaveText('Kullanıcı adı veya parola hatalı.')
  for (let i = 0; i < 4; i++) {
    await page.getByLabel('Parola').fill('yanlis-parola')
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await expect(page.locator('main').getByRole('alert')).toBeVisible()
  }
  await page.getByLabel('Kullanıcı adı').fill(creds().username)
  await page.getByLabel('Parola').fill(creds().password)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('Çok fazla başarısız deneme')
  await expect(page).toHaveURL(/\/admin\/giris$/)
})

test('login sets a hardened session cookie; logout clears it', async ({ page, context }) => {
  await login(page)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.locator('h1')).toHaveText('Özet')
  const cookie = (await context.cookies()).find((c) => c.name.includes('isg_admin'))!
  expect(cookie.name).toBe('__Host-isg_admin')
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.secure).toBe(true)
  expect(cookie.sameSite).toBe('Strict')
  expect(cookie.path).toBe('/')
  const res = await page.request.get('/admin')
  expect(res.headers()['x-robots-tag']).toContain('noindex')
  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  await expect(page).toHaveURL(/\/admin\/giris$/)
  expect((await context.cookies()).find((c) => c.name.includes('isg_admin'))).toBeUndefined()
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/giris$/)
})

test('post lifecycle: draft, preview, publish, edit, delete with confirmation', async ({ page }) => {
  await login(page)
  await page.goto('/admin/yazilar/yeni')
  await page.getByLabel('Başlık').fill('Yüksekte çalışmada düşme önleme')
  await expect(page.getByLabel('Adres (slug)')).toHaveValue('yuksekte-calismada-dusme-onleme')
  await page.getByLabel('Özet').fill('E2E testi özeti')
  await page.getByLabel('İçerik (Markdown)').fill('## Giriş\n\nMetin <script>window.__x=1</script>\n\n## Sonuç\n\nBitti.')
  await page.getByLabel('Kategori').selectOption('saha-uygulamalari')
  await page.getByLabel('Etiketler').fill('Yüksekte Çalışma, KKD')
  await page.getByLabel('Kaynakça').fill('İş Sağlığı ve Güvenliği Kanunu | https://www.mevzuat.gov.tr/\nYerel not')
  await page.getByRole('button', { name: 'Kaydet ve önizle' }).click()

  await expect(page).toHaveURL(/\/admin\/yazilar\/yuksekte-calismada-dusme-onleme\/onizleme$/)
  await expect(page.getByText('bu yazı taslak, ziyaretçiler göremez')).toBeVisible()
  await expect(page.locator('.prose script')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'İş Sağlığı ve Güvenliği Kanunu' })).toHaveAttribute('href', 'https://www.mevzuat.gov.tr/')

  const file = path.join(work, 'content/posts/yuksekte-calismada-dusme-onleme.md')
  expect(readFileSync(file, 'utf8')).toMatch(/status: draft[\s\S]*tags:\n {2}- Yüksekte Çalışma\n {2}- KKD/)
  // Static public site is not affected until the next build.
  expect((await page.request.get('/blog/yuksekte-calismada-dusme-onleme')).status()).toBe(404)

  await page.getByRole('link', { name: 'Düzenlemeye dön' }).click()
  await page.getByRole('button', { name: 'Yayınla' }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Yazı yayına alındı' })).toBeVisible()
  expect(readFileSync(file, 'utf8')).toContain('status: published')

  await page.getByLabel('Özet').fill('Güncellenmiş özet')
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Kaydedildi.' })).toBeVisible()
  expect(readFileSync(file, 'utf8')).toMatch(/revision: 1/)

  await page.getByRole('button', { name: 'Yayından kaldır' }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'yayından kaldırıldı' })).toBeVisible()

  await page.getByRole('link', { name: 'Sil' }).click()
  await page.getByLabel(/Onaylamak için/).fill('yanlis')
  await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('aynen yazın')
  expect(existsSync(file)).toBe(true)
  await page.getByLabel(/Onaylamak için/).fill('yuksekte-calismada-dusme-onleme')
  await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click()
  await expect(page).toHaveURL(/\/admin\/yazilar\?durum=silindi$/)
  expect(existsSync(file)).toBe(false)

  await page.goto('/admin/kayitlar')
  await expect(page.locator('table')).toContainText('panel(yonetici): yazıyı sildi yuksekte-calismada-dusme-onleme')
})

test('stale edits are rejected instead of overwriting (optimistic locking)', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': freshIp() } })
  const a = await ctx.newPage()
  await login(a)
  await a.goto('/admin/yazilar/ornek-yazi-1')
  const b = await ctx.newPage()
  await b.goto('/admin/yazilar/ornek-yazi-1')
  await b.getByLabel('Özet').fill('B sekmesi')
  await b.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(b.locator('main').getByRole('status').filter({ hasText: 'Kaydedildi.' })).toBeVisible()
  await a.getByLabel('Özet').fill('A sekmesi')
  await a.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(a.locator('main').getByRole('alert')).toContainText('başka bir oturumda değiştirilmiş')
  expect(readFileSync(path.join(work, 'content/posts/ornek-yazi-1.md'), 'utf8')).toContain('excerpt: B sekmesi')
  await ctx.close()
})

test('server actions reject a missing or wrong CSRF token', async ({ page }) => {
  await login(page)
  await page.goto('/admin/kategoriler')
  const before = readFileSync(path.join(work, 'content/categories.json'), 'utf8')
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Kategori ekle' }) })
  await form.locator('input[name=csrf]').evaluate((el: HTMLInputElement) => (el.value = 'forged-token'))
  await form.getByLabel('Ad', { exact: true }).fill('CSRF denemesi')
  await form.getByRole('button', { name: 'Kategori ekle' }).click()
  await expect(form.getByRole('alert')).toContainText('CSRF')
  expect(readFileSync(path.join(work, 'content/categories.json'), 'utf8')).toBe(before)

  await form.locator('input[name=csrf]').evaluate((el) => el.remove())
  await form.getByRole('button', { name: 'Kategori ekle' }).click()
  await expect(form.getByRole('alert')).toContainText('CSRF')
  expect(readFileSync(path.join(work, 'content/categories.json'), 'utf8')).toBe(before)
})

async function captureAction(page: Page, trigger: () => Promise<void>) {
  const req = page.waitForRequest((r) => r.method() === 'POST' && Boolean(r.headers()['next-action']))
  await trigger()
  const r = await req
  return { url: r.url(), headers: r.headers(), body: r.postDataBuffer()! }
}

async function replay(request: APIRequestContext, cap: Awaited<ReturnType<typeof captureAction>>) {
  // Same request, minus the browser's cookies.
  const headers = { ...cap.headers }
  delete headers.cookie
  return request.post(cap.url, { headers, data: cap.body, maxRedirects: 0 })
}

test('replaying a captured server action without the session cookie changes nothing', async ({ page, playwright }) => {
  await login(page)
  await page.goto('/admin/kategoriler')
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Kategori ekle' }) })
  await form.getByLabel('Ad', { exact: true }).fill('Yakalanan istek')
  const cap = await captureAction(page, () => form.getByRole('button', { name: 'Kategori ekle' }).click())
  await expect(page.locator('main').getByRole('status')).toContainText('Kategori eklendi')
  const after = readFileSync(path.join(work, 'content/categories.json'), 'utf8')

  // Without any cookie the proxy already redirects to the login page.
  const anon = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' })
  const res = await replay(anon, cap)
  expect(res.status()).toBeGreaterThanOrEqual(300)
  expect(res.status()).toBeLessThan(400)
  expect(res.headers()['location']).toContain('/admin/giris')
  await anon.dispose()

  // With a forged cookie the request passes the proxy but the action's own session check rejects it.
  const forged = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' })
  const res2 = await forged.post(cap.url, {
    headers: { ...Object.fromEntries(Object.entries(cap.headers).filter(([k]) => k !== 'cookie')), cookie: '__Host-isg_admin=forged.value' },
    data: cap.body,
    maxRedirects: 0,
  })
  expect(await res2.text()).toContain('Oturum geçersiz')
  await forged.dispose()
  expect(readFileSync(path.join(work, 'content/categories.json'), 'utf8')).toBe(after)
})

test('categories: add, refuse deleting a used one, delete an unused one', async ({ page }) => {
  await login(page)
  await page.goto('/admin/kategoriler')
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Kategori ekle' }) })
  await add.getByLabel('Ad', { exact: true }).fill('Ergonomi')
  await add.getByLabel('Açıklama').fill('Çalışma duruşları')
  await add.getByRole('button', { name: 'Kategori ekle' }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Kategori eklendi.' })).toBeVisible()
  const cats = JSON.parse(readFileSync(path.join(work, 'content/categories.json'), 'utf8'))
  expect(cats.some((c: { slug: string }) => c.slug === 'ergonomi')).toBe(true)

  const used = page.locator('.admin-card').filter({ has: page.locator('input[value="mevzuat"]') })
  await expect(used.getByRole('button', { name: 'Sil' })).toBeDisabled()

  page.once('dialog', (d) => d.accept())
  const ergo = page.locator('.admin-card').filter({ has: page.locator('input[name=slug][value="ergonomi"]') })
  await ergo.getByRole('button', { name: 'Sil' }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Kategori silindi.' })).toBeVisible()
})

test('media: rejects SVG and spoofed files, accepts a PNG with alt text', async ({ page }) => {
  await login(page)
  await page.goto('/admin/medya')
  const upload = async (name: string, mimeType: string, buffer: Buffer, alt: string) => {
    await page.getByLabel('Görsel dosyası').setInputFiles({ name, mimeType, buffer })
    await page.getByLabel('Alt metin').fill(alt)
    await page.getByRole('button', { name: 'Yükle' }).click()
  }
  await upload('x.svg', 'image/svg+xml', Buffer.from('<svg onload="alert(1)"/>'), 'zararlı görsel')
  await expect(page.locator('main').getByRole('alert')).toContainText('SVG kabul edilmez')
  await upload('x.png', 'image/png', Buffer.from('<html><script>alert(1)</script>'), 'sahte png')
  await expect(page.locator('main').getByRole('alert')).toContainText('Yalnızca JPEG, PNG veya WebP')
  await upload('foto.jpg', 'image/jpeg', PNG, 'uzantı uyuşmazlığı')
  await expect(page.locator('main').getByRole('alert')).toContainText('uzantısı')

  await upload('İskele Kontrolü.png', 'image/png', PNG, 'İskele korkuluğu kontrolü')
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Görsel yüklendi' })).toBeVisible()
  const year = String(new Date().getFullYear())
  const files = readdirSync(path.join(work, 'uploads', year))
  expect(files.some((f) => /^iskele-kontrolu-[a-z0-9]+\.png$/.test(f))).toBe(true)
  const media = JSON.parse(readFileSync(path.join(work, 'content/media.json'), 'utf8'))
  expect(media[0].alt).toBe('İskele korkuluğu kontrolü')
  expect(media[0].width).toBe(1)

  // A JPEG with EXIF GPS data, a comment and an appended HTML payload is stored cleaned and still decodes.
  const jpg = readFileSync(path.resolve(import.meta.dirname, '../fixtures/images/ornek.jpg'))
  const exif = Buffer.concat([Buffer.from('Exif\0\0MM\0*\0\0\0\x08\0\0\0\0\0\0', 'latin1'), Buffer.from('GPSLatitude 41.0082')])
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff]), exif])
  const dirty = Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2), Buffer.from('<html><script>alert(1)</script>')])
  await upload('saha.jpg', 'image/jpeg', dirty, 'Saha fotoğrafı')
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Görsel yüklendi' })).toBeVisible()
  const stored = readdirSync(path.join(work, 'uploads', year)).find((f) => f.startsWith('saha-'))!
  const bytes = readFileSync(path.join(work, 'uploads', year, stored))
  expect(bytes.toString('latin1')).not.toMatch(/GPSLatitude|<script>/)
  const decoded = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/jpeg;base64,${b64}`
    await img.decode()
    return [img.naturalWidth, img.naturalHeight]
  }, bytes.toString('base64'))
  expect(decoded).toEqual([40, 24])
})

test('settings: validates URLs and e-mail, saves valid data', async ({ page }) => {
  await login(page)
  await page.goto('/admin/ayarlar')
  await page.getByLabel('LinkedIn').evaluate((el: HTMLInputElement) => (el.type = 'text'))
  await page.getByLabel('LinkedIn').fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Ayarları kaydet' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('social.linkedin')
  await page.getByLabel('LinkedIn').fill('https://www.linkedin.com/in/ornek')
  await page.getByLabel('Kısa biyografi (ana sayfa)').fill('E2E kısa biyografi')
  await page.getByRole('button', { name: 'Ayarları kaydet' }).click()
  await expect(page.locator('main').getByRole('status').filter({ hasText: 'Ayarlar kaydedildi' })).toBeVisible()
  const s = JSON.parse(readFileSync(path.join(work, 'content/settings.json'), 'utf8'))
  expect(s.social.linkedin).toBe('https://www.linkedin.com/in/ornek')
  expect(s.author.shortBio).toBe('E2E kısa biyografi')
})

test('tags: rename across posts', async ({ page }) => {
  await login(page)
  await page.goto('/admin/etiketler')
  const row = page.locator('tr').filter({ hasText: '/etiket/test-etiketi' })
  await row.getByPlaceholder('Yeni ad').fill('Deneme etiketi')
  await row.getByRole('button', { name: 'Yeniden adlandır' }).click()
  await expect(page.locator('main').getByRole('status')).toContainText('yeniden adlandırıldı')
  expect(readFileSync(path.join(work, 'content/posts/ornek-yazi-2.md'), 'utf8')).toContain('- Deneme etiketi')
})

test('admin pages are usable at phone width', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'X-Forwarded-For': freshIp() } })
  const page = await ctx.newPage()
  await login(page)
  for (const url of ['/admin', '/admin/yazilar', '/admin/yazilar/yeni', '/admin/ayarlar']) {
    await page.goto(url)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, url).toBeLessThanOrEqual(0)
  }
  await ctx.close()
})
