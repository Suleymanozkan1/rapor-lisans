import { parseDocument, stringify } from 'yaml'
import { postFrontmatterSchema, type Post, type PostFrontmatter } from './types'

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export class ContentParseError extends Error {}

/**
 * Splits a Markdown file into YAML front matter and body.
 * Uses the YAML "core" schema only: no custom tags and no executable
 * front matter engines (gray-matter's `---js` would eval code).
 */
export function parsePostFile(slug: string, raw: string): Post {
  const m = FM.exec(raw)
  if (!m) throw new ContentParseError(`${slug}: front matter bulunamadı`)
  let data: unknown
  try {
    const doc = parseDocument(m[1], { schema: 'core', prettyErrors: false })
    const problem = doc.errors[0] ?? doc.warnings[0]
    if (problem) throw problem
    // Aliases are never needed in post metadata; refusing them rules out expansion bombs.
    data = doc.toJS({ maxAliasCount: 0 })
  } catch (e) {
    throw new ContentParseError(`${slug}: YAML okunamadı (${(e as Error).message})`)
  }
  const result = postFrontmatterSchema.safeParse(data)
  if (!result.success) {
    throw new ContentParseError(`${slug}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return { ...result.data, slug, body: m[2].replace(/^\s*\n/, '').trimEnd() }
}

export function serializePost(fm: PostFrontmatter, body: string): string {
  const clean = Object.fromEntries(
    Object.entries(fm).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  )
  const yaml = stringify(clean, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body.trim()}\n`
}
