import { test, expect, type Page } from '@playwright/test'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

/*
 * Purchase flow against the mock iyzico (scripts/mock-iyzico.mjs), PGlite
 * orders, local private files and a file mail outbox (see scripts/e2e-server.mjs).
 */

const root = path.resolve(import.meta.dirname, '../..')
const work = path.join(root, '.e2e')
const MOCK = 'http://127.0.0.1:3101'
const FILE = readFileSync(path.join(root, 'tests/fixtures/private/urunler/test-kontrol-listesi/ornek-7f3k.pdf'))
const creds = () => JSON.parse(readFileSync(path.join(work, 'credentials.json'), 'utf8')) as { username: string; password: string }

function freshIp() {
  const b = () => Math.floor(Math.random() * 254) + 1
  return `10.${b()}.${b()}.${b()}`
}

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': freshIp() })
})

function mails(to: string): { to: string; subject: string; text: string }[] {
  const dir = path.join(work, 'mail')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
    .filter((m) => m.to === to)
}

async function fillCheckout(page: Page, email: string) {
  await page.goto('/magaza/test-kontrol-listesi')
  await page.getByRole('link', { name: 'Satın al' }).click()
  await expect(page).toHaveURL(/\/magaza\/test-kontrol-listesi\/satin-al$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.getByLabel('Ad', { exact: true }).fill('Ayşe')
  await page.getByLabel('Soyad').fill('Yılmaz')
  await page.getByLabel('E-posta').fill(email)
  await page.getByLabel('Cep telefonu').fill('0555 111 22 33')
  await page.getByLabel('İl').fill('İzmir')
  await page.getByLabel('Açık adres').fill('Örnek Mah. 12. Sok. No: 3, Bornova')
}

async function consentAndPay(page: Page) {
  await page.getByLabel('Ön bilgilendirme formunu okudum').check()
  await page.getByLabel('Mesafeli satış sözleşmesini okudum').check()
  await page.getByLabel('Dijital içeriğin onayımla hemen teslim').check()
  await page.getByRole('button', { name: 'Onayla ve öde' }).click()
  await page.waitForURL(`${MOCK}/odeme?**`)
}

test('purchase: consent checks, iyzico payment, order page, e-mail, download and its limit', async ({ page }) => {
  const email = `alici-${Date.now()}@example.com`
  await fillCheckout(page, email)

  // The pre-contract information shows the seller and the buyer as typed (live preview).
  const preInfo = page.locator('.checkout__doc').first()
  await expect(preInfo).toContainText('Test Satıcı Ltd. Şti.')
  await expect(preInfo).toContainText('Ayşe Yılmaz')
  await expect(preInfo).toContainText('149,90 TL')
  await expect(page.locator('.checkout__summary')).toContainText('cayma hakkı yoktur')
  await expect(page.locator('.checkout__obligation')).toContainText('ödeme yükümlülüğü')

  // Without the consents nothing happens and the typed values stay.
  await page.getByRole('button', { name: 'Onayla ve öde' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('üç onay kutusunu')
  await expect(page.getByLabel('E-posta')).toHaveValue(email)

  await consentAndPay(page)
  await expect(page.locator('body')).toContainText('149.9 TL')
  const session = await (await page.request.get(`${MOCK}/__test/last`)).json()
  expect(session.request.buyer).toMatchObject({ gsmNumber: '+905551112233', identityNumber: '11111111111', email })
  expect(session.request.basketItems[0]).toMatchObject({ itemType: 'VIRTUAL', price: '149.9' })
  expect(session.request.shippingAddress).toBeUndefined()

  await page.getByRole('button', { name: 'Ödemeyi onayla' }).click()
  await page.waitForURL(/\/siparis\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{43}$/)
  await expect(page.locator('h1')).toHaveText('Siparişiniz tamamlandı')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  const orderUrl = page.url()

  // Exactly one confirmation e-mail, with the order page link and the contract text.
  await expect.poll(() => mails(email).length).toBe(1)
  const mail = mails(email)[0]
  expect(mail.text).toContain(orderUrl)
  expect(mail.text).toContain('ÖN BİLGİLENDİRME FORMU')
  expect(mail.text).toContain('MESAFELİ SATIŞ SÖZLEŞMESİ')
  expect(mail.text).not.toContain('/indir/')

  // A replayed callback does not pay twice or send a second e-mail.
  const replay = await page.request.post('/odeme/iyzico', { form: { token: session.token }, maxRedirects: 0 })
  expect(replay.status()).toBe(303)
  expect(mails(email)).toHaveLength(1)

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /dosyasını indir/ }).click()])
  expect(download.suggestedFilename()).toBe('test-kontrol-listesi.pdf')
  expect(readFileSync((await download.path())!)).toEqual(FILE)

  // 5 downloads in total, then the link stops working until the admin renews it.
  const dl = orderUrl.replace('/siparis/', '/indir/')
  for (let i = 2; i <= 5; i++) {
    const r = await page.request.post(dl, { maxRedirects: 0 })
    expect(r.status(), `download ${i}`).toBe(200)
    expect(r.headers()['content-disposition']).toContain('attachment')
    expect(r.headers()['x-content-type-options']).toBe('nosniff')
  }
  const sixth = await page.request.post(dl, { maxRedirects: 0 })
  expect(sixth.status()).toBe(303)
  expect(sixth.headers()['location']).toContain('indirme=olmadi')
  // A GET (mail scanners, prefetch) never downloads.
  expect((await page.request.get(dl, { maxRedirects: 0 })).status()).toBe(405)

  // A forged link token is refused.
  const forged = orderUrl.replace(/[A-Za-z0-9_-]{43}$/, 'A'.repeat(43))
  expect((await page.request.get(forged)).status()).toBe(404)
  expect((await page.request.post(forged.replace('/siparis/', '/indir/'), { maxRedirects: 0 })).status()).toBe(404)
})

