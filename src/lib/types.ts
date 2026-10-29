import { z } from 'zod'
import { isValidSlug, slugify } from './slug'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/, 'Geçersiz tarih')

const safeUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v)
      return u.protocol === 'https:' || u.protocol === 'http:'
    } catch {
      return false
    }
  }, 'Yalnızca http(s) bağlantıları kabul edilir')

/** A path to a file served from this site (e.g. /uploads/2026/x.jpg). */
export const localAssetPath = z
  .string()
  .max(300)
  .regex(/^\/uploads\/[a-z0-9/_.-]+$/, 'Görsel yolu /uploads/ ile başlamalı')
  .refine((v) => !v.includes('..'), 'Geçersiz yol')

export const imageRefSchema = z.object({
  src: localAssetPath,
  alt: z.string().trim().min(1, 'Alt metin zorunlu').max(300),
})

export const referenceSchema = z.object({
  title: z.string().trim().min(1).max(400),
  url: safeUrl.optional(),
})

export const slugSchema = z.string().refine(isValidSlug, 'Geçersiz veya ayrılmış slug')

/** Tags are stored as display text ("Yüksekte çalışma"); URLs use slugify(tag). */
export const tagSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .refine((t) => isValidSlug(slugify(t)), 'Geçersiz etiket')

export const postFrontmatterSchema = z.object({
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().max(400).default(''),
  status: z.enum(['draft', 'published']).default('draft'),
  createdAt: isoDate,
  publishedAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
  category: slugSchema.optional(),
  tags: z.array(tagSchema).max(20).default([]),
  cover: imageRefSchema.optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  references: z.array(referenceSchema).max(50).default([]),
  revision: z.number().int().min(0).default(0),
})

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>
export type Post = PostFrontmatter & { slug: string; body: string }
export type ImageRef = z.infer<typeof imageRefSchema>

export const categorySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(''),
})
export const categoriesSchema = z.array(categorySchema).max(50)
export type Category = z.infer<typeof categorySchema>

const optionalText = (max: number) => z.string().trim().max(max).default('')
const optionalUrl = z.union([z.literal(''), safeUrl]).default('')

export const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  tagline: optionalText(160),
  description: optionalText(170),
  logo: imageRefSchema.optional(),
  author: z.object({
    name: z.string().trim().min(2).max(80),
    jobTitle: optionalText(120),
    shortBio: optionalText(400),
    bio: optionalText(8000),
    photo: imageRefSchema.optional(),
  }),
  contact: z.object({
    email: z.union([z.literal(''), z.email().max(200)]).default(''),
    phone: optionalText(40),
    location: optionalText(120),
    note: optionalText(1000),
  }),
  social: z.object({
    linkedin: optionalUrl,
    x: optionalUrl,
    instagram: optionalUrl,
    youtube: optionalUrl,
  }),
  seo: z.object({
    defaultOgImage: z.union([z.literal(''), localAssetPath]).default(''),
  }),
  privacy: z.object({
    controller: optionalText(200),
    updatedAt: z.union([z.literal(''), isoDate]).default(''),
  }),
})
export type Settings = z.infer<typeof settingsSchema>
