import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminPage } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { DeletePageForm } from './DeletePageForm'

export const metadata = { title: 'Sayfayı sil' }

export default async function DeletePage({ params }: PageProps<'/admin/sayfalar/[key]/sil'>) {
  const session = await requireAdmin()
  const { key } = await params
  const r = await safeLoad(() => getAdminPage(key))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const page = r.data
  if (!page || page.system || !page.sha) notFound()
  return (
    <>
      <h1>Sayfayı sil</h1>
      <div className="notice notice--danger">
        <p>
          <strong>{page.meta.title}</strong> (/{page.key}) kalıcı olarak silinecek; bu adrese gelen ziyaretçiler “sayfa bulunamadı” görür.
          Silinen sayfa GitHub geçmişinden geri getirilebilir.
        </p>
      </div>
      <DeletePageForm csrf={session.csrf} pageKey={page.key} sha={page.sha} />
    </>
  )
}
