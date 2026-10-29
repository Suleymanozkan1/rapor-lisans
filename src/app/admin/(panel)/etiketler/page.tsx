import { requireAdmin } from '@/lib/auth/guard'
import { listAdminPosts } from '@/lib/admin-content'
import { allTags } from '@/lib/posts'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { TagForm } from './TagForm'

export const metadata = { title: 'Etiketler' }

export default async function TagsPage({ searchParams }: PageProps<'/admin/etiketler'>) {
  const session = await requireAdmin()
  const { durum } = await searchParams
  const r = await safeLoad(() => listAdminPosts())
  if (r.error !== undefined) return <LoadError message={r.error} />
  const tags = allTags(r.data.posts)
  return (
    <>
      <h1>Etiketler</h1>
      <StatusBanner code={durum} />
      <p className="admin-muted">
        Etiketler yazı düzenleyicisinde eklenir. Burada bir etiketi tüm yazılarda tek seferde yeniden adlandırabilir veya
        kaldırabilirsiniz.
      </p>
      {tags.length === 0 ? (
        <p className="admin-muted">Henüz etiket yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Etiket</th>
              <th scope="col">Yazı</th>
              <th scope="col">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.slug}>
                <td>
                  {t.label}
                  <div className="admin-muted">/etiket/{t.slug}</div>
                </td>
                <td>{t.count}</td>
                <td>
                  <TagForm csrf={session.csrf} slug={t.slug} label={t.label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
