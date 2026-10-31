import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import type { Root as MdRoot } from 'mdast'
import type { Root as HastRoot, Element } from 'hast'

export type TocItem = { id: string; text: string; depth: 2 | 3 }

/**
 * Allow-list for rendered article HTML. Raw HTML inside Markdown is never
 * passed through (remark-rehype runs without allowDangerousHtml), and the
 * sanitizer (GitHub-style default schema, stricter URL protocols) removes
 * anything else as a second layer. Heading ids are added after sanitizing.
 */
const schema = {
  ...defaultSchema,
  // remark-rehype already prefixes footnote ids with "user-content-"; Markdown cannot set any other id
  // (raw HTML is dropped), so the sanitizer must not prefix them a second time.
  clobberPrefix: '',
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto', 'tel'], src: ['http', 'https'] },
}

/** Ids used by the page template, plus anything that could shadow a window global (e.g. __next_f). */
const RESERVED_IDS = new Set(['icerik', 'toc-title', 'refs-title', 'tags-title', 'share-title', 'related-title', 'panel-icerik'])

function rehypeSafeHeadingIds() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      const id = node.properties?.id
      if (/^h[1-6]$/.test(node.tagName) && typeof id === 'string' && (RESERVED_IDS.has(id) || !/^[\p{L}\p{N}]/u.test(id))) {
        node.properties.id = `bolum-${id.replace(/^[^\p{L}\p{N}]+/u, '') || 'baslik'}`
      }
    })
  }
}

/** Make outbound links safe and mark them, and keep images lazy. */
function rehypeHardenLinks() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a') {
        const href = String(node.properties?.href ?? '')
        if (/^https?:\/\//i.test(href)) {
          node.properties = { ...node.properties, rel: ['noopener', 'noreferrer', 'nofollow'], target: '_blank' }
        }
      }
      if (node.tagName === 'img') {
        node.properties = { ...node.properties, loading: 'lazy', decoding: 'async' }
        if (!node.properties.alt) node.properties.alt = ''
      }
    })
  }
}

function headingSlug(text: string, seen: Map<string, number>): string {
  // Mirrors github-slugger (used by rehype-slug) closely enough for ToC links;
  // the ToC is built from the rendered HTML ids, so this is only a fallback.
  const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-')
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n ? `${base}-${n}` : base
}

export type RenderedMarkdown = { html: string; toc: TocItem[]; words: number }

export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeSlug)
    .use(rehypeSafeHeadingIds)
    .use(rehypeHardenLinks)

  const mdast = processor.parse(source) as MdRoot
  const words = plainText(mdast).split(' ').filter(Boolean).length
  const hast = (await processor.run(mdast)) as HastRoot

  const toc: TocItem[] = []
  const seen = new Map<string, number>()
  visit(hast, 'element', (node: Element) => {
    if (node.tagName === 'h2' || node.tagName === 'h3') {
      const text = hastText(node)
      const id = typeof node.properties?.id === 'string' ? node.properties.id : headingSlug(text, seen)
      toc.push({ id, text, depth: node.tagName === 'h2' ? 2 : 3 })
    }
  })

  const html = unified().use(rehypeStringify).stringify(hast)
  return { html, toc, words }
}

function hastText(node: Element | HastRoot): string {
  let out = ''
  visit(node, 'text', (t: { value: string }) => {
    out += t.value
  })
  return out
}

/** Word count without rendering, for list cards. */
export function markdownWordCount(source: string): number {
  return markdownToPlainText(source).split(' ').filter(Boolean).length
}

/** Turkish words are long; ~180 words per minute, rounded up. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 180))
}

/** Plain text for search indexes and meta descriptions. */
export function markdownToPlainText(source: string): string {
  return plainText(unified().use(remarkParse).use(remarkGfm).parse(source))
}

/** Text of every block, separated by spaces (mdast-util-to-string would glue blocks together). */
function plainText(tree: MdRoot): string {
  const parts: string[] = []
  visit(tree, (node) => {
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      // includeHtml:false keeps HTML comments and inline tags (dropped from the page) out of the search index.
      parts.push(toString(node, { includeHtml: false }))
      return 'skip'
    }
  })
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Markdown of a page-builder text block, rendered synchronously (blocks render
 * both on the server and in the editor). Same allow-list and link hardening as
 * articles; no heading ids, so blocks cannot clash with ids on the page.
 */
export function renderBlockMarkdown(source: string): string {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSanitize, { ...schema, clobber: [], strip: ['script'] }).use(rehypeHardenLinks)
  const hast = processor.runSync(processor.parse(source)) as HastRoot
  return unified().use(rehypeStringify).stringify(hast)
}
