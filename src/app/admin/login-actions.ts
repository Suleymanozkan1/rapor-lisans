'use server'

import { redirect } from 'next/navigation'
import { authConfig } from '@/lib/env'
import { verifyPassword } from '@/lib/auth/password'
import { checkLimit, LOGIN_LIMITS, recordFailure, resetLimit } from '@/lib/auth/rate-limit'
import { clientIp, endSession, getAdminSession, startSession } from '@/lib/auth/guard'
import { timingSafeEqual } from 'node:crypto'
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
  const ipKey = `login:ip:${ip}`
  const accountKey = `login:acct:${cfg.username}`

  const [ipLimit, acctLimit] = await Promise.all([
    checkLimit(ipKey, LOGIN_LIMITS.perIp.max),
    checkLimit(accountKey, LOGIN_LIMITS.perAccount.max),
  ])
  if (!ipLimit.allowed || !acctLimit.allowed) {
    const wait = Math.ceil(Math.max(ipLimit.retryAfterSeconds, acctLimit.retryAfterSeconds) / 60)
    console.warn(JSON.stringify({ type: 'admin_login_blocked', at: new Date().toISOString(), ip }))
    return { error: `Çok fazla başarısız deneme. ${wait} dakika sonra tekrar deneyin.` }
  }

  // Always run the hash so response time does not reveal whether the username matched.
  const passwordOk = await verifyPassword(password, cfg.passwordHash)
  const ok = sameString(username, cfg.username) && passwordOk
  if (!ok) {
    await Promise.all([
      recordFailure(ipKey, LOGIN_LIMITS.perIp.windowSeconds),
      recordFailure(accountKey, LOGIN_LIMITS.perAccount.windowSeconds),
    ])
    console.warn(JSON.stringify({ type: 'admin_login_failed', at: new Date().toISOString(), ip }))
    return { error: GENERIC }
  }

  await resetLimit(ipKey)
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
