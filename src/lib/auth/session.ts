import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_TTL_SECONDS = 8 * 60 * 60

export type SessionPayload = {
  /** username */
  sub: string
  /** random session id, also binds the CSRF token */
  sid: string
  iat: number
  exp: number
  /** bump SESSION_VERSION to invalidate every issued session */
  ver: string
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function createSessionToken(sub: string, secret: string, ver: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000)
  const payload: SessionPayload = { sub, sid: randomBytes(18).toString('base64url'), iat, exp: iat + SESSION_TTL_SECONDS, ver }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(`session.${body}`, secret)}`
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  expected: { sub: string; ver: string },
  now = Date.now(),
): SessionPayload | null {
  if (!token || token.length > 1024) return null
  const [body, sig, extra] = token.split('.')
  if (!body || !sig || extra !== undefined) return null
  if (!safeEqual(sig, sign(`session.${body}`, secret))) return null
  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const t = Math.floor(now / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= t || payload.iat > t + 60) return null
  if (payload.sub !== expected.sub || payload.ver !== expected.ver || typeof payload.sid !== 'string') return null
  return payload
}

/** Per-session CSRF token: HMAC of the session id, so it cannot be forged without the secret. */
export function csrfTokenFor(sid: string, secret: string): string {
  return sign(`csrf.${sid}`, secret)
}

export function verifyCsrfToken(sid: string, token: unknown, secret: string): boolean {
  return typeof token === 'string' && token.length < 200 && safeEqual(token, csrfTokenFor(sid, secret))
}
