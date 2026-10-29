import { describe, expect, it } from 'vitest'
import { parsePostFile, serializePost, ContentParseError } from '@/lib/frontmatter'

const base = `---
title: Deneme yazısı
status: published
createdAt: 2026-01-01T08:00:00Z
publishedAt: 2026-01-02T08:00:00Z
tags: [iskele]
---

Gövde`

describe('front matter', () => {
  it('parses and round-trips', () => {
    const p = parsePostFile('deneme', base)
    expect(p.title).toBe('Deneme yazısı')
    expect(p.tags).toEqual(['iskele'])
    expect(p.revision).toBe(0)
    const { slug, body, ...fm } = p
    const again = parsePostFile(slug, serializePost(fm, body))
    expect(again).toEqual(p)
  })

  it('rejects files without front matter', () => {
    expect(() => parsePostFile('x', 'no front matter')).toThrow(ContentParseError)
  })

  it('does not execute JS front matter engines', () => {
    const evil = `---js\n{ title: (globalThis.__pwned = 1, 'x') }\n---\nbody`
    expect(() => parsePostFile('x', evil)).toThrow(ContentParseError)
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined()
  })

  it('rejects YAML aliases (billion laughs) and custom tags', () => {
    const bomb = `---\na: &a [x, x]\nb: *a\ntitle: abc\ncreatedAt: 2026-01-01\n---\n`
    expect(() => parsePostFile('x', bomb)).toThrow(ContentParseError)
    const tag = `---\ntitle: !!js/function "function(){}"\ncreatedAt: 2026-01-01\n---\n`
    expect(() => parsePostFile('x', tag)).toThrow(ContentParseError)
  })

  it('validates fields: bad cover path, bad reference URL, bad tag', () => {
    const withCover = base.replace('tags: [iskele]', 'cover: { src: "https://evil.example/x.png", alt: "x" }')
    expect(() => parsePostFile('x', withCover)).toThrow(/cover/)
    const withRef = base.replace('tags: [iskele]', 'references: [{ title: a, url: "javascript:alert(1)" }]')
    expect(() => parsePostFile('x', withRef)).toThrow(/references/)
    const withTag = base.replace('tags: [iskele]', 'tags: ["<>"]')
    expect(() => parsePostFile('x', withTag)).toThrow(/tags/)
  })
})
