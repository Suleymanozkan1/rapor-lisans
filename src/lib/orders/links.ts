import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * Order page and download links carry an HMAC of the order id and the link
 * version: nothing secret is stored, a renewed link (version + 1) makes the
 * old one invalid, and rotating DOWNLOAD_SECRET invalidates all links.
 * The secret is separate from SESSION_SECRET so logging the admin out
 * everywhere does not break customers' links.
 */

export function linkToken(secret: string, orderId: string, version: number): string {
  return createHmac('sha256', secret).update(`order-link:v1:${orderId}:${version}`).digest('base64url')
}

export function verifyLinkToken(secret: string, orderId: string, version: number, token: string): boolean {
  const expected = Buffer.from(linkToken(secret, orderId, version))
  const given = Buffer.from(String(token))
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export const orderPagePath = (secret: string, orderId: string, version: number) => `/siparis/${orderId}/${linkToken(secret, orderId, version)}`
export const downloadPath = (secret: string, orderId: string, version: number) => `/indir/${orderId}/${linkToken(secret, orderId, version)}`
