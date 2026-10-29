'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { AuthError, requireAdminAction } from '@/lib/auth/guard'
import { ConflictError, StoreUnavailableError } from '@/lib/store'
import {
  addMedia,
  deleteMedia,
  deletePost,
  getAdminCategories,
  getAdminMedia,
  getAdminSettings,
  mediaUsage,
  listAdminPosts,
  rewriteTag,
  savePost,
  saveCategories,
  saveSettings,
  setPostStatus,
} from '@/lib/admin-content'
import { isValidSlug, slugify } from '@/lib/slug'
import { referenceSchema, settingsSchema, type Settings } from '@/lib/types'
import { UploadError, validateImageUpload, MAX_UPLOAD_BYTES } from '@/lib/upload'
import { isoDay } from '@/lib/format'

export type ActionState = { ok?: string; error?: string; fields?: Record<string, string> }

function str(fd: FormData, key: string, max = 10_000): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function describe(e: unknown): ActionState {
  if (e instanceof AuthError || e instanceof ConflictError || e instanceof StoreUnavailableError || e instanceof UploadError) {
    return { error: e.message }
  }
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const i of e.issues) fields[i.path.join('.')] ??= i.message
    return { error: 'Formda düzeltilmesi gereken alanlar var.', fields }
  }
  console.error(JSON.stringify({ type: 'admin_action_error', at: new Date().toISOString(), name: (e as Error)?.name, message: (e as Error)?.message }))
  return { error: 'Beklenmeyen bir hata oluştu. İşlem kaydedilmedi.' }
}

/* Posts */

function parseReferences(raw: string) {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(.*?)\s*\|\s*(https?:\/\/\S+)\s*$/.exec(line)
      return referenceSchema.parse(m ? { title: m[1] || m[2], url: m[2] } : { title: line })
    })
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const label = part.replace(/\s+/g, ' ').trim().slice(0, 40)
    const key = slugify(label)
    if (label.length < 2 || !isValidSlug(key) || seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out.slice(0, 20)
}

export async function savePostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target: string
  try {
    const session = await requireAdminAction(fd)
    const originalSlug = str(fd, 'originalSlug', 100) || null
    const title = str(fd, 'title', 200).trim()
    const slug = slugify(str(fd, 'slug', 200) || title)
    if (!isValidSlug(slug)) return { error: 'Formda düzeltilmesi gereken alanlar var.', fields: { slug: 'Geçerli bir adres (slug) girin.' } }

    const { value: categories } = await getAdminCategories()
    const category = str(fd, 'category', 100)
    if (category && !categories.some((c) => c.slug === category)) return { error: 'Seçilen kategori bulunamadı.', fields: { category: 'Kategori bulunamadı' } }

    const coverSrc = str(fd, 'coverSrc', 300)
    const coverAlt = str(fd, 'coverAlt', 300).trim()
    if (coverSrc) {
      const { value: media } = await getAdminMedia()
      if (!media.some((m) => m.src === coverSrc)) return { error: 'Kapak görseli medya kütüphanesinde bulunamadı.' }
    }
    if (coverSrc && !coverAlt) return { error: 'Formda düzeltilmesi gereken alanlar var.', fields: { 'cover.alt': 'Kapak görseli için alt metin zorunlu.' } }

    const updatedDay = str(fd, 'updatedAt', 20)
    await savePost(
      {
        originalSlug,
        sha: str(fd, 'sha', 64) || null,
        slug,
        body: str(fd, 'body', 200_000),
        frontmatter: {
          title,
          excerpt: str(fd, 'excerpt', 400),
          status: str(fd, 'status') === 'published' ? 'published' : 'draft',
          category: category || undefined,
          tags: parseTags(str(fd, 'tags', 1000)),
          cover: coverSrc ? { src: coverSrc, alt: coverAlt } : undefined,
          seoTitle: str(fd, 'seoTitle', 70).trim() || undefined,
          seoDescription: str(fd, 'seoDescription', 170).trim() || undefined,
          references: parseReferences(str(fd, 'references', 20_000)),
          updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(updatedDay) ? `${updatedDay}T09:00:00+03:00` : undefined,
        },
      },
      session.sub,
    )
    revalidatePath('/admin', 'layout')
    target = str(fd, 'intent') === 'preview' ? `/admin/yazilar/${slug}/onizleme` : `/admin/yazilar/${slug}?durum=kaydedildi`
  } catch (e) {
    return describe(e)
  }
  redirect(target)
}

