import type { Metadata, Viewport } from 'next'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-semi-condensed/500.css'
import '@fontsource/barlow-semi-condensed/600.css'
import '@fontsource/barlow-semi-condensed/700.css'
import '@fontsource/barlow-semi-condensed/800.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/source-serif-4/600.css'
import './globals.css'
import { getSettings } from '@/lib/content'
import { siteUrl } from '@/lib/env'

export function generateMetadata(): Metadata {
  const s = getSettings()
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.siteName, template: `%s | ${s.siteName}` },
    description: s.description || undefined,
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
    openGraph: { siteName: s.siteName, locale: 'tr_TR', type: 'website' },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d131a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
