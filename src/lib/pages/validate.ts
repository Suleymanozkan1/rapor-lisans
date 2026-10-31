import type { Config, Field } from '@puckeditor/core'
import { buildConfig, SERVER_KIT, type FieldKind } from '@/components/builder/config'
import { safeAnchor, safeHref, safeImage, videoEmbed } from '@/components/builder/safe'
import { builderDataSchema, type BlockData, type BuilderData } from './model'

/*
 * A page saved from the editor is untrusted input: only known block types,
 * only the props their fields declare, values of the declared type, links
 * and images that pass the same checks the renderers apply. Unknown props
 * are dropped; invalid links or images are refused with a message.
 */

export class PageValidationError extends Error {}

const MAX_BLOCKS = 300
const MAX_DEPTH = 6
const ID = /^[A-Za-z0-9_-]{1,100}$/

type Ctx = { count: number; config: Config }

function kindOf(field: Field): FieldKind | undefined {
  return (field.metadata as { kind?: FieldKind } | undefined)?.kind
}

function cleanString(field: Field, v: unknown, where: string): string {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') throw new PageValidationError(`${where}: metin bekleniyordu.`)
  const kind = kindOf(field)
  const max = kind === 'markdown' ? 20_000 : field.type === 'textarea' ? 5_000 : 500
  if (v.length > max) throw new PageValidationError(`${where}: en fazla ${max} karakter olabilir.`)
  if (!v.trim()) return ''
  if (kind === 'link' && !safeHref(v)) throw new PageValidationError(`${where}: “${v.slice(0, 60)}” geçerli bir bağlantı değil (ör. /blog, https://…, mailto:…).`)
  if (kind === 'media' && !safeImage(v)) throw new PageValidationError(`${where}: görsel medya kütüphanesinden seçilmeli.`)
  if (kind === 'anchor' && !safeAnchor(v)) throw new PageValidationError(`${where}: bağlantı adı küçük harf, rakam ve tireden oluşmalı (ör. iletisim-formu).`)
  if (kind === 'video' && !videoEmbed(v)) throw new PageValidationError(`${where}: yalnızca YouTube veya Vimeo bağlantısı girilebilir.`)
  return v
}

function cleanValue(field: Field, v: unknown, fallback: unknown, where: string, ctx: Ctx, depth: number): unknown {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'custom':
      return cleanString(field, v, where)
    case 'number': {
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(n)) return fallback
      return Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, n))
    }
    case 'select':
    case 'radio':
      return field.options.some((o) => o.value === v) ? v : fallback
    case 'array': {
      if (v === undefined) return fallback ?? []
      if (!Array.isArray(v)) throw new PageValidationError(`${where}: liste bekleniyordu.`)
      if (v.length > (field.max ?? 50)) throw new PageValidationError(`${where}: en fazla ${field.max ?? 50} öğe olabilir.`)
      const defaults = (typeof field.defaultItemProps === 'object' ? field.defaultItemProps : {}) as Record<string, unknown>
      return v.map((item, i) => cleanObject(field.arrayFields as Record<string, Field>, item, defaults, `${where} ${i + 1}`, ctx, depth))
    }
    case 'object':
      return cleanObject(field.objectFields as Record<string, Field>, v ?? {}, (fallback ?? {}) as Record<string, unknown>, where, ctx, depth)
    case 'slot':
      if (v === undefined) return []
      if (!Array.isArray(v)) throw new PageValidationError(`${where}: blok listesi bekleniyordu.`)
      return v.map((b) => cleanBlock(b, ctx, depth + 1))
    default:
      return fallback
  }
}

function cleanObject(fields: Record<string, Field>, v: unknown, defaults: Record<string, unknown>, where: string, ctx: Ctx, depth: number): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new PageValidationError(`${where}: geçersiz değer.`)
  const src = v as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, f] of Object.entries(fields)) {
    out[k] = cleanValue(f, src[k], defaults[k], `${where} › ${f.label ?? k}`, ctx, depth)
  }
  return out
}

function cleanBlock(b: unknown, ctx: Ctx, depth: number): BlockData {
  if (depth > MAX_DEPTH) throw new PageValidationError(`Bloklar en fazla ${MAX_DEPTH} kat iç içe olabilir.`)
  if (++ctx.count > MAX_BLOCKS) throw new PageValidationError(`Bir sayfada en fazla ${MAX_BLOCKS} blok olabilir.`)
  if (typeof b !== 'object' || b === null) throw new PageValidationError('Geçersiz blok.')
  const { type, props } = b as { type?: unknown; props?: unknown }
  const comp = typeof type === 'string' && Object.hasOwn(ctx.config.components, type) ? ctx.config.components[type] : null
  if (!comp) throw new PageValidationError(`Bilinmeyen blok türü: ${String(type).slice(0, 40)}`)
  const p = (typeof props === 'object' && props !== null ? props : {}) as Record<string, unknown>
  if (typeof p.id !== 'string' || !ID.test(p.id)) throw new PageValidationError('Blok kimliği geçersiz.')
  const cleaned = cleanObject((comp.fields ?? {}) as Record<string, Field>, p, (comp.defaultProps ?? {}) as Record<string, unknown>, comp.label ?? String(type), ctx, depth)
  return { type: type as string, props: { ...cleaned, id: p.id } }
}

export function validateBuilderData(input: unknown, config: Config = buildConfig(SERVER_KIT)): BuilderData {
  const parsed = builderDataSchema.safeParse(input)
  if (!parsed.success) throw new PageValidationError('Sayfa verisi okunamadı.')
  const ctx: Ctx = { count: 0, config }
  const content = parsed.data.content.map((b) => cleanBlock(b, ctx, 1))
  const title = parsed.data.root.props.title
  return { root: { props: typeof title === 'string' ? { title: title.slice(0, 120) } : {} }, content }
}
