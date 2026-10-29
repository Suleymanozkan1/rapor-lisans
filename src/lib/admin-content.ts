import 'server-only'
import { parsePostFile, serializePost, ContentParseError } from './frontmatter'
import { getStore, ConflictError, type Change, type ContentStore, type LogicalPath } from './store'
import { categoriesSchema, settingsSchema, postFrontmatterSchema, type Category, type Post, type PostFrontmatter, type Settings } from './types'
import { DEFAULT_SETTINGS } from './defaults'
import { mediaIndexSchema, type MediaItem } from './media'
import { isValidSlug, slugify } from './slug'

/*
 * Admin-side content access. Always reads the current state from the
 * store (GitHub in production), never the build snapshot, and passes the
 * file SHA back on save for optimistic locking.
 */

export type Versioned<T> = { value: T; sha: string | null }
export type AdminPost = Post & { sha: string }
export type BrokenFile = { path: string; error: string }

const postPath = (slug: string): LogicalPath => {
  if (!isValidSlug(slug)) throw new Error('Geçersiz slug')
  return `content/posts/${slug}.md`
}

function audit(user: string, action: string, target: string) {
  // Who / what / when; never passwords, tokens or cookies.
  console.info(JSON.stringify({ type: 'admin_audit', at: new Date().toISOString(), user, action, target }))
}

function message(user: string, action: string, target: string) {
  return `panel(${user}): ${action} ${target}`.slice(0, 200)
}

