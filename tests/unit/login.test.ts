import { describe, expect, it, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/password'
import { __resetMemoryLimiter } from '@/lib/auth/rate-limit'

// Mocks for the Next.js request APIs used by the login action.
const state = { ip: '198.51.100.1', cookies: new Map<string, string>() }
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': state.ip, host: 'localhost' }),
  cookies: async () => ({
    get: (n: string) => (state.cookies.has(n) ? { value: state.cookies.get(n) } : undefined),
    set: (n: string, v: string) => state.cookies.set(n, v),
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { url })
  },
}))

const fd = (username: string, password: string) => {
  const f = new FormData()
  f.set('username', username)
  f.set('password', password)
  return f
}

describe('login action', () => {
  beforeEach(async () => {
    __resetMemoryLimiter()
    state.cookies.clear()
    vi.stubEnv('TRUST_PROXY', '1')
    vi.stubEnv('ADMIN_USERNAME', 'yonetici-x')
    vi.stubEnv('ADMIN_PASSWORD_HASH', await hashPassword('dogru-parola-123', { N: 2 ** 14, r: 8, p: 1, keyLen: 32 }))
    vi.stubEnv('SESSION_SECRET', 's'.repeat(40))
  })

  it('logs in with the right credentials and sets the session cookie', async () => {
    const { login } = await import('@/app/admin/login-actions')
    await expect(login({}, fd('yonetici-x', 'dogru-parola-123'))).rejects.toMatchObject({ url: '/admin' })
    expect([...state.cookies.keys()]).toEqual(['isg_admin'])
  })

  it('anonymous failures with a wrong username cannot lock the owner out', async () => {
    const { login } = await import('@/app/admin/login-actions')
    for (let i = 0; i < 40; i++) {
      state.ip = `203.0.113.${i}`
      await login({}, fd('admin', 'tahmin'))
    }
    state.ip = '198.51.100.77'
    await expect(login({}, fd('yonetici-x', 'dogru-parola-123'))).rejects.toMatchObject({ url: '/admin' })
  })

  it('concurrent guesses from one IP get at most 5 password checks', async () => {
    const { login } = await import('@/app/admin/login-actions')
    state.ip = '198.51.100.9'
    const results = await Promise.all(Array.from({ length: 20 }, () => login({}, fd('yonetici-x', 'yanlis'))))
    const evaluated = results.filter((r) => r.error === 'Kullanıcı adı veya parola hatalı.')
    expect(evaluated).toHaveLength(5)
    expect(results.filter((r) => r.error?.startsWith('Çok fazla'))).toHaveLength(15)
  })

  it('changing the password invalidates existing sessions', async () => {
    const { login } = await import('@/app/admin/login-actions')
    const { getAdminSession } = await import('@/lib/auth/guard')
    await login({}, fd('yonetici-x', 'dogru-parola-123')).catch(() => {})
    expect(await getAdminSession()).not.toBeNull()
    vi.stubEnv('ADMIN_PASSWORD_HASH', await hashPassword('yeni-parola-456', { N: 2 ** 14, r: 8, p: 1, keyLen: 32 }))
    expect(await getAdminSession()).toBeNull()
  })
})
