import { z } from 'zod'
import { isValidSlug } from '../slug'

/*
 * Pages built in the panel's page editor (Puck). Each page is one JSON file,
 * content/pages/<key>.json, holding its settings and the block tree. The
 * three system pages (home, about, contact) exist even without a file: they
 * fall back to a default layout that reproduces the hand-built design.
 */

export const SYSTEM_PAGES = {
  anasayfa: { path: '/', title: 'Ana sayfa' },
  hakkimda: { path: '/hakkimda', title: 'Hakkımda' },
  iletisim: { path: '/iletisim', title: 'İletişim' },
} as const
export type SystemPageKey = keyof typeof SYSTEM_PAGES

export const isSystemPage = (key: string): key is SystemPageKey => Object.hasOwn(SYSTEM_PAGES, key)

/** Top-level paths the site already uses; a page of its own cannot take them. */
const TAKEN = new Set([
  'blog', 'magaza', 'hakkimda', 'iletisim', 'ara', 'kategori', 'etiket', 'gizlilik', 'satis-bilgileri', 'siparis', 'odeme', 'indir',
  'admin', 'api', 'uploads', 'images', 'sayfa', 'yeni', 'anasayfa', 'rss-xml', 'sitemap-xml', 'robots-txt', 'search-index-json', '_next',
])

export function isValidPageSlug(slug: string): boolean {
  return isValidSlug(slug) && !TAKEN.has(slug)
}

export const pagePath = (key: string) => (isSystemPage(key) ? SYSTEM_PAGES[key].path : `/${key}`)

export const pageMetaSchema = z.object({
  title: z.string().trim().min(2).max(120),
  /** Search-engine description; the site description is used when empty. */
  description: z.string().trim().max(170).default(''),
  /** System pages are always published. */
  status: z.enum(['draft', 'published']).default('draft'),
  /** Shown in the main menu (custom pages only). */
  menu: z.boolean().default(false),
  menuLabel: z.string().trim().max(30).default(''),
  menuOrder: z.number().int().min(0).max(99).default(50),
  updatedAt: z.string().max(40).optional(),
})
export type PageMeta = z.infer<typeof pageMetaSchema>

/** The block tree as Puck stores it; its contents are checked against the block library on save. */
export const builderDataSchema = z.object({
  root: z.object({ props: z.record(z.string(), z.unknown()).default({}) }).default({ props: {} }),
  content: z.array(z.unknown()).max(200),
  zones: z.record(z.string(), z.array(z.unknown())).optional(),
})
export type BuilderData = {
  root: { props: Record<string, unknown> }
  content: BlockData[]
  zones?: Record<string, BlockData[]>
}
export type BlockData = { type: string; props: Record<string, unknown> & { id: string } }

export const pageFileSchema = z.object({ meta: pageMetaSchema, data: builderDataSchema })
export type PageFile = { meta: PageMeta; data: BuilderData }
