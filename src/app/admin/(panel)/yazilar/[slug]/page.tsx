import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, getAdminMedia, getAdminPost } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { toEditorPost } from '@/lib/editor'
import { PostEditor } from '@/components/admin/PostEditor'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { Csrf } from '@/components/admin/Csrf'
import { setStatusAction } from '../../../actions'

export const metadata = { title: 'Yazıyı düzenle' }

export default async function EditPost({ params, searchParams }: PageProps<'/admin/yazilar/[slug]'>) {
  const session = await requireAdmin()
  const { slug } = await params
  const sp = await searchParams
  const r = await safeLoad(async () => {
    const [post, categories, media] = await Promise.all([getAdminPost(slug), getAdminCategories(), getAdminMedia()])
    return { post, categories: categories.value, media: media.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { post, categories, media } = r.data
  if (!post) notFound()
  const published = post.status === 'published'
  return (
    <>
      <div className="admin-head">
        <h1>Yazıyı düzenle</h1>
        <div className="admin-actions">
          <Link className="button button--quiet" href={`/admin/yazilar/${post.slug}/onizleme`}>
            Önizle
          </Link>
          <form action={setStatusAction}>
            <Csrf token={session.csrf} />
            <input type="hidden" name="slug" value={post.slug} />
            <input type="hidden" name="sha" value={post.sha} />
            <input type="hidden" name="status" value={published ? 'draft' : 'published'} />
            <button className="button button--quiet" type="submit">
              {published ? 'Yayından kaldır' : 'Yayınla'}
            </button>
          </form>
          <Link className="button button--danger" href={`/admin/yazilar/${post.slug}/sil`}>
            Sil
          </Link>
        </div>
      </div>
      <StatusBanner code={sp.durum} />
      <p className="admin-muted">
        Durum: {published ? 'yayında' : 'taslak'}. Revizyon: {post.revision}.
        {published ? (
          <>
            {' '}
            <a href={`/blog/${post.slug}`}>Sitedeki son dağıtım hâlini açın</a>.
          </>
        ) : null}
      </p>
      <PostEditor key={post.sha} csrf={session.csrf} post={toEditorPost(post)} categories={categories} media={media} />
    </>
  )
}
