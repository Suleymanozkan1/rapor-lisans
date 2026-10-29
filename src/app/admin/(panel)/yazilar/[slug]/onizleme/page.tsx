import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, getAdminMedia, getAdminPost, getAdminSettings } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { renderMarkdown } from '@/lib/markdown'
import { ArticleView } from '@/components/site/ArticleView'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'Önizleme' }

/** Renders the stored version (draft or published) with the public article template. Admin-only, noindex. */
export default async function Preview({ params }: PageProps<'/admin/yazilar/[slug]/onizleme'>) {
  await requireAdmin()
  const { slug } = await params
  const r = await safeLoad(async () => ({
    post: await getAdminPost(slug),
    settings: (await getAdminSettings()).value,
    categories: (await getAdminCategories()).value,
    media: (await getAdminMedia()).value,
  }))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { post, settings, categories, media } = r.data
  if (!post) notFound()
  const rendered = await renderMarkdown(post.body)
  return (
    <>
      <div className="notice notice--warn" role="status">
        <p>
          Önizleme: {post.status === 'published' ? 'yayındaki yazının kayıtlı hâli' : 'bu yazı taslak, ziyaretçiler göremez'}.{' '}
          <Link href={`/admin/yazilar/${post.slug}`}>Düzenlemeye dön</Link>
        </p>
      </div>
      <div className="admin-preview">
        <ArticleView
          post={post}
          rendered={rendered}
          settings={settings}
          categories={categories}
          cover={media.find((m) => m.src === post.cover?.src)}
          related={[]}
        />
      </div>
    </>
  )
}
