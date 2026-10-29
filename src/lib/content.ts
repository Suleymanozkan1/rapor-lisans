import 'server-only'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import { contentDir } from './env'
import { parsePostFile } from './frontmatter'
import { isPublic, sortByDate } from './posts'
import { categoriesSchema, settingsSchema, type Category, type Post, type Settings } from './types'
import { DEFAULT_SETTINGS } from './defaults'
import { mediaIndexSchema, type MediaItem } from './media'

/*
 * Build-time reads for the public site. Pages are statically generated from
 * the repository content, so a published change goes live with the next
 * deployment (GitHub commit -> Vercel build).
 */

function readJson(file: string): unknown {
  const full = path.join(contentDir(), file)
  if (!existsSync(full)) return undefined
  return JSON.parse(readFileSync(full, 'utf8'))
}

export const getAllPosts = cache((): Post[] => {
  const dir = path.join(contentDir(), 'posts')
  if (!existsSync(dir)) return []
  const posts = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parsePostFile(f.slice(0, -3), readFileSync(path.join(dir, f), 'utf8')))
  return sortByDate(posts)
})

export const getPublishedPosts = cache((): Post[] => getAllPosts().filter((p) => isPublic(p)))

export function getPublishedPost(slug: string): Post | undefined {
  return getPublishedPosts().find((p) => p.slug === slug)
}

export const getCategories = cache((): Category[] => {
  const raw = readJson('categories.json')
  return raw === undefined ? [] : categoriesSchema.parse(raw)
})

export const getSettings = cache((): Settings => {
  const raw = readJson('settings.json')
  return raw === undefined ? DEFAULT_SETTINGS : settingsSchema.parse(raw)
})

export const getMedia = cache((): MediaItem[] => {
  const raw = readJson('media.json')
  return raw === undefined ? [] : mediaIndexSchema.parse(raw)
})

export function mediaFor(src: string | undefined): MediaItem | undefined {
  return src ? getMedia().find((m) => m.src === src) : undefined
}