export async function setStatusAction(fd: FormData): Promise<void> {
  const session = await requireAdminAction(fd)
  const slug = str(fd, 'slug', 100)
  const status = str(fd, 'status') === 'published' ? 'published' : 'draft'
  let durum = status === 'published' ? 'yayinlandi' : 'kaldirildi'
  try {
    await setPostStatus(slug, str(fd, 'sha', 64), status, session.sub)
  } catch (e) {
    if (!(e instanceof ConflictError || e instanceof StoreUnavailableError)) throw e
    durum = 'cakisma'
  }
  revalidatePath('/admin', 'layout')
  redirect(`/admin/yazilar/${isValidSlug(slug) ? slug : ''}?durum=${durum}`)
}

export async function deletePostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdminAction(fd)
    const slug = str(fd, 'slug', 100)
    if (str(fd, 'confirm', 100).trim() !== slug) {
      return { error: 'Silmeyi onaylamak için yazının adresini (slug) aynen yazın.' }
    }
    await deletePost(slug, str(fd, 'sha', 64), session.sub)
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/yazilar?durum=silindi')
}

/* Categories */

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let done: string
  try {
    const session = await requireAdminAction(fd)
    const { value, sha } = await getAdminCategories()
    if ((str(fd, 'sha', 64) || null) !== sha) return { error: 'Kategoriler başka bir oturumda değişmiş. Sayfayı yenileyin.' }
    const original = str(fd, 'originalSlug', 100)
    const name = str(fd, 'name', 60).trim()
    const slug = slugify(str(fd, 'slug', 100) || name)
    const entry = { slug, name, description: str(fd, 'description', 300) }
    let next
    if (original) {
      if (!value.some((c) => c.slug === original)) return { error: 'Kategori bulunamadı.' }
      if (original !== slug) {
        const { posts } = await listAdminPosts()
        if (posts.some((p) => p.category === original)) {
          return { error: 'Bu kategoride yazı var; adresi (slug) değiştirilemez. Adını ve açıklamasını değiştirebilirsiniz.' }
        }
      }
      next = value.map((c) => (c.slug === original ? entry : c))
    } else {
      next = [...value, entry]
    }
    await saveCategories(next, sha, session.sub, original ? 'kategoriyi güncelledi' : 'kategori ekledi')
    revalidatePath('/admin', 'layout')
    done = original ? 'kategori-guncellendi' : 'kategori-eklendi'
  } catch (e) {
    return describe(e)
  }
  redirect(`/admin/kategoriler?durum=${done}`)
}

export async function deleteCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdminAction(fd)
    const slug = str(fd, 'slug', 100)
    const { value, sha } = await getAdminCategories()
    if ((str(fd, 'sha', 64) || null) !== sha) return { error: 'Kategoriler başka bir oturumda değişmiş. Sayfayı yenileyin.' }
    const { posts } = await listAdminPosts()
    const used = posts.filter((p) => p.category === slug).length
    if (used > 0) return { error: `Bu kategoride ${used} yazı var. Önce yazıları başka kategoriye taşıyın.` }
    await saveCategories(value.filter((c) => c.slug !== slug), sha, session.sub, 'kategoriyi sildi')
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/kategoriler?durum=kategori-silindi')
}

/* Tags */

