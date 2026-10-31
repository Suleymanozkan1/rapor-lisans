'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AuthError, requireAdminAction } from '@/lib/auth/guard'
import { deleteAdminPage, getAdminPage, saveAdminPage } from '@/lib/admin-content'
import { ConflictError, StoreUnavailableError } from '@/lib/store'
import { isSystemPage, isValidPageSlug, pageMetaSchema, type BuilderData } from '@/lib/pages/model'
import { PageValidationError, validateBuilderData } from '@/lib/pages/validate'
import { slugify } from '@/lib/slug'

export type PageSaveState = { ok?: string; error?: string; sha?: string }

const str = (fd: FormData, key: string, max = 200) => {
  const v = fd.get(key)
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function describe(e: unknown): PageSaveState {
  if (e instanceof AuthError || e instanceof ConflictError || e instanceof StoreUnavailableError || e instanceof PageValidationError) return { error: e.message }
  console.error(JSON.stringify({ type: 'page_action_error', at: new Date().toISOString(), name: (e as Error)?.name, message: (e as Error)?.message }))
  return { error: 'Beklenmeyen bir hata oluştu. Sayfa kaydedilmedi.' }
}

/** Page settings live in the editor's "Sayfa" panel (root props) and are stored apart from the blocks. */
function metaFromRoot(props: Record<string, unknown>) {
  const t = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '')
  return pageMetaSchema.parse({
    title: t('title').trim() || 'Adsız sayfa',
    description: t('description'),
    status: props.status === 'published' ? 'published' : 'draft',
    menu: props.menu === 'evet',
    menuLabel: t('menuLabel'),
    menuOrder: Math.max(0, Math.min(99, Math.round(Number(props.menuOrder) || 50))),
  })
}

/** Called by the editor's "Kaydet" button; stays on the editor. */
export async function savePageAction(fd: FormData): Promise<PageSaveState> {
  try {
    const session = await requireAdminAction(fd)
    const key = str(fd, 'key', 100)
    if (!isSystemPage(key) && !isValidPageSlug(key)) return { error: 'Geçersiz sayfa.' }
    const raw = str(fd, 'data', 1_000_000)
    let input: { root?: { props?: Record<string, unknown> } }
    try {
      input = JSON.parse(raw)
    } catch {
      return { error: 'Sayfa verisi okunamadı.' }
    }
    const meta = metaFromRoot(input.root?.props ?? {})
    const data: BuilderData = validateBuilderData(input)
    data.root = { props: { title: meta.title } }
    const sha = await saveAdminPage({ key, sha: str(fd, 'sha', 64) || null, meta, data }, session.sub)
    revalidatePath('/admin', 'layout')
    return { ok: isSystemPage(key) || meta.status === 'published' ? 'Kaydedildi. Site yaklaşık bir dakika içinde güncellenir.' : 'Taslak olarak kaydedildi (sitede görünmez).', sha }
  } catch (e) {
    return describe(e)
  }
}

export async function createPageAction(_prev: PageSaveState, fd: FormData): Promise<PageSaveState> {
  let key: string
  try {
    const session = await requireAdminAction(fd)
    const title = str(fd, 'title', 120).trim()
    key = slugify(str(fd, 'slug', 100) || title)
    if (title.length < 2) return { error: 'Sayfa adı en az 2 karakter olmalı.' }
    if (!isValidPageSlug(key)) return { error: `“/${key}” kullanılamaz: sitede bu adreste başka bir bölüm var veya adres geçersiz.` }
    if (await getAdminPage(key)) return { error: 'Bu adreste zaten bir sayfa var.' }
    await saveAdminPage(
      {
        key,
        sha: null,
        meta: pageMetaSchema.parse({ title, status: 'draft' }),
        data: {
          root: { props: { title } },
          content: [{ type: 'SayfaBasligi', props: { id: 'SayfaBasligi-ilk', baslik: title, altyazi: '', _adv: { gizle: 'yok', ust: 'yok', alt: 'l', animasyon: 'yok', baglanti: '' } } }],
        },
      },
      session.sub,
    )
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect(`/admin/duzenleyici/${key}`)
}

export async function deletePageAction(_prev: PageSaveState, fd: FormData): Promise<PageSaveState> {
  try {
    const session = await requireAdminAction(fd)
    const key = str(fd, 'key', 100)
    if (str(fd, 'confirm', 100).trim() !== key) return { error: 'Silmeyi onaylamak için sayfanın adresini aynen yazın.' }
    await deleteAdminPage(key, str(fd, 'sha', 64), session.sub)
    revalidatePath('/admin', 'layout')
  } catch (e) {
    return describe(e)
  }
  redirect('/admin/sayfalar?durum=sayfa-silindi')
}
