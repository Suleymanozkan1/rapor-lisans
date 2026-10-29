import { requireAdmin } from '@/lib/auth/guard'
import { getAdminCategories, listAdminPosts } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { CategoryForms } from './CategoryForms'

export const metadata = { title: 'Kategoriler' }

export default async function CategoriesPage({ searchParams }: PageProps<'/admin/kategoriler'>) {
  const session = await requireAdmin()
  const { durum } = await searchParams
  const r = await safeLoad(async () => ({ cats: await getAdminCategories(), posts: (await listAdminPosts()).posts }))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const counts = Object.fromEntries(r.data.cats.value.map((c) => [c.slug, r.data.posts.filter((p) => p.category === c.slug).length]))
  return (
    <>
      <h1>Kategoriler</h1>
      <StatusBanner code={durum} />
      <p className="admin-muted">Kategoriler ana sayfadaki “Konu alanları” listesinde ve yazı filtrelerinde görünür.</p>
      <CategoryForms csrf={session.csrf} categories={r.data.cats.value} sha={r.data.cats.sha} counts={counts} />
    </>
  )
}
