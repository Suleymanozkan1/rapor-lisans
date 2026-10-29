import { NextResponse, type NextRequest } from 'next/server'
import { sessionCookieName } from '@/lib/auth/cookie'

/*
 * Optimistic gate for /admin: sends visitors without a session cookie to
 * the login page and marks every admin response noindex. It only checks
 * that a cookie exists; the signature, expiry and CSRF are verified in
 * each admin page and Server Action (see src/lib/auth/guard.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isLogin = pathname === '/admin/giris'
  if (!isLogin && !req.cookies.has(sessionCookieName())) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/giris'
    url.search = ''
    const res = NextResponse.redirect(url)
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }
  const res = NextResponse.next()
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = { matcher: ['/admin', '/admin/:path*'] }
