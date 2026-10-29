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
  /** Demo post shipped with the site; shows a notice until the author saves it from the panel. */
  sample: z.boolean().optional(),
})

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>
export type Post = PostFrontmatter & { slug: string; body: string }
export type ImageRef = z.infer<typeof imageRefSchema>

/** File types that may be sold; checked again against the stored blob's metadata. */
export const PRODUCT_FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}
export const MAX_PRODUCT_FILE_BYTES = 100 * 1024 * 1024

/** Private file sold with a product (a Vercel Blob pathname, never a public URL). */
export const productFileSchema = z
  .object({
    pathname: z
      .string()
      .max(300)
      // Vercel Blob's random suffix is mixed case.
      .regex(/^urunler\/[a-z0-9][A-Za-z0-9/_.-]*$/, 'Dosya yolu urunler/ ile başlamalı')
      .refine((v) => !v.includes('..'), 'Geçersiz yol'),
    /** File name the buyer sees when downloading. */
    name: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[\p{L}\p{N} ._()-]+\.[a-z0-9]{2,5}$/u, 'Geçersiz dosya adı'),
    size: z.number().int().min(1).max(MAX_PRODUCT_FILE_BYTES),
    contentType: z.enum(Object.values(PRODUCT_FILE_TYPES) as [string, ...string[]]),
    /** SHA-256 of the stored file, kept with every order as proof of what was delivered. */
    sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  })
  .refine((f) => PRODUCT_FILE_TYPES[f.name.split('.').pop()!.toLowerCase()] === f.contentType, 'Dosya uzantısı ve türü uyuşmuyor')

/*
 * Digital products sold on the site: payment through iyzico's hosted
 * checkout form, delivery as an expiring download link (see src/lib/orders).
 */
export const productFrontmatterSchema = z.object({
  title: z.string().trim().min(3).max(120),
  excerpt: z.string().trim().max(300).default(''),
  status: z.enum(['draft', 'published']).default('draft'),
  createdAt: isoDate,
  updatedAt: isoDate.optional(),
  /** Turkish lira, VAT included. A product is for sale only with a price and a file. */
  price: z.number().min(1).max(1_000_000).multipleOf(0.01).optional(),
  file: productFileSchema.optional(),
  /** Short description of what is delivered, e.g. "PDF, 24 sayfa". */
  format: z.string().trim().max(80).optional(),
  features: z.array(z.string().trim().min(2).max(160)).max(12).default([]),
  cover: imageRefSchema.optional(),
  /** Lower numbers are listed first. */
  order: z.number().int().min(0).max(999).default(100),
  /** Demo product shipped with the site; labelled, noindex, kept out of the sitemap. */
  sample: z.boolean().optional(),
})
export type ProductFrontmatter = z.infer<typeof productFrontmatterSchema>
export type Product = ProductFrontmatter & { slug: string; body: string }

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
  /** Short slogan lines shown in the home hero, one per line (the Instagram bio). */
  motto: z.array(z.string().trim().min(2).max(80)).max(4).default([]),
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
  /** Seller identity shown on the legal pages and in every order contract. */
  seller: z
    .object({
      legalName: optionalText(160),
      address: optionalText(300),
      phone: optionalText(40),
      email: z.union([z.literal(''), z.email().max(200)]).default(''),
      taxOffice: optionalText(80),
      taxNumber: z.union([z.literal(''), z.string().trim().regex(/^\d{10,11}$/, 'VKN 10, TCKN 11 haneli olmalı')]).default(''),
      mersisNo: z.union([z.literal(''), z.string().trim().regex(/^\d{16}$/, 'MERSİS numarası 16 haneli olmalı')]).default(''),
      kep: optionalText(200),
      /** Meslek odası, if any (ETHS Yönetmeliği m. 5/1-c). */
      chamber: optionalText(200),
    })
    .default({ legalName: '', address: '', phone: '', email: '', taxOffice: '', taxNumber: '', mersisNo: '', kep: '', chamber: '' }),
  seo: z.object({
    defaultOgImage: z.union([z.literal(''), localAssetPath]).default(''),
  }),
  privacy: z.object({
    controller: optionalText(200),
    updatedAt: z.union([z.literal(''), isoDate]).default(''),
  }),
})
export type Settings = z.infer<typeof settingsSchema>

/** Sales stay closed until the seller identity required on the legal pages is filled in. */
export function sellerComplete(s: Settings['seller']): boolean {
  return Boolean(s.legalName && s.address && s.phone && s.email && s.taxOffice && s.taxNumber)
}

export function isForSale(p: { price?: number; file?: unknown; sample?: boolean }): boolean {
  return p.price !== undefined && p.file !== undefined && !p.sample
}
