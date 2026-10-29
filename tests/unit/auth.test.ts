import { describe, expect, it, beforeEach } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionToken, verifySessionToken, csrfTokenFor, verifyCsrfToken, SESSION_TTL_SECONDS } from '@/lib/auth/session'
import { consume, resetLimit, __resetMemoryLimiter, __memorySize } from '@/lib/auth/rate-limit'

const FAST = { N: 2 ** 14, r: 8, p: 1, keyLen: 32 }
const SECRET = 'x'.repeat(40)

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const h = await hashPassword('doğru-parola-123', FAST)
    expect(h).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/)
    expect(h).not.toContain('$')
    expect(await verifyPassword('doğru-parola-123', h)).toBe(true)
    expect(await verifyPassword('yanlis-parola-123', h)).toBe(false)
    expect(await verifyPassword('', h)).toBe(false)
  })
  it('uses a random salt', async () => {
    expect(await hashPassword('a', FAST)).not.toBe(await hashPassword('a', FAST))
  })
  it('rejects malformed or weakened hashes instead of throwing', async () => {
    for (const bad of ['', 'plain', 'scrypt:2:1:1:aa:bb', 'scrypt:16384:8:1:aa', 'bcrypt:x', 'scrypt:99999999999:8:1:aa:bbbbbbbbbbbbbbbbbbbbbbbb']) {
      expect(await verifyPassword('a', bad)).toBe(false)
    }
  })
})

describe('session tokens', () => {
  const exp = { sub: 'ugur', ver: '1' }
  it('round-trips', () => {
    const t = createSessionToken('ugur', SECRET, '1')
    expect(verifySessionToken(t, SECRET, exp)?.sub).toBe('ugur')
  })
  it('rejects tampering, wrong secret, wrong user, wrong version', () => {
    const t = createSessionToken('ugur', SECRET, '1')
    const [body, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), sub: 'root' })).toString('base64url')
    expect(verifySessionToken(`${forged}.${sig}`, SECRET, exp)).toBeNull()
    expect(verifySessionToken(t, 'y'.repeat(40), exp)).toBeNull()
    expect(verifySessionToken(t, SECRET, { sub: 'other', ver: '1' })).toBeNull()
    expect(verifySessionToken(t, SECRET, { sub: 'ugur', ver: '2' })).toBeNull()
    expect(verifySessionToken(`${t}.x`, SECRET, exp)).toBeNull()
    expect(verifySessionToken('garbage', SECRET, exp)).toBeNull()
    expect(verifySessionToken(undefined, SECRET, exp)).toBeNull()
  })
  it('expires', () => {
    const t = createSessionToken('ugur', SECRET, '1', 0)
    expect(verifySessionToken(t, SECRET, exp, (SESSION_TTL_SECONDS - 1) * 1000)).not.toBeNull()
    expect(verifySessionToken(t, SECRET, exp, (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
  })
  it('binds CSRF tokens to the session', () => {
    const tok = csrfTokenFor('sid-1', SECRET)
    expect(verifyCsrfToken('sid-1', tok, SECRET)).toBe(true)
    expect(verifyCsrfToken('sid-2', tok, SECRET)).toBe(false)
    expect(verifyCsrfToken('sid-1', '', SECRET)).toBe(false)
    expect(verifyCsrfToken('sid-1', null, SECRET)).toBe(false)
  })
})

describe('login rate limit (memory backend)', () => {
  beforeEach(() => __resetMemoryLimiter())
  it('allows max attempts per window, then blocks until the window ends', async () => {
    const now = 1_000_000
    for (let i = 0; i < 5; i++) expect((await consume('k', 5, 60, now)).allowed).toBe(true)
    const blocked = await consume('k', 5, 60, now)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(60)
    expect((await consume('k', 5, 60, now + 61_000)).allowed).toBe(true)
  })
  it('is atomic under concurrent bursts', async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => consume('burst', 5, 60)))
    expect(results.filter((r) => r.allowed)).toHaveLength(5)
  })
  it('resets on success', async () => {
    for (let i = 0; i < 6; i++) await consume('k2', 5, 60)
    await resetLimit('k2')
    expect((await consume('k2', 5, 60)).allowed).toBe(true)
  })
  it('never evicts the account bucket when flooded with IP keys', async () => {
    for (let i = 0; i < 21; i++) await consume('login:acct:admin', 20, 900)
    for (let i = 0; i < 10_050; i++) await consume(`login:ip:10.0.${i >> 8}.${i & 255}`, 5, 900)
    expect(__memorySize()).toBeLessThanOrEqual(10_000)
    expect((await consume('login:acct:admin', 20, 900)).allowed).toBe(false)
  })
})
