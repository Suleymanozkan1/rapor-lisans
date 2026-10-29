import { slugify } from './slug'

export type SearchDoc = {
  slug: string
  title: string
  excerpt: string
  category?: string
  categoryName?: string
  tags: string[]
  publishedAt?: string
  text: string
}

/** Case- and diacritic-insensitive, Turkish-aware normalisation. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchDocs(docs: SearchDoc[], q: string, filters: { category?: string; tag?: string } = {}): SearchDoc[] {
  const terms = normalize(q.slice(0, 200)).split(' ').filter(Boolean)
  return docs
    .filter((d) => (!filters.category || d.category === filters.category) && (!filters.tag || d.tags.some((t) => slugify(t) === filters.tag)))
    .map((d) => {
      const title = normalize(d.title)
      const body = normalize(`${d.excerpt} ${d.tags.join(' ')} ${d.text}`)
      let score = 0
      for (const t of terms) {
        if (title.includes(t)) score += 3
        else if (body.includes(t)) score += 1
        else return { d, score: -1 }
      }
      return { d, score }
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || (b.d.publishedAt ?? '').localeCompare(a.d.publishedAt ?? ''))
    .map((x) => x.d)
}