async function readJson<T>(store: ContentStore, p: LogicalPath, parse: (v: unknown) => T, fallback: T): Promise<Versioned<T>> {
  const f = await store.read(p)
  if (!f) return { value: fallback, sha: null }
  return { value: parse(JSON.parse(f.content.toString('utf8'))), sha: f.sha }
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n'

export async function listAdminPosts(): Promise<{ posts: AdminPost[]; broken: BrokenFile[] }> {
  const store = getStore()
  const entries = (await store.list('content/posts')).filter((e) => e.path.endsWith('.md'))
  const files = await store.readMany(entries.map((e) => e.path))
  const posts: AdminPost[] = []
  const broken: BrokenFile[] = []
  for (const [p, f] of files) {
    const slug = p.slice('content/posts/'.length, -3)
    try {
      posts.push({ ...parsePostFile(slug, f.content.toString('utf8')), sha: f.sha })
    } catch (e) {
      broken.push({ path: p, error: e instanceof ContentParseError ? e.message : 'Okunamadı' })
    }
  }
  posts.sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  return { posts, broken }
}

export async function getAdminPost(slug: string): Promise<AdminPost | null> {
  if (!isValidSlug(slug)) return null
  const f = await getStore().read(postPath(slug))
  if (!f) return null
  return { ...parsePostFile(slug, f.content.toString('utf8')), sha: f.sha }
}

export type SavePostInput = {
  originalSlug: string | null
  sha: string | null
  slug: string
  frontmatter: Omit<PostFrontmatter, 'createdAt' | 'revision' | 'publishedAt' | 'updatedAt'> & { updatedAt?: string }
  body: string
}

export async function savePost(input: SavePostInput, user: string): Promise<string> {
  const store = getStore()
  const now = new Date().toISOString()
  const existing = input.originalSlug ? await getAdminPost(input.originalSlug) : null
  if (input.originalSlug && !existing) throw new ConflictError('Yazı bulunamadı; silinmiş olabilir.')
  if (existing && existing.sha !== input.sha) throw new ConflictError('Yazı başka bir oturumda değiştirilmiş. Sayfayı yenileyin.')

  const willPublish = input.frontmatter.status === 'published'
  const fm: PostFrontmatter = postFrontmatterSchema.parse({
    ...input.frontmatter,
    createdAt: existing?.createdAt ?? now,
    publishedAt: willPublish ? (existing?.publishedAt ?? now) : existing?.publishedAt,
    // An explicit "update date" from the editor wins; otherwise stamp edits of published posts.
    updatedAt: input.frontmatter.updatedAt || (existing && willPublish ? now : existing?.updatedAt),
    revision: existing ? existing.revision + (willPublish && existing.status === 'published' ? 1 : 0) : 0,
  })

  const changes: Change[] = []
  const slugChanged = existing && existing.slug !== input.slug
  if (!existing || slugChanged) {
    changes.push({ path: postPath(input.slug), content: serializePost(fm, input.body), expectedSha: null })
    if (slugChanged) changes.push({ path: postPath(existing.slug), delete: true, expectedSha: existing.sha })
  } else {
    changes.push({ path: postPath(input.slug), content: serializePost(fm, input.body), expectedSha: existing.sha })
  }
  const action = !existing ? 'yazı oluşturdu' : slugChanged ? `yazının adresini değiştirdi (eski: ${existing.slug}), yeni:` : 'yazıyı güncelledi'
  await store.commit(changes, message(user, action, input.slug))
  audit(user, action, input.slug)
  return input.slug
}

export async function setPostStatus(slug: string, sha: string, status: 'draft' | 'published', user: string) {
  const post = await getAdminPost(slug)
  if (!post) throw new ConflictError('Yazı bulunamadı.')
  if (post.sha !== sha) throw new ConflictError('Yazı başka bir oturumda değiştirilmiş. Sayfayı yenileyin.')
  const { slug: _s, body, sha: _sha, ...fm } = post
  void _s
  void _sha
  const next: PostFrontmatter = { ...fm, status, publishedAt: status === 'published' ? (fm.publishedAt ?? new Date().toISOString()) : fm.publishedAt }
  const action = status === 'published' ? 'yayınladı' : 'yayından kaldırdı'
  await getStore().commit([{ path: postPath(slug), content: serializePost(next, body), expectedSha: sha }], message(user, action, slug))
  audit(user, action, slug)
}

export async function deletePost(slug: string, sha: string, user: string) {
  await getStore().commit([{ path: postPath(slug), delete: true, expectedSha: sha }], message(user, 'yazıyı sildi', slug))
  audit(user, 'yazıyı sildi', slug)
}

/* Categories */

export async function getAdminCategories(): Promise<Versioned<Category[]>> {
  return readJson(getStore(), 'content/categories.json', (v) => categoriesSchema.parse(v), [])
}

export async function saveCategories(next: Category[], sha: string | null, user: string, action: string) {
  const parsed = categoriesSchema.parse(next)
  const slugs = new Set<string>()
  for (const c of parsed) {
    if (slugs.has(c.slug)) throw new Error(`"${c.slug}" kategori adresi birden fazla kez kullanılmış.`)
    slugs.add(c.slug)
  }
  await getStore().commit([{ path: 'content/categories.json', content: json(parsed), expectedSha: sha }], message(user, action, 'kategoriler'))
  audit(user, action, 'categories')
}

/* Tags: rename or remove a tag across every post in one commit. */

/** `from` is the tag's URL slug; `to` is the new display text (null removes the tag). */
export async function rewriteTag(from: string, to: string | null, user: string) {
  if (!isValidSlug(from) || (to !== null && !isValidSlug(slugify(to)))) throw new Error('Geçersiz etiket')
  const { posts } = await listAdminPosts()
  const changes: Change[] = []
  for (const p of posts) {
    if (!p.tags.some((t) => slugify(t) === from)) continue
    const { slug, body, sha, ...fm } = p
    const next = p.tags.flatMap((t) => (slugify(t) === from ? (to ? [to] : []) : [t]))
    const tags = next.filter((t, i) => next.findIndex((x) => slugify(x) === slugify(t)) === i)
    changes.push({ path: postPath(slug), content: serializePost({ ...fm, tags }, body), expectedSha: sha })
  }
  if (changes.length === 0) return 0
  const action = to ? `etiketi yeniden adlandırdı (${from}, yeni ad: ${to})` : `etiketi kaldırdı (${from})`
  await getStore().commit(changes, message(user, action, `${changes.length} yazı`))
  audit(user, action, from)
  return changes.length
}

/* Settings */

export async function getAdminSettings(): Promise<Versioned<Settings>> {
  return readJson(getStore(), 'content/settings.json', (v) => settingsSchema.parse(v), DEFAULT_SETTINGS)
}

export async function saveSettings(next: Settings, sha: string | null, user: string) {
  const parsed = settingsSchema.parse(next)
  await getStore().commit([{ path: 'content/settings.json', content: json(parsed), expectedSha: sha }], message(user, 'ayarları güncelledi', 'site'))
  audit(user, 'ayarları güncelledi', 'settings')
}

/* Media */

export async function getAdminMedia(): Promise<Versioned<MediaItem[]>> {
  return readJson(getStore(), 'content/media.json', (v) => mediaIndexSchema.parse(v), [])
}

export async function addMedia(file: { name: string; content: Buffer }, item: MediaItem, sha: string | null, user: string) {
  const store = getStore()
  const current = await getAdminMedia()
  if (current.sha !== sha) throw new ConflictError('Medya listesi değişmiş. Sayfayı yenileyin.')
  const rel = item.src.replace(/^\/uploads\//, '')
  await store.commit(
    [
      { path: `uploads/${rel}`, content: file.content, expectedSha: null },
      { path: 'content/media.json', content: json([item, ...current.value]), expectedSha: sha },
    ],
    message(user, 'görsel yükledi', item.src),
  )
  audit(user, 'görsel yükledi', item.src)
}

/** Lists where a media file is still referenced, so it is not deleted from under a post. */
export async function mediaUsage(src: string): Promise<string[]> {
  const [{ posts }, settings] = await Promise.all([listAdminPosts(), getAdminSettings()])
  const used = posts.filter((p) => p.cover?.src === src || p.body.includes(src)).map((p) => `yazı: ${p.title}`)
  const s = settings.value
  if ([s.logo?.src, s.author.photo?.src, s.seo.defaultOgImage].includes(src)) used.push('site ayarları')
  return used
}

export async function deleteMedia(src: string, sha: string | null, user: string) {
  const current = await getAdminMedia()
  if (current.sha !== sha) throw new ConflictError('Medya listesi değişmiş. Sayfayı yenileyin.')
  if (!current.value.some((m) => m.src === src)) throw new ConflictError('Görsel bulunamadı.')
  const rel = src.replace(/^\/uploads\//, '')
  const store = getStore()
  // If the file is already gone, only the index entry is removed (a delete of a missing path would fail).
  const exists = (await store.read(`uploads/${rel}`)) !== null
  await store.commit(
    [
      ...(exists ? [{ path: `uploads/${rel}` as const, delete: true as const }] : []),
      { path: 'content/media.json', content: json(current.value.filter((m) => m.src !== src)), expectedSha: sha },
    ],
    message(user, 'görseli sildi', src),
  )
  audit(user, 'görseli sildi', src)
}

export async function recentActivity(limit = 30) {
  return getStore().activity(limit)
}
