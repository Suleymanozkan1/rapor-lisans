#!/usr/bin/env node
// A small stand-in for iyzico's Checkout Form API, for the e2e suite only.
// It checks the IYZWSv2 Authorization header with the same algorithm the
// site uses, serves a fake payment page that posts back to the callbackUrl
// like iyzico does, answers Retrieve with signed results and can send a
// signed webhook. Never used outside tests.
import http from 'node:http'
import { createHmac, randomUUID } from 'node:crypto'

const port = Number(process.env.MOCK_IYZICO_PORT || 3101)
const apiKey = process.env.IYZICO_API_KEY
const secret = process.env.IYZICO_SECRET_KEY
const sessions = new Map()

const hmac = (data) => createHmac('sha256', secret).update(data).digest('hex')
const sigPrice = (v) => String(Math.round(Number(v) * 1e8) / 1e8)

function authOk(req, path, body) {
  const rnd = req.headers['x-iyzi-rnd']
  const auth = String(req.headers.authorization || '')
  if (!rnd || !auth.startsWith('IYZWSv2 ')) return false
  const decoded = Buffer.from(auth.slice(8), 'base64').toString('utf8')
  return decoded === `apiKey:${apiKey}&randomKey:${rnd}&signature:${hmac(rnd + path + body)}`
}

const read = (req) => new Promise((resolve) => {
  let b = ''
  req.on('data', (c) => (b += c))
  req.on('end', () => resolve(b))
})
const json = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function retrieveBody(s) {
  if (s.state === 'open') return { status: 'failure', errorCode: '5', errorMessage: 'Ödeme henüz tamamlanmadı', conversationId: s.conversationId }
  const paymentStatus = s.state === 'paid' ? 'SUCCESS' : 'FAILURE'
  const r = {
    status: 'success',
    locale: 'tr',
    systemTime: Date.now(),
    conversationId: s.conversationId,
    token: s.token,
    paymentStatus,
    paymentId: s.paymentId,
    basketId: s.basketId,
    currency: 'TRY',
    price: Number(s.price),
    paidPrice: Number(s.tamperPrice ?? s.price),
    fraudStatus: s.fraudStatus ?? 1,
  }
  r.signature = hmac([r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId, sigPrice(r.paidPrice), sigPrice(r.price), r.token].join(':'))
  return r
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    const body = req.method === 'POST' ? await read(req) : ''

    if (url.pathname === '/payment/iyzipos/checkoutform/initialize/auth/ecom') {
      if (!authOk(req, url.pathname, body)) return json(res, 401, { status: 'failure', errorCode: '1001', errorMessage: 'api bilgileri bulunamadı' })
      const r = JSON.parse(body)
      const itemsTotal = r.basketItems.reduce((t, i) => t + Number(i.price), 0)
      if (Math.abs(itemsTotal - Number(r.price)) > 1e-9 || r.price !== r.paidPrice) return json(res, 200, { status: 'failure', errorCode: '5062', errorMessage: 'Total item price must be equal to price' })
      if (!/^\+90\d{10}$/.test(r.buyer.gsmNumber)) return json(res, 200, { status: 'failure', errorCode: '27', errorMessage: 'Invalid phone number' })
      const token = randomUUID()
      sessions.set(token, { token, conversationId: r.conversationId, basketId: r.basketId, price: r.price, callbackUrl: r.callbackUrl, state: 'open', paymentId: String(Math.floor(Math.random() * 1e8)), request: r })
      return json(res, 200, {
        status: 'success',
        locale: 'tr',
        conversationId: r.conversationId,
        token,
        tokenExpireTime: 1800,
        paymentPageUrl: `http://127.0.0.1:${port}/odeme?token=${token}`,
        signature: hmac([r.conversationId, token].join(':')),
      })
    }

    if (url.pathname === '/payment/iyzipos/checkoutform/auth/ecom/detail') {
      if (!authOk(req, url.pathname, body)) return json(res, 401, { status: 'failure', errorMessage: 'auth' })
      const s = sessions.get(JSON.parse(body).token)
      if (!s) return json(res, 200, { status: 'failure', errorCode: '5122', errorMessage: 'Geçersiz token' })
      return json(res, 200, retrieveBody(s))
    }

    // Fake hosted payment page.
    if (url.pathname === '/odeme' && req.method === 'GET') {
      const s = sessions.get(url.searchParams.get('token'))
      if (!s) return json(res, 404, { error: 'unknown token' })
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>Sahte iyzico ödeme sayfası</title>
<h1>Sahte iyzico ödeme sayfası</h1><p>Tutar: ${esc(s.price)} TL</p>
<form method="post" action="/karar"><input type="hidden" name="token" value="${esc(s.token)}">
<button name="sonuc" value="odendi">Ödemeyi onayla</button> <button name="sonuc" value="reddedildi">Kart reddedildi</button></form>`)
    }
    if (url.pathname === '/karar' && req.method === 'POST') {
      const f = new URLSearchParams(body)
      const s = sessions.get(f.get('token'))
      if (!s) return json(res, 404, { error: 'unknown token' })
      s.state = f.get('sonuc') === 'odendi' ? 'paid' : 'failed'
      // Like iyzico: the browser is sent to the callbackUrl with a form POST carrying the token.
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(`<!doctype html><html><meta charset="utf-8"><body><form id="f" method="post" action="${esc(s.callbackUrl)}"><input type="hidden" name="token" value="${esc(s.token)}"></form><script>document.getElementById('f').submit()</script>`)
    }

    // Test controls.
    if (url.pathname === '/__test/last') {
      const last = [...sessions.values()].pop()
      return json(res, 200, last ?? null)
    }
    if (url.pathname === '/__test/set' && req.method === 'POST') {
      const p = JSON.parse(body)
      const s = sessions.get(p.token)
      if (!s) return json(res, 404, {})
      Object.assign(s, p.patch)
      return json(res, 200, s)
    }
    if (url.pathname === '/__test/webhook' && req.method === 'POST') {
      const p = JSON.parse(body)
      const s = sessions.get(p.token)
      if (!s) return json(res, 404, {})
      const payload = { paymentConversationId: s.conversationId, merchantId: 1, token: s.token, status: s.state === 'paid' ? 'SUCCESS' : 'FAILURE', iyziReferenceCode: randomUUID(), iyziEventType: 'CHECKOUT_FORM_AUTH', iyziEventTime: Date.now(), iyziPaymentId: Number(s.paymentId) }
      const signature = p.badSignature ? 'ab'.repeat(32) : hmac(secret + payload.iyziEventType + payload.iyziPaymentId + payload.token + payload.paymentConversationId + payload.status)
      const r = await fetch(p.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-IYZ-Signature-V3': signature }, body: JSON.stringify(payload) })
      return json(res, 200, { status: r.status })
    }
    json(res, 404, { error: 'not found' })
  })
  .listen(port, '127.0.0.1', () => console.log(`mock iyzico on http://127.0.0.1:${port}`))
