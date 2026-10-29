import { describe, expect, it } from 'vitest'
import { jsonLd, clip } from '@/lib/seo'

describe('jsonLd', () => {
  it('cannot break out of the script tag', () => {
    const out = jsonLd({ headline: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out).headline).toBe('</script><script>alert(1)</script>')
  })
})

describe('clip', () => {
  it('cuts on a word boundary', () => {
    expect(clip('kısa', 10)).toBe('kısa')
    expect(clip('bir iki üç dört beş altı yedi', 15).endsWith('…')).toBe(true)
  })
})
