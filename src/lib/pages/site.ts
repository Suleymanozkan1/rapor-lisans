import 'server-only'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import { contentDir } from '../env'
import { getCategories, getMedia, getPublishedPosts, getPublishedProducts, getSettings } from '../content'
import { defaultPage } from './defaults'
import { isSystemPage, isValidPageSlug, pageFileSchema, type PageFile, type SystemPageKey } from './model'
import { makeSiteData } from './site-data'
import { validateBuilderData } from './validate'

/*
 * Pages for the public site, read from the content files at build time
 * (static pages, like posts). A file that fails validation is not rendered:
 * a system page falls back to its default layout, a custom page to 404.
 */

function readPage(key: string): PageFile | null {
  const file = path.join(contentDir(), 'pages', `${key}.json`)
  if (!existsSync(file)) return null
  try {
    const raw = pageFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
    return { meta: raw.meta, data: validateBuilderData(raw.data) }
  } catch (e) {
    console.error(JSON.stringify({ type: 'page_invalid', key, message: (e as Error).message }))
    return null
  }
}

export const getSystemPage = cache((key: SystemPageKey): PageFile => readPage(key) ?? defaultPage(key, getSettings()))

export const getCustomPage = cache((slug: string): PageFile | null => {
  if (isSystemPage(slug) || !isValidPageSlug(slug)) return null
  const p = readPage(slug)
  return p && p.meta.status === 'published' ? p : null
})

export const listCustomPages = cache((): { slug: string; meta: PageFile['meta'] }[] => {
  const dir = path.join(contentDir(), 'pages')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .filter((slug) => !isSystemPage(slug) && isValidPageSlug(slug))
    .map((slug) => ({ slug, page: getCustomPage(slug) }))
    .filter((x): x is { slug: string; page: PageFile } => x.page !== null)
    .map(({ slug, page }) => ({ slug, meta: page.meta }))
    .sort((a, b) => a.meta.menuOrder - b.meta.menuOrder || a.meta.title.localeCompare(b.meta.title, 'tr'))
})

/** Menu entries for custom pages marked "show in menu". */
export const menuPages = cache(() => listCustomPages().filter((p) => p.meta.menu).map((p) => ({ href: `/${p.slug}`, label: p.meta.menuLabel || p.meta.title })))

export const getSiteData = cache(() =>
  makeSiteData({ settings: getSettings(), posts: getPublishedPosts(), products: getPublishedProducts(), categories: getCategories(), media: getMedia() }),
)