export async function rewriteTagAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let done: string
  try {
    const session = await requireAdminAction(fd)
    const from = str(fd, 'from', 100)
    const remove = str(fd, 'intent') === 'delete'
    const to = remove ? null : str(fd, 'to', 40).replace(/\s+/g, ' ').trim()
    if (!remove && (!to || to.length < 2 || !isValidSlug(slugify(to)))) return { error: 'Yeni etiket adı geçersiz.' }
    await rewriteTag(from, to, session.sub)
    revalidatePath('/admin', 'layout')
    done = remove ? 'etiket-kaldirildi' : 'etiket-adlandirildi'
  } catch (e) {
    return describe(e)
  }
  redirect(`/admin/etiketler?durum=${done}`)
}

/* Settings */

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdminAction(fd)
    const { sha } = await getAdminSettings()
    if ((str(fd, 'sha', 64) || null) !== sha) return { error: 'Ayarlar başka bir oturumda değişmiş. Sayfayı yenileyin.' }
    const { value: media } = await getAdminMedia()
    const image = (key: string): Settings['logo'] => {
      const src = str(fd, `${key}Src`, 300)
      if (!src) return undefined
      const item = media.find((m) => m.src === src)
      if (!item) throw new UploadError('Seçilen görsel medya kütüphanesinde yok.')
      return { src, alt: str(fd, `${key}Alt`, 300).trim() || item.alt }
    }
    const next = settingsSchema.parse({
      siteName: str(fd, 'siteName', 80),
      tagline: str(fd, 'tagline', 160),
      description: str(fd, 'description', 170),
      logo: image('logo'),
      author: {
        name: str(fd, 'authorName', 80),
        jobTitle: str(fd, 'jobTitle', 120),
        shortBio: str(fd, 'shortBio', 400),
        bio: str(fd, 'bio', 8000),
        photo: image('photo'),
      },
      contact: {
        email: str(fd, 'email', 200).trim(),
        phone: str(fd, 'phone', 40),
        location: str(fd, 'location', 120),
        note: str(fd, 'contactNote', 1000),
      },
      social: {
        linkedin: str(fd, 'linkedin', 300).trim(),
        x: str(fd, 'x', 300).trim(),
        instagram: str(fd, 'instagram', 300).trim(),
        youtube: str(fd, 'youtube', 300).trim(),
      },
      seo: { defaultOgImage: str(fd, 'defaultOgImage', 300) },
      privacy: { controller: str(fd, 'privacyController', 200), updatedAt: isoDay(new Date().toISOString()) },
    })
    await saveSettings(next, sha, session.sub)
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/ayarlar?durum=ayarlar-kaydedildi')
}

/* Media */

export async function uploadMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdminAction(fd)
    const file = fd.get('file')
    if (!(file instanceof File) || file.size === 0) return { error: 'Bir görsel seçin.' }
    if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`Dosya en fazla ${MAX_UPLOAD_BYTES / 1024 / 1024} MB olabilir.`)
    const buf = Buffer.from(await file.arrayBuffer())
    const alt = str(fd, 'alt', 300)
    const v = validateImageUpload(buf, file.name, file.type, alt)
    const year = new Date().getFullYear()
    const src = `/uploads/${year}/${v.fileName}`
    const { sha } = await getAdminMedia()
    await addMedia(
      { name: v.fileName, content: buf },
      { src, alt: alt.trim(), width: v.width, height: v.height, bytes: buf.length, uploadedAt: new Date().toISOString() },
      sha,
      session.sub,
    )
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/medya?durum=gorsel-yuklendi')
}

export async function deleteMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdminAction(fd)
    const src = str(fd, 'src', 300)
    const used = await mediaUsage(src)
    if (used.length) return { error: `Görsel kullanımda: ${used.join(', ')}. Önce bu kullanımları kaldırın.` }
    await deleteMedia(src, str(fd, 'sha', 64) || null, session.sub)
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/medya?durum=gorsel-silindi')
}
