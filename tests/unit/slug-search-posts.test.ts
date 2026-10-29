import { describe, expect, it } from 'vitest'
import { slugify, isValidSlug } from '@/lib/slug'
import { normalize, searchDocs, type SearchDoc } from '@/lib/search'
import { allTags, hasTag, isPublic, paginate, relatedPosts } from '@/lib/posts'
import type { Post } from '@/lib/types'

describe('slugify', () => {
  it('transliterates Turkish characters', () => {
    expect(slugify('İş Sağlığı ve Güvenliği: Çalışma Şartları')).toBe('is-sagligi-ve-guvenligi-calisma-sartlari')
    expect(slugify('  ---  ')).toBe('')
    expect(slugify('ÖĞÜŞÇIı')).toBe('oguscii')
  })
  it('validates and rejects reserved or unsafe slugs', () => {
    expect(isValidSlug('risk-analizi')).toBe(true)
    for (const bad of ['', 'sayfa', 'admin', '../x', 'a/b', 'A', 'a--b', '-a', 'a'.repeat(81)]) expect(isValidSlug(bad)).toBe(false)
  })
})

const post = (over: Partial<Post>): Post => ({
  slug: 'x',
  body: '',
  title: 'x',
  excerpt: '',
  status: 'published',
  createdAt: '2026-01-01',
  publishedAt: '2026-01-01',
  tags: [],
  references: [],
  revision: 0,
  ...over,
})

describe('visibility', () => {
  it('only published posts with a past publish date are public', () => {
    const now = new Date('2026-06-01')
    expect(isPublic(post({}), now)).toBe(true)
    expect(isPublic(post({ status: 'draft' }), now)).toBe(false)
    expect(isPublic(post({ publishedAt: undefined }), now)).toBe(false)
    expect(isPublic(post({ publishedAt: '2099-01-01' }), now)).toBe(false)
  })
})

describe('pagination and related', () => {
  it('paginates', () => {
    const r = paginate([1, 2, 3, 4, 5], 2, 2)
    expect(r).toEqual({ items: [3, 4], page: 2, totalPages: 3 })
    expect(paginate([], 1).totalPages).toBe(1)
  })
  it('ranks related posts by category and shared tags', () => {
    const a = post({ slug: 'a', category: 'c1', tags: ['t1', 't2'] })
    const b = post({ slug: 'b', category: 'c1', tags: [] })
    const c = post({ slug: 'c', category: 'c2', tags: ['t1', 't2'] })
    const d = post({ slug: 'd', category: 'c3', tags: [] })
    expect(relatedPosts(a, [a, b, c, d]).map((p) => p.slug)).toEqual(['b', 'c'])
  })
})

describe('tags', () => {
  it('groups display labels by slug and matches by slug', () => {
    const posts = [post({ tags: ['Yüksekte çalışma', 'KKD'] }), post({ tags: ['yüksekte Çalışma'] })]
    expect(allTags(posts)).toEqual([
      { slug: 'yuksekte-calisma', label: 'Yüksekte çalışma', count: 2 },
      { slug: 'kkd', label: 'KKD', count: 1 },
    ])
    expect(hasTag(posts[1], 'yuksekte-calisma')).toBe(true)
  })
})

describe('search', () => {
  const docs: SearchDoc[] = [
    { slug: 'a', title: 'Yüksekte çalışma', excerpt: '', tags: ['İskele'], text: 'Korkuluk', category: 'saha' },
    { slug: 'b', title: 'İş kazası bildirimi', excerpt: 'SGK', tags: [], text: 'üç iş günü', category: 'mevzuat' },
  ]
  it('is case and diacritic insensitive for Turkish', () => {
    expect(normalize('İŞ KAZASI')).toBe('is kazasi')
    expect(searchDocs(docs, 'yuksekte').map((d) => d.slug)).toEqual(['a'])
    expect(searchDocs(docs, 'IS KAZASI').map((d) => d.slug)).toEqual(['b'])
  })
  it('requires all terms and supports filters', () => {
    expect(searchDocs(docs, 'iskele korkuluk')).toHaveLength(1)
    expect(searchDocs(docs, 'iskele sgk')).toHaveLength(0)
    expect(searchDocs(docs, '', { category: 'mevzuat' }).map((d) => d.slug)).toEqual(['b'])
    expect(searchDocs(docs, '', { tag: 'iskele' }).map((d) => d.slug)).toEqual(['a'])
  })
})
