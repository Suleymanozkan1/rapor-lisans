import { describe, expect, it } from 'vitest'
import { PageValidationError, validateBuilderData } from '@/lib/pages/validate'
import { isValidPageSlug } from '@/lib/pages/model'
import { safeHref, videoEmbed } from '@/components/builder/safe'

const block = (type: string, props: Record<string, unknown>) => ({ type, props: { id: `${type}-1`, ...props } })
const page = (...content: unknown[]) => ({ root: { props: { title: 'T' } }, content })

describe('page validation', () => {
  it('keeps known props, drops unknown ones and falls back for bad choices', () => {
    const d = validateBuilderData(page(block('Baslik', { metin: 'Merhaba', seviye: 'h9', onclick: 'alert(1)', boyut: 'dev' })))
    const p = d.content[0].props
    expect(p.metin).toBe('Merhaba')
    expect(p.seviye).toBe('h2')
    expect(p.boyut).toBe('dev')
    expect(p).not.toHaveProperty('onclick')
    expect(p._adv).toMatchObject({ gizle: 'yok', alt: 'm' })
  })

  it('refuses unknown blocks, unsafe links, outside images and foreign videos', () => {
    const bad = [
      page(block('Script', {})),
      page(block('Dugmeler', { dugmeler: [{ etiket: 'x', adres: 'javascript:alert(1)', stil: 'birincil' }] })),
      page(block('Dugmeler', { dugmeler: [{ etiket: 'x', adres: '//evil.example', stil: 'birincil' }] })),
      page(block('Gorsel', { gorsel: 'https://evil.example/a.jpg' })),
      page(block('Gorsel', { gorsel: '/uploads/../../etc/passwd.jpg' })),
      page(block('Video', { adres: 'https://evil.example/watch?v=abcdefghijk' })),
      page(block('Baslik', { _adv: { baglanti: 'Bad Id!' } })),
      { root: { props: {} }, content: 'x' },
    ]
    for (const b of bad) expect(() => validateBuilderData(b), JSON.stringify(b)).toThrow(PageValidationError)
  })

  it('walks slots recursively and limits depth and size', () => {
    const inner = block('Metin', { icerik: '**a**' })
    const d = validateBuilderData(page(block('Bolum', { icerik: [block('Sutunlar', { s1: [inner], s2: [], s3: [], s4: [] })] })))
    const cols = (d.content[0].props.icerik as { props: { s1: { props: { icerik: string } }[] } }[])[0]
    expect(cols.props.s1[0].props.icerik).toBe('**a**')

    let deep: unknown = inner
    for (let i = 0; i < 8; i++) deep = block('Bolum', { icerik: [deep] })
    expect(() => validateBuilderData(page(deep))).toThrow(/iç içe/)
    expect(() => validateBuilderData(page(...Array.from({ length: 199 }, () => block('Bolum', { icerik: [inner, inner] }))))).toThrow(/en fazla 300/)
  })

  it('clamps numbers to the field range', () => {
    const d = validateBuilderData(page(block('SonYazilar', { sayi: 9999 })))
    expect(d.content[0].props.sayi).toBe(12)
  })
})

describe('page helpers', () => {
  it('accept site paths, anchors, web, mail and phone links only', () => {
    for (const ok of ['/blog', '/magaza/x?y=1', '#iletisim', 'https://example.com/a', 'mailto:a@b.co', 'tel:+90 555 000 00 00']) expect(safeHref(ok), ok).toBeTruthy()
    for (const no of ['javascript:alert(1)', '//evil.example', 'data:text/html,x', 'ftp://x', ' ', 'vbscript:x']) expect(safeHref(no), no).toBeUndefined()
  })

  it('turn YouTube and Vimeo links into privacy-friendly embeds', () => {
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ')?.src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/)
    expect(videoEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.id).toBe('dQw4w9WgXcQ')
    expect(videoEmbed('https://vimeo.com/123456789')?.src).toMatch(/^https:\/\/player\.vimeo\.com\/video\/123456789/)
    expect(videoEmbed('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('keep custom pages off paths the site already uses', () => {
    for (const s of ['blog', 'magaza', 'admin', 'api', 'hakkimda', 'uploads']) expect(isValidPageSlug(s), s).toBe(false)
    expect(isValidPageSlug('egitim-takvimi')).toBe(true)
  })
})
