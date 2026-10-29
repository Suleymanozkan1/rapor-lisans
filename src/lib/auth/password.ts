import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  )

// OWASP Password Storage Cheat Sheet minimum for scrypt: N=2^17, r=8, p=1.
const DEFAULTS = { N: 2 ** 17, r: 8, p: 1, keyLen: 32 }

/** Format: scrypt:N:r:p:salt(base64url):hash(base64url). No "$", so .env expansion cannot mangle it. */
export async function hashPassword(password: string, params = DEFAULTS): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password.normalize('NFKC'), salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 256 * params.N * params.r,
  })
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64url'), key.toString('base64url')].join(':')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [N, r, p] = parts.slice(1, 4).map(Number)
  if (![N, r, p].every(Number.isSafeInteger) || N < 2 ** 14 || N > 2 ** 20 || r < 1 || r > 32 || p < 1 || p > 16) {
    return false
  }
  const salt = Buffer.from(parts[4], 'base64url')
  const expected = Buffer.from(parts[5], 'base64url')
  if (expected.length < 16 || password.length > 1024) return false
  const key = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: 256 * N * r })
  return timingSafeEqual(key, expected)
}
