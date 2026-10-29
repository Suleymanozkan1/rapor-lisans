import 'server-only'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authConfig } from '../env'
import { sessionCookieName, sessionCookieSecure } from './cookie'
import { createSessionToken, csrfTokenFor, SESSION_TTL_SECONDS, verifyCsrfToken, verifySessionToken, type SessionPayload } from './session'

export type AdminSession = SessionPayload & { csrf: string }

export class AuthError extends Error {}

export async function getAdminSession(): Promise<AdminSession | null> {
  // Read cookies first: this marks every caller as request-time rendered,
  // even when auth is not configured (otherwise a build without secrets
  // would prerender the login redirect as a static page).
  const jar = await cookies()
  const cfg = authConfig()
  if (!cfg) return null
  const payload = verifySessionToken(jar.get(sessionCookieName())?.value, cfg.sessionSecret, {
    sub: cfg.username,
    ver: cfg.sessionVersion,
  })
  if (!payload) return null
  return { ...payload, csrf: csrfTokenFor(payload.sid, cfg.sessionSecret) }
}

/** For admin pages: redirects anonymous visitors to the login page. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession()
  if (!s) redirect('/admin/giris')
  return s
}

/**
 * For Server Actions: checks the session, the per-session CSRF token and
 * the Origin header (Next.js checks Origin as well; this is a second layer
 * that also covers deployments behind proxies).
 */
export async function requireAdminAction(formData: FormData): Promise<AdminSession> {
  const s = await getAdminSession()
  if (!s) throw new AuthError('Oturum geçersiz veya süresi doldu. Lütfen yeniden giriş yapın.')
  const cfg = authConfig()!
  if (!verifyCsrfToken(s.sid, formData.get('csrf'), cfg.sessionSecret)) {
    throw new AuthError('Güvenlik doğrulaması başarısız (CSRF). Sayfayı yenileyip tekrar deneyin.')
  }
  const h = await headers()
  const origin = h.get('origin')
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (origin && host) {
    let originHost: string | null = null
    try {
      originHost = new URL(origin).host
    } catch {
      // "null" or a malformed Origin: treat as a mismatch.
    }
    if (originHost !== host) throw new AuthError('İstek kaynağı doğrulanamadı.')
  }
  return s
}

export async function startSession(username: string): Promise<void> {
  const cfg = authConfig()!
  const jar = await cookies()
  jar.set(sessionCookieName(), createSessionToken(username, cfg.sessionSecret, cfg.sessionVersion), {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const jar = await cookies()
  jar.set(sessionCookieName(), '', {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Client address for rate limiting, or null when none can be trusted.
 * On Vercel the platform overwrites x-forwarded-for with the client address.
 * Behind another proxy (TRUST_PROXY=1) the last entry is the one that proxy
 * appended; earlier entries are client-controlled.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (process.env.VERCEL) return (xff?.split(',')[0] ?? h.get('x-real-ip'))?.trim().slice(0, 64) || null
  if (process.env.TRUST_PROXY === '1') return xff?.split(',').pop()?.trim().slice(0, 64) || null
  return null
}
