import 'server-only'
import { parsePostFile, parseProductFile, serializePost, serializeProduct, ContentParseError } from './frontmatter'
import { getStore, ConflictError, type Change, type ContentStore, type LogicalPath } from './store'
import {
  categoriesSchema,
  settingsSchema,
  postFrontmatterSchema,
  productFrontmatterSchema,
  type Category,
  type Post,
  type PostFrontmatter,
  type Product,
  type ProductFrontmatter,
  type Settings,
} from './types'
import { sortProducts } from './products'
import { DEFAULT_SETTINGS } from './defaults'
import { mediaIndexSchema, type MediaItem } from './media'
import { isValidSlug, slugify } from './slug'
import { defaultPage } from './pages/defaults'
import { gitBlobSha } from './store/sha'
import { SYSTEM_PAGES, isSystemPage, isValidPageSlug, pageFileSchema, pageMetaSchema, type BuilderData, type PageMeta } from './pages/model'

/*
 * Admin-side content access. Always reads the current state from the
 * store (GitHub in production), never the build snapshot, and passes the
 * file SHA back on save for optimistic locking.
 */

export type Versioned<T> = { value: T; sha: string | null }
export type AdminPost = Post & { sha: string }
export type AdminProduct = Product & { sha: string }
export type BrokenFile = { path: string; error: string }

const postPath = (slug: string): LogicalPath => {
  if (!isValidSlug(slug)) throw new Error('Geçersiz slug')
  return `content/posts/${slug}.md`
}

const productPath = (slug: string): LogicalPath => {
  if (!isValidSlug(slug)) throw new Error('Geçersiz slug')
  return `content/products/${slug}.md`
}

function audit(user: string, action: string, target: string) {
  // Who / what / when; never passwords, tokens or cookies.
  console.info(JSON.stringify({ type: 'admin_audit', at: new Date().toISOString(), user, action, target }))
}

