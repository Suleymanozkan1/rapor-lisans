import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guard'
import { getAdminMedia, getAdminProduct } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { fileStoreKind } from '@/lib/files'
import { toEditorProduct } from '@/lib/editor'
import { ProductEditor } from '@/components/admin/ProductEditor'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'

export const metadata = { title: 'Ürünü düzenle' }

export default async function EditProduct({ params, searchParams }: PageProps<'/admin/urunler/[slug]'>) {
  const session = await requireAdmin()
  const { slug } = await params
  const sp = await searchParams
  const r = await safeLoad(async () => {
    const [product, media] = await Promise.all([getAdminProduct(slug), getAdminMedia()])
    return { product, media: media.value }
  })
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { product, media } = r.data
  if (!product) notFound()
  return (
    <>
      <div className="admin-head">
        <h1>Ürünü düzenle</h1>
        <div className="admin-actions">
          <Link className="button button--danger" href={`/admin/urunler/${product.slug}/sil`}>
            Sil
          </Link>
        </div>
      </div>
      <StatusBanner code={sp.durum} />
      <p className="admin-muted">
        Durum: {product.status === 'published' ? 'yayında' : 'taslak'}.
        {product.status === 'published' ? (
          <>
            {' '}
            <a href={`/magaza/${product.slug}`}>Sitedeki son dağıtım hâlini açın</a>.
          </>
        ) : null}
      </p>
      <ProductEditor key={product.sha} csrf={session.csrf} product={toEditorProduct(product)} media={media} fileStore={fileStoreKind()} />
    </>
  )
}
