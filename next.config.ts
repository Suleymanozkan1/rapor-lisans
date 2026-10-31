import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// The checkout form ends with a redirect to iyzico's hosted payment page; without
// JavaScript that redirect follows a form POST, so form-action must allow it.
// The e2e suite points IYZICO_BASE_URL at a local mock.
const mockIyzico = /^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.IYZICO_BASE_URL ?? '') ? ` ${process.env.IYZICO_BASE_URL}` : ''

/*
 * Pages are statically generated, so a per-request nonce is not possible
 * for public pages; Next.js' inline bootstrap scripts need 'unsafe-inline'.
 * Article HTML is sanitized server-side, and no third-party origin is
 * allowed for scripts or frames. Forms may lead to iyzico's payment page,
 * and the admin browser may upload product files to Vercel Blob.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Admin product-file uploads go from the browser straight to Vercel Blob. The trailing slash
  // matters: the client calls /api/blob/?pathname=…, and a CSP path without one matches exactly.
  `connect-src 'self' https://vercel.com/api/blob/ https://*.blob.vercel-storage.com${isDev ? ' ws:' : ''}`,
  "frame-ancestors 'none'",
  `form-action 'self' https://*.iyzipay.com${mockIyzico}`,
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
]

const nextConfig: NextConfig = {
  // Lets the e2e suite build the fixture site without touching .next
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // PGlite (local/e2e order database) ships WebAssembly and must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite', 'pdfjs-dist', '@napi-rs/canvas'],
  // Product preview rendering (admin only) reads pdf.js font, CMap and wasm data from disk.
  outputFileTracingIncludes: {
    '/admin/**': ['./node_modules/pdfjs-dist/standard_fonts/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/wasm/**'],
  },
  reactStrictMode: true,
  experimental: {
    // Uploads are limited to 3 MB in code; Vercel rejects bodies over 4.5 MB.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; style-src 'none'; sandbox" },
        ],
      },
    ]
  },
}

export default nextConfig
