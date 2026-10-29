import { getPublishedPosts, getSettings } from '@/lib/content'
import { siteUrl } from '@/lib/env'

export const dynamic = 'force-static'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function GET() {
  const s = getSettings()
  const base = siteUrl()
  const posts = getPublishedPosts().slice(0, 30)
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid isPermaLink="true">${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt!).toUTCString()}</pubDate>
      ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}
    </item>`,
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(s.siteName)}</title>
    <link>${base}/</link>
    <description>${esc(s.description || s.tagline || s.siteName)}</description>
    <language>tr-TR</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
