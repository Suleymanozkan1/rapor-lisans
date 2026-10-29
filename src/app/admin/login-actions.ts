'use server'

import { redirect } from 'next/navigation'
import { authConfig } from '@/lib/env'
import { verifyPassword } from '@/lib/auth/password'
import { consume, LOGIN_LIMITS, resetLimit } from '@/lib/auth/rate-limit'
import { clientIp, endSession, getAdminSession, startSession } from '@/lib/auth/guard'
import { createHash, timingSafeEqual } from 'node:crypto'
import { verifyCsrfToken } from '@/lib/auth/session'

export type LoginState = { error?: string }

const GENERIC = 'Kullanıcı adı veya parola hatalı.'

function sameString(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const cfg = authConfig()
  if (!cfg) return { error: 'Yönetim paneli yapılandırılmamış (ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SESSION_SECRET).' }

  const username = String(formData.get('username') ?? '').slice(0, 100)
  const password = String(formData.get('password') ?? '').slice(0, 1024)
  const ip = await clientIp()
  const ipKey = ip ? `login:ip:${ip}` : null
  const usernameOk = sameString(username, cfg.username)
  // Every attempt spends the budget of the username it names, right or wrong, so responses and
  // timing do not reveal whether a username exists. Only the real account's bucket is protected
  // from eviction; wrong-username buckets are keyed by hash and evictable.
  const accountKey = usernameOk
    ? `login:acct:${cfg.username}`
    : `login:user:${createHash('sha256').update(username).digest('base64url').slice(0, 22)}`
  const blocked = (retry: number) => {
    console.warn(JSON.stringify({ type: 'admin_login_blocked', at: new Date().toISOString(), ip }))
    return { error: `Çok fazla başarısız deneme. ${Math.ceil(retry / 60)} dakika sonra tekrar deneyin.` }
  }

  // Slots are reserved before the slow hash runs, so parallel requests cannot exceed the limit.
  // Without a trustworthy client address there is no per-IP bucket: a shared one would let five
  // anonymous requests lock everyone out. The per-username bucket still caps guessing.
  if (ipKey) {
    const ipLimit = await consume(ipKey, LOGIN_LIMITS.perIp.max, LOGIN_LIMITS.perIp.windowSeconds)
    if (!ipLimit.allowed) return blocked(ipLimit.retryAfterSeconds)
  }
  const acct = await consume(accountKey, LOGIN_LIMITS.perAccount.max, LOGIN_LIMITS.perAccount.windowSeconds)
  if (!acct.allowed) return blocked(acct.retryAfterSeconds)

  // Always run the hash so response time does not reveal whether the username matched.
  const passwordOk = await verifyPassword(password, cfg.passwordHash)
  if (!(usernameOk && passwordOk)) {
    console.warn(JSON.stringify({ type: 'admin_login_failed', at: new Date().toISOString(), ip }))
    return { error: GENERIC }
  }

  await Promise.all([ipKey ? resetLimit(ipKey) : null, resetLimit(accountKey)])
  await startSession(cfg.username)
  console.info(JSON.stringify({ type: 'admin_login', at: new Date().toISOString(), user: cfg.username, ip }))
  redirect('/admin')
}

export async function logout(formData: FormData): Promise<void> {
  const s = await getAdminSession()
  // Logout is harmless, but still require the CSRF token so a third-party page cannot sign the admin out.
  if (s && verifyCsrfToken(s.sid, formData.get('csrf'), authConfig()!.sessionSecret)) {
    await endSession()
    console.info(JSON.stringify({ type: 'admin_logout', at: new Date().toISOString(), user: s.sub }))
  }
  redirect('/admin/giris')
}
