import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminPost } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { DeletePostForm } from './DeletePostForm'

export const metadata = { title: 'Yazıyı sil' }

export default async function DeletePostPage({ params }: PageProps<'/admin/yazilar/[slug]/sil'>) {
  const session = await requireAdmin()
  const { slug } = await params
  const r = await safeLoad(() => getAdminPost(slug))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const post = r.data
  if (!post) notFound()
  return (
    <>
      <h1>Yazıyı sil</h1>
      <div className="notice notice--danger">
        <p>
          <strong>{post.title}</strong> kalıcı olarak silinecek. {post.status === 'published' ? 'Yazı şu an yayında; bağlantısı 404 verecek.' : ''}{' '}
          Silinen yazı Git geçmişinden geri getirilebilir (README: “Yedekleme ve geri yükleme”).
        </p>
      </div>
      <p>
        Yalnızca gizlemek istiyorsanız silmek yerine <Link href={`/admin/yazilar/${post.slug}`}>yayından kaldırın</Link>.
      </p>
      <DeletePostForm csrf={session.csrf} slug={post.slug} sha={post.sha} />
    </>
  )
}
