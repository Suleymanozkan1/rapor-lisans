import { requireAdmin } from '@/lib/auth/guard'
import { getAdminMedia } from '@/lib/admin-content'
import { fileStoreKind } from '@/lib/files'
import { safeLoad } from '@/lib/safe'
import { ProductEditor } from '@/components/admin/ProductEditor'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'Yeni ürün' }

export default async function NewProduct() {
  const session = await requireAdmin()
  const r = await safeLoad(async () => ({ media: (await getAdminMedia()).value }))
  if (r.error !== undefined) return <LoadError message={r.error} />
  return (
    <>
      <h1>Yeni ürün</h1>
      <ProductEditor csrf={session.csrf} product={null} media={r.data.media} fileStore={fileStoreKind()} />
    </>
  )
}
