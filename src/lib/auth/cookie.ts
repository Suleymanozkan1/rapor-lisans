/** Shared by the proxy and server code; keep free of server-only imports. */
export function sessionCookieSecure(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1'
}

/** The __Host- prefix forces Secure, Path=/ and no Domain in the browser. */
export function sessionCookieName(): string {
  return sessionCookieSecure() ? '__Host-isg_admin' : 'isg_admin'
}
