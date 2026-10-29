import { parseDocument, stringify } from 'yaml'
import type { z } from 'zod'
import { postFrontmatterSchema, productFrontmatterSchema, type Post, type PostFrontmatter, type Product, type ProductFrontmatter } from './types'

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export class ContentParseError extends Error {}

/**
 * Splits a Markdown file into YAML front matter and body, validated by `schema`.
 * Uses the YAML "core" schema only: no custom tags and no executable
 * front matter engines (gray-matter's `---js` would eval code).
 */
function parseMarkdownFile<S extends z.ZodType>(name: string, raw: string, schema: S): { data: z.infer<S>; body: string } {
  const m = FM.exec(raw)
  if (!m) throw new ContentParseError(`${name}: front matter bulunamadı`)
  let data: unknown
  try {
    const doc = parseDocument(m[1], { schema: 'core', prettyErrors: false })
    const problem = doc.errors[0] ?? doc.warnings[0]
    if (problem) throw problem
    // Aliases are never needed in content metadata; refusing them rules out expansion bombs.
    data = doc.toJS({ maxAliasCount: 0 })
  } catch (e) {
    throw new ContentParseError(`${name}: YAML okunamadı (${(e as Error).message})`)
  }
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ContentParseError(`${name}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return { data: result.data, body: m[2].replace(/^\s*\n/, '').trimEnd() }
}

export function parsePostFile(slug: string, raw: string): Post {
  const { data, body } = parseMarkdownFile(slug, raw, postFrontmatterSchema)
  return { ...data, slug, body }
}

export function parseProductFile(slug: string, raw: string): Product {
  const { data, body } = parseMarkdownFile(slug, raw, productFrontmatterSchema)
  return { ...data, slug, body }
}

function serialize(fm: Record<string, unknown>, body: string): string {
  const clean = Object.fromEntries(
    Object.entries(fm).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  )
  const yaml = stringify(clean, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body.trim()}\n`
}

export function serializePost(fm: PostFrontmatter, body: string): string {
  return serialize(fm, body)
}

export function serializeProduct(fm: ProductFrontmatter, body: string): string {
  return serialize(fm, body)
}
