import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, getAdminMedia, getAdminPage, getAdminSettings, listAdminPosts, listAdminProducts } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { isPublic, sortByDate } from '@/lib/posts'
import { pagePath } from '@/lib/pages/model'
import { makeSiteData } from '@/lib/pages/site-data'
import { LoadError } from '@/components/admin/LoadError'
import { PageEditor } from '@/components/admin/page-editor/PageEditor'

export const metadata = { title: 'Sayfa düzenleyici' }

/** Full-screen page editor (outside the panel frame). Content comes from the store, so drafts and unpublished edits show. */
export default async function EditorPage({ params }: PageProps<'/admin/duzenleyici/[key]'>) {
  const session = await requireAdmin()
  const { key } = await params
  const r = await safeLoad(async () => {
    const [page, settings, posts, products, categories, media] = await Promise.all([
      getAdminPage(key),
      getAdminSettings(),
      listAdminPosts(),
      listAdminProducts(),
      getAdminCategories(),
      getAdminMedia(),
    ])
    return { page, settings: settings.value, posts: posts.posts, products: products.products, categories: categories.value, media: media.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { page, settings, posts, products, categories, media } = r.data
  if (!page) notFound()
  const site = makeSiteData({
    settings,
    posts: sortByDate(posts.filter((p) => isPublic(p))),
    products: products.filter((p) => p.status === 'published'),
    categories,
    media,
  })
  return (
    <PageEditor
      csrf={session.csrf}
      pageKey={page.key}
      system={page.system}
      path={pagePath(page.key)}
      sha={page.sha}
      meta={page.meta}
      data={page.data}
      site={site}
      media={media.map((m) => ({ src: m.src, alt: m.alt }))}
    />
  )
}
