import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, getAdminMedia } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { PostEditor } from '@/components/admin/PostEditor'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'Yeni yazı' }

export default async function NewPost() {
  const session = await requireAdmin()
  const r = await safeLoad(async () => {
    const [categories, media] = await Promise.all([getAdminCategories(), getAdminMedia()])
    return { categories: categories.value, media: media.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  return (
    <>
      <h1>Yeni yazı</h1>
      <PostEditor csrf={session.csrf} post={null} categories={r.data.categories} media={r.data.media} />
    </>
  )
}
