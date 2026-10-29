import { describe, expect, it } from 'vitest'
import { renderMarkdown, readingMinutes, markdownToPlainText } from '@/lib/markdown'

describe('renderMarkdown', () => {
  it('drops raw HTML, scripts and event handlers', async () => {
    const { html } = await renderMarkdown(
      [
        '<script>alert(1)</script>',
        '<img src=x onerror="alert(1)">',
        '<iframe src="https://evil.example"></iframe>',
        '<a href="javascript:alert(1)">raw</a>',
        '<div style="background:url(javascript:alert(1))">x</div>',
      ].join('\n\n'),
    )
    expect(html).not.toMatch(/<script|onerror|<iframe|javascript:|style=/i)
  })

  it('removes javascript: and data: URLs from Markdown links and images', async () => {
    const { html } = await renderMarkdown('[a](javascript:alert(1)) [b](data:text/html,hi) ![c](javascript:alert(1)) [d](vbscript:x)')
    expect(html).not.toMatch(/javascript:|data:text|vbscript:/i)
  })

  it('keeps safe links and hardens external ones', async () => {
    const { html } = await renderMarkdown('[mevzuat](https://www.mevzuat.gov.tr) [iç](/blog/x) [posta](mailto:a@b.co)')
    expect(html).toContain('href="https://www.mevzuat.gov.tr"')
    expect(html).toMatch(/rel="noopener noreferrer nofollow"/)
    expect(html).toContain('href="/blog/x"')
    expect(html).toContain('href="mailto:a@b.co"')
  })

  it('builds a table of contents from h2/h3 with matching ids', async () => {
    const { html, toc } = await renderMarkdown('## Risk analizi\n\nmetin\n\n### Fine-Kinney yöntemi\n\n## Risk analizi')
    expect(toc.map((t) => [t.depth, t.text])).toEqual([
      [2, 'Risk analizi'],
      [3, 'Fine-Kinney yöntemi'],
      [2, 'Risk analizi'],
    ])
    for (const t of toc) expect(html).toContain(`id="${t.id}"`)
    expect(new Set(toc.map((t) => t.id)).size).toBe(3)
  })

  it('does not let user markup set heading ids (no DOM clobbering)', async () => {
    const { html } = await renderMarkdown('<h2 id="__next">x</h2>\n\n<a name="location">y</a>')
    expect(html).not.toContain('id="__next"')
    expect(html).not.toContain('name="location"')
  })

  it('keeps heading ids from shadowing window globals or template ids', async () => {
    const { html, toc } = await renderMarkdown('## __next_f\n\n## icerik\n\n## Normal başlık')
    expect(html).not.toMatch(/id="(__next_f|icerik)"/)
    expect(toc.map((t) => t.id)).toEqual(['bolum-next_f', 'bolum-icerik', 'normal-başlık'])
  })

  it('footnote links point at existing ids', async () => {
    const { html } = await renderMarkdown('Metin[^1]\n\n[^1]: Not')
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(html).toContain(`id="${h}"`)
  })

  it('leaves HTML comments and tags (not their text) out of plain text', () => {
    expect(markdownToPlainText('Görünür <!-- gizli not --> metin <span hidden>saklı</span>')).toBe('Görünür metin saklı')
  })

  it('counts words and reading time', async () => {
    const { words } = await renderMarkdown('bir iki üç dört')
    expect(words).toBe(4)
    expect(readingMinutes(0)).toBe(1)
    expect(readingMinutes(1000)).toBe(5)
  })

  it('extracts plain text', () => {
    expect(markdownToPlainText('## Başlık\n\n**kalın** [link](https://x.y)')).toBe('Başlık kalın link')
  })
})
