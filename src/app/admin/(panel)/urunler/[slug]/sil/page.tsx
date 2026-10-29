import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminProduct } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { DeleteProductForm } from './DeleteProductForm'

export const metadata = { title: 'Ürünü sil' }

export default async function DeleteProductPage({ params }: PageProps<'/admin/urunler/[slug]/sil'>) {
  const session = await requireAdmin()
  const { slug } = await params
  const r = await safeLoad(() => getAdminProduct(slug))
  if (r.error !== undefined) return <LoadError message={r.error} />
  const product = r.data
  if (!product) notFound()
  return (
    <>
      <h1>Ürünü sil</h1>
      <div className="notice notice--danger">
        <p>
          <strong>{product.title}</strong> mağazadan kalıcı olarak silinecek. Daha önce satın alanların siparişleri ve indirme
          bağlantıları etkilenmez: satılan dosya depoda kalır.
        </p>
      </div>
      <DeleteProductForm csrf={session.csrf} slug={product.slug} sha={product.sha} />
    </>
  )
}
