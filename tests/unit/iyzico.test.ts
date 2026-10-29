import { describe, expect, it } from 'vitest'
import {
  authorization,
  checkoutRequest,
  initializeCheckout,
  judgeRetrieve,
  requestPrice,
  responseSignature,
  signaturePrice,
  webhookSignature,
  IDENTITY_PLACEHOLDER,
} from '@/lib/payments/iyzico'
import { createHmac } from 'node:crypto'

describe('iyzico auth and signatures (published test vectors)', () => {
  it('IYZWSv2 header matches the iyzipay-node unit test', () => {
    // iyzipay-node test/unit/UtilsTest.js: body "body" is JSON.stringify'd to "\"body\"".
    expect(authorization({ apiKey: 'api_key', secretKey: 'secret_key' }, 'uri', JSON.stringify('body'), 'random_string')).toBe(
      'IYZWSv2 YXBpS2V5OmFwaV9rZXkmcmFuZG9tS2V5OnJhbmRvbV9zdHJpbmcmc2lnbmF0dXJlOjAxNzUwODkyMWEyOWVlNTYwMWJjZDFmYmU4M2VmZDJlMmJlNDNhZjAyZWNlZmYzMGNmMmU5MWE1MzlhYWIzNTU=',
    )
  })

  it('response signature matches the docs example', () => {
    expect(responseSignature('sandbox-qaIiLIxhjMgx3LSKIVvp6j17NunHOFtD', ['22416032', 'TRY', 'basketId', 'conversationId', signaturePrice(10.5), signaturePrice('10.50')])).toBe(
      '836c3a6c8db86c81043f2ca74edb13518b54a813f454f8dd762f0dd658610173',
    )
  })

  it('formats prices for requests and for signatures', () => {
    expect(requestPrice(14990)).toBe('149.9')
    expect(requestPrice(15000)).toBe('150.0')
    expect(requestPrice(1)).toBe('0.01')
    expect(() => requestPrice(0)).toThrow()
    expect(() => requestPrice(1.5)).toThrow()
    expect(signaturePrice(10.0)).toBe('10')
    expect(signaturePrice('10.510')).toBe('10.51')
    expect(signaturePrice(5.2)).toBe('5.2')
  })

  it('webhook signature concatenates secret and fields without separators', () => {
    const p = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 28157797, token: 'tok', paymentConversationId: 'conv', status: 'SUCCESS' }
    const expected = createHmac('sha256', 's3cret').update('s3cretCHECKOUT_FORM_AUTH28157797tokconvSUCCESS').digest('hex')
    expect(webhookSignature('s3cret', p)).toBe(expected)
  })
})

describe('checkout request', () => {
  const input = {
    orderId: '6f1c1d2e-0000-4000-8000-000000000001',
    orderNo: 'GC-20261029-ABCDEF',
    amountKurus: 14990,
    callbackUrl: 'https://guvenlicalis.example/odeme/iyzico',
    product: { slug: 'kontrol-listesi', title: 'Kontrol listesi' },
    buyer: { name: 'Ayşe', surname: 'Yılmaz', email: 'ayse@example.com', phone: '+905551112233', city: 'İzmir', address: 'Örnek mah. 1', ip: '203.0.113.7' },
  }

  it('sends a virtual basket whose total equals price, without TCKN or shipping address', () => {
    const r = checkoutRequest(input)
    expect(r.price).toBe('149.9')
    expect(r.paidPrice).toBe(r.price)
    expect(r.basketItems).toHaveLength(1)
    expect(r.basketItems[0]).toMatchObject({ itemType: 'VIRTUAL', price: '149.9' })
    expect(r.buyer.identityNumber).toBe(IDENTITY_PLACEHOLDER)
    expect('shippingAddress' in r).toBe(false)
    expect(r.conversationId).toBe(input.orderId)
    expect(r.basketId).toBe(input.orderNo)
  })

  it('initialize verifies the response signature and the payment page host', async () => {
    const cfg = { apiKey: 'k', secretKey: 'sec', baseUrl: 'https://sandbox-api.iyzipay.com' }
    const respond = (body: Record<string, unknown>) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch
    const good = { status: 'success', conversationId: input.orderId, token: 'tok-1', paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok-1&lang=tr' }
    const signed = { ...good, signature: responseSignature('sec', [good.conversationId, good.token]) }
    await expect(initializeCheckout(cfg, input, respond(signed))).resolves.toMatchObject({ token: 'tok-1' })
    await expect(initializeCheckout(cfg, input, respond({ ...good, signature: 'ab'.repeat(32) }))).rejects.toThrow('doğrulanamadı')
    const evil = { ...good, paymentPageUrl: 'https://iyzipay.com.evil.example/pay' }
    await expect(initializeCheckout(cfg, input, respond({ ...evil, signature: responseSignature('sec', [evil.conversationId, evil.token]) }))).rejects.toThrow('ödeme sayfası')
    await expect(initializeCheckout(cfg, input, respond({ status: 'failure', errorMessage: 'Geçersiz istek' }))).rejects.toThrow('Geçersiz istek')
  })
})

describe('judging a retrieve result', () => {
  const secret = 'sec'
  const order = { id: 'conv-1', orderNo: 'GC-1', amountKurus: 14990, currency: 'TRY' }
  const base = { status: 'success', paymentStatus: 'SUCCESS', paymentId: '2815', currency: 'TRY', basketId: 'GC-1', conversationId: 'conv-1', paidPrice: 149.9, price: 149.9, token: 'tok', fraudStatus: 1 }
  const sign = (r: Record<string, unknown>) => ({
    ...r,
    signature: responseSignature(secret, [r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId, signaturePrice(r.paidPrice), signaturePrice(r.price), r.token]),
  })

  it('accepts only a signed, matching, approved payment', () => {
    expect(judgeRetrieve(secret, order, 'tok', sign(base))).toEqual({ outcome: 'paid', paymentId: '2815' })
    // Trailing zeros as iyzico sends them still verify.
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, paidPrice: '149.90000000', price: '149.90000000' })).outcome).toBe('paid')
  })

  it('never marks paid on a bad or missing signature, another order, another amount or a pending fraud check', () => {
    expect(judgeRetrieve(secret, order, 'tok', { ...base, signature: '00'.repeat(32) }).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'tok', base).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, conversationId: 'other' })).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'other-token', sign(base)).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, paidPrice: 1, price: 1 })).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, currency: 'USD' })).outcome).toBe('pending')
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, fraudStatus: 0 }))).toEqual({ outcome: 'pending', reason: 'Ödeme risk incelemesinde' })
  })

  it('records a failure only for a signed declined payment or a fraud rejection', () => {
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, paymentStatus: 'FAILURE' })).outcome).toBe('failed')
    expect(judgeRetrieve(secret, order, 'tok', sign({ ...base, fraudStatus: -1 })).outcome).toBe('failed')
    // An unsigned error response (outage, abandoned form) leaves the order pending.
    expect(judgeRetrieve(secret, order, 'tok', { status: 'failure', errorMessage: 'Sistem hatası' })).toEqual({ outcome: 'pending', reason: 'Sistem hatası' })
  })
})