test('declined card: order fails, no e-mail, no download, retry offered', async ({ page }) => {
  const email = `red-${Date.now()}@example.com`
  await fillCheckout(page, email)
  await consentAndPay(page)
  await page.getByRole('button', { name: 'Kart reddedildi' }).click()
  await page.waitForURL(/\/siparis\//)
  await expect(page.locator('h1')).toHaveText('Ödeme tamamlanmadı')
  await expect(page.getByRole('button', { name: /dosyasını indir/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ürüne dön ve tekrar dene' })).toBeVisible()
  expect((await page.request.post(page.url().replace('/siparis/', '/indir/'), { maxRedirects: 0 })).status()).toBe(303)
  expect(mails(email)).toHaveLength(0)
})

test('a signed SUCCESS for the wrong amount is not accepted', async ({ page }) => {
  const email = `tutar-${Date.now()}@example.com`
  await fillCheckout(page, email)
  await consentAndPay(page)
  const { token } = await (await page.request.get(`${MOCK}/__test/last`)).json()
  await page.request.post(`${MOCK}/__test/set`, { data: { token, patch: { tamperPrice: '1.0' } } })
  await page.getByRole('button', { name: 'Ödemeyi onayla' }).click()
  await page.waitForURL(/\/siparis\//)
  await expect(page.locator('h1')).toHaveText('Ödemeniz doğrulanıyor')
  await expect(page.getByRole('button', { name: /dosyasını indir/ })).toHaveCount(0)
  expect(mails(email)).toHaveLength(0)
})

test('webhook settles a payment whose buyer never came back; a bad signature is refused', async ({ page }) => {
  const email = `webhook-${Date.now()}@example.com`
  await fillCheckout(page, email)
  await consentAndPay(page)
  const { token } = await (await page.request.get(`${MOCK}/__test/last`)).json()
  await page.request.post(`${MOCK}/__test/set`, { data: { token, patch: { state: 'paid' } } })

  const bad = await (await page.request.post(`${MOCK}/__test/webhook`, { data: { token, url: 'http://127.0.0.1:3100/odeme/iyzico/bildirim', badSignature: true } })).json()
  expect(bad.status).toBe(401)
  expect(mails(email)).toHaveLength(0)

  const good = await (await page.request.post(`${MOCK}/__test/webhook`, { data: { token, url: 'http://127.0.0.1:3100/odeme/iyzico/bildirim' } })).json()
  expect(good.status).toBe(200)
  await expect.poll(() => mails(email).length).toBe(1)
})

test('an unsigned error from iyzico leaves the order pending; "Durumu yenile" completes it later', async ({ page }) => {
  const email = `bekle-${Date.now()}@example.com`
  await fillCheckout(page, email)
  await consentAndPay(page)
  const { token } = await (await page.request.get(`${MOCK}/__test/last`)).json()
  // The buyer comes back while iyzico still answers with an (unsigned) error.
  await page.goto('/odeme/sonuc')
  const back = await page.request.post('/odeme/iyzico', { form: { token }, maxRedirects: 0 })
  await page.goto(back.headers()['location'].replace('localhost', '127.0.0.1'))
  await expect(page.locator('h1')).toHaveText('Ödemeniz doğrulanıyor')
  expect(mails(email)).toHaveLength(0)

  await page.request.post(`${MOCK}/__test/set`, { data: { token, patch: { state: 'paid' } } })
  await page.getByRole('button', { name: 'Durumu yenile' }).click()
  await expect(page.locator('h1')).toHaveText('Siparişiniz tamamlandı')
  await expect.poll(() => mails(email).length).toBe(1)
})

test('unknown or missing tokens on the payment return lead to a neutral page', async ({ page }) => {
  const r = await page.request.post('/odeme/iyzico', { form: { token: 'yok-boyle-bir-token' }, maxRedirects: 0 })
  expect(r.status()).toBe(303)
  expect(r.headers()['location']).toMatch(/\/odeme\/sonuc$/)
  const empty = await page.request.post('/odeme/iyzico', { form: {}, maxRedirects: 0 })
  expect(empty.headers()['location']).toMatch(/\/odeme\/sonuc$/)
  await page.goto('/odeme/sonuc')
  await expect(page.locator('h1')).toHaveText('Ödeme sonucu bulunamadı')
})

test('checkout is usable at phone width', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'X-Forwarded-For': freshIp() } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/magaza/test-kontrol-listesi/satin-al')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
  await ctx.close()
})

test('admin sees the order, records the invoice and sends a fresh link that replaces the old one', async ({ page }) => {
  const email = `admin-${Date.now()}@example.com`
  await fillCheckout(page, email)
  await consentAndPay(page)
  await page.getByRole('button', { name: 'Ödemeyi onayla' }).click()
  await page.waitForURL(/\/siparis\//)
  const oldUrl = page.url()
  const orderNo = (await page.locator('.page-band p').textContent())!.replace('Sipariş numarası: ', '').trim()

  await page.goto('/admin/giris')
  await page.getByLabel('Kullanıcı adı').fill(creds().username)
  await page.getByLabel('Parola').fill(creds().password)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  await page.waitForURL(/\/admin$/)
  await page.goto('/admin/siparisler?durum=odendi')
  await page.getByRole('link', { name: orderNo }).click()
  await expect(page.locator('h1')).toHaveText(`Sipariş ${orderNo}`)
  await expect(page.locator('.admin-facts')).toContainText(email)
  await expect(page.locator('.admin-facts')).toContainText('SHA-256')

  await page.getByLabel('Fatura numarası').fill('GIB2026000000123')
  await page.getByRole('button', { name: 'Fatura numarasını kaydet' }).click()
  await expect(page.locator('.admin-facts')).toContainText('GIB2026000000123')

  await page.getByRole('button', { name: 'Yeni indirme bağlantısı gönder' }).click()
  await expect(page.locator('main').getByRole('status')).toContainText('İşlem yapıldı')
  await expect.poll(() => mails(email).length).toBe(2)
  expect((await page.request.get(oldUrl)).status()).toBe(404)
  const newUrl = /http:\/\/localhost:3100\/siparis\/\S+/.exec(mails(email).find((m) => !m.text.includes(oldUrl))!.text)![0]
  expect((await page.request.get(newUrl.replace('localhost', '127.0.0.1'))).status()).toBe(200)

  await page.getByLabel(/Onaylamak için sipariş numarasını/).fill(orderNo)
  await page.getByRole('button', { name: 'İade edildi olarak işaretle' }).click()
  await expect(page.locator('.admin-facts')).toContainText('İade edildi')
  expect((await page.request.post(newUrl.replace('localhost', '127.0.0.1').replace('/siparis/', '/indir/'), { maxRedirects: 0 })).status()).toBe(303)
})
