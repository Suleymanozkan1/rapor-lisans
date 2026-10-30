import type { Metadata, Viewport } from 'next'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/400-italic.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/big-shoulders-display/700'
import '@fontsource/big-shoulders-display/800'
import '@fontsource/big-shoulders-display/900'
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
  // Single dark theme.
  themeColor: '#121211',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