/** Commit message. The admin username is deliberately left out: commits may be public. */
function message(_user: string, action: string, target: string) {
  return `panel: ${action} ${target}`.slice(0, 200)
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

/* Products (Shopier showcase) */

export async function listAdminProducts(): Promise<{ products: AdminProduct[]; broken: BrokenFile[] }> {
  const store = getStore()
  const entries = (await store.list('content/products')).filter((e) => e.path.endsWith('.md'))
  const files = await store.readMany(entries.map((e) => e.path))
  const products: AdminProduct[] = []
  const broken: BrokenFile[] = []
  for (const [p, f] of files) {
    const slug = p.slice('content/products/'.length, -3)
    try {
      products.push({ ...parseProductFile(slug, f.content.toString('utf8')), sha: f.sha })
    } catch (e) {
      broken.push({ path: p, error: e instanceof ContentParseError ? e.message : 'Okunamadı' })
    }
  }
  return { products: sortProducts(products), broken }
}

export async function getAdminProduct(slug: string): Promise<AdminProduct | null> {
  if (!isValidSlug(slug)) return null
  const f = await getStore().read(productPath(slug))
  if (!f) return null
  return { ...parseProductFile(slug, f.content.toString('utf8')), sha: f.sha }
}

export type SaveProductInput = {
  originalSlug: string | null
  sha: string | null
  slug: string
  frontmatter: Omit<ProductFrontmatter, 'createdAt' | 'updatedAt' | 'sample'>
  body: string
  /** Files committed together with the product, e.g. preview images. */
  extraChanges?: Change[]
}

export async function saveProduct(input: SaveProductInput, user: string): Promise<string> {
  const store = getStore()
  const existing = input.originalSlug ? await getAdminProduct(input.originalSlug) : null
  if (input.originalSlug && !existing) throw new ConflictError('Ürün bulunamadı; silinmiş olabilir.')
  if (existing && existing.sha !== input.sha) throw new ConflictError('Ürün başka bir oturumda değiştirilmiş. Sayfayı yenileyin.')
  const now = new Date().toISOString()
  // Saving from the panel means the author has reviewed it: the demo label is dropped.
  const fm: ProductFrontmatter = productFrontmatterSchema.parse({
    ...input.frontmatter,
    createdAt: existing?.createdAt ?? now,
    updatedAt: existing ? now : undefined,
  })
  const slugChanged = existing && existing.slug !== input.slug
  const changes: Change[] =
    !existing || slugChanged
      ? [
          { path: productPath(input.slug), content: serializeProduct(fm, input.body), expectedSha: null },
          ...(slugChanged ? [{ path: productPath(existing.slug), delete: true as const, expectedSha: existing.sha }] : []),
        ]
      : [{ path: productPath(input.slug), content: serializeProduct(fm, input.body), expectedSha: existing.sha }]
  changes.push(...(input.extraChanges ?? []))
  const action = !existing ? 'ürün ekledi' : slugChanged ? `ürünün adresini değiştirdi (eski: ${existing.slug}), yeni:` : 'ürünü güncelledi'
  await store.commit(changes, message(user, action, input.slug))
  audit(user, action, input.slug)
  return input.slug
}

export async function deleteProduct(slug: string, sha: string, user: string) {
  const existing = await getAdminProduct(slug)
  // Preview images belong to the product and go with it.
  const previews: Change[] = (existing?.preview?.images ?? []).map((i) => ({ path: i.src.replace(/^\/uploads\//, 'uploads/') as LogicalPath, delete: true }))
  await getStore().commit([{ path: productPath(slug), delete: true, expectedSha: sha }, ...previews], message(user, 'ürünü sildi', slug))
  audit(user, 'ürünü sildi', slug)
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
  const [{ posts }, { products }, settings] = await Promise.all([listAdminPosts(), listAdminProducts(), getAdminSettings()])
  const used = posts.filter((p) => p.cover?.src === src || p.body.includes(src)).map((p) => `yazı: ${p.title}`)
  used.push(...products.filter((p) => p.cover?.src === src || p.body.includes(src)).map((p) => `ürün: ${p.title}`))
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

/* Pages (page editor) */

const pageFilePath = (key: string): LogicalPath => {
  if (!isSystemPage(key) && !isValidPageSlug(key)) throw new Error('Geçersiz sayfa adresi')
  return `content/pages/${key}.json`
}

export type AdminPage = { key: string; system: boolean; meta: PageMeta; data: BuilderData; sha: string | null }

/** A page as stored; a system page without a file comes back with its default layout (sha null). */
export async function getAdminPage(key: string): Promise<AdminPage | null> {
  if (!isSystemPage(key) && !isValidPageSlug(key)) return null
  const f = await getStore().read(pageFilePath(key))
  if (f) {
    const raw = pageFileSchema.parse(JSON.parse(f.content.toString('utf8')))
    return { key, system: isSystemPage(key), meta: raw.meta, data: raw.data as BuilderData, sha: f.sha }
  }
  if (!isSystemPage(key)) return null
  const { value: settings } = await getAdminSettings()
  return { key, system: true, ...defaultPage(key, settings), sha: null }
}

export async function listAdminPages(): Promise<{ key: string; system: boolean; meta: PageMeta; saved: boolean }[]> {
  const store = getStore()
  const entries = (await store.list('content/pages')).filter((e) => e.path.endsWith('.json'))
  const files = await store.readMany(entries.map((e) => e.path))
  const out = new Map<string, { key: string; system: boolean; meta: PageMeta; saved: boolean }>()
  for (const key of Object.keys(SYSTEM_PAGES)) {
    out.set(key, { key, system: true, meta: pageMetaSchema.parse({ title: SYSTEM_PAGES[key as keyof typeof SYSTEM_PAGES].title, status: 'published' }), saved: false })
  }
  for (const [p, f] of files) {
    const key = p.slice('content/pages/'.length, -'.json'.length)
    try {
      const raw = pageFileSchema.parse(JSON.parse(f.content.toString('utf8')))
      out.set(key, { key, system: isSystemPage(key), meta: raw.meta, saved: true })
    } catch {
      // A broken file is listed by key so it can be opened and fixed.
      out.set(key, { key, system: isSystemPage(key), meta: pageMetaSchema.parse({ title: key }), saved: true })
    }
  }
  return [...out.values()].sort((a, b) => Number(b.system) - Number(a.system) || a.meta.title.localeCompare(b.meta.title, 'tr'))
}

export async function saveAdminPage(input: { key: string; sha: string | null; meta: PageMeta; data: BuilderData }, user: string): Promise<string> {
  const meta = pageMetaSchema.parse({ ...input.meta, ...(isSystemPage(input.key) ? { status: 'published', menu: false } : {}), updatedAt: new Date().toISOString() })
  const json = JSON.stringify({ meta, data: input.data }, null, 2) + '\n'
  const action = input.sha ? 'sayfayı güncelledi' : 'sayfa ekledi'
  await getStore().commit([{ path: pageFilePath(input.key), content: json, expectedSha: input.sha }], message(user, action, input.key))
  audit(user, action, input.key)
  // Both stores identify a file by its Git blob SHA, so the editor can keep saving without re-reading.
  return gitBlobSha(Buffer.from(json, 'utf8'))
}

export async function deleteAdminPage(key: string, sha: string, user: string) {
  if (isSystemPage(key)) throw new Error('Sistem sayfaları silinemez; içeriğini düzenleyebilirsiniz.')
  await getStore().commit([{ path: pageFilePath(key), delete: true, expectedSha: sha }], message(user, 'sayfayı sildi', key))
  audit(user, 'sayfayı sildi', key)
}
