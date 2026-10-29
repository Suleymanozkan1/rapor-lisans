import { requireAdmin } from '@/lib/auth/guard'
import { getAdminMedia } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { MAX_UPLOAD_BYTES } from '@/lib/upload'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { UploadForm, DeleteMediaForm } from './MediaForms'

export const metadata = { title: 'Medya' }

export default async function MediaPage({ searchParams }: PageProps<'/admin/medya'>) {
  const session = await requireAdmin()
  const { durum } = await searchParams
  const r = await safeLoad(() => getAdminMedia())
  if (r.error !== undefined) return <LoadError message={r.error} />
  const { value: media, sha } = r.data
  return (
    <>
      <h1>Medya</h1>
      <StatusBanner code={durum} />
      <section className="admin-section">
        <h2>Görsel yükle</h2>
        <p className="admin-muted">
          JPEG, PNG veya WebP; en fazla {MAX_UPLOAD_BYTES / 1024 / 1024} MB. Yüklemeden önce görseli web için küçültün (örneğin 1600 px
          genişlik). Yalnızca kullanım hakkına sahip olduğunuz görselleri yükleyin; temsili bir görseli gerçek olay fotoğrafı gibi
          sunmayın.
        </p>
        <UploadForm csrf={session.csrf} />
      </section>
      <section className="admin-section">
        <h2>Kütüphane</h2>
        <p className="admin-muted">Yeni yüklenen görseller sitede ve burada bir sonraki dağıtımdan sonra görünür.</p>
        {media.length === 0 ? (
          <p className="admin-muted">Henüz görsel yok.</p>
        ) : (
          <ul className="admin-media">
            {media.map((m) => (
              <li key={m.src}>
                {/* Uploaded files appear on the site after the next deployment. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading="lazy" />
                <div>
                  <p>{m.alt}</p>
                  <p className="admin-muted">
                    {m.width}×{m.height}, {Math.round(m.bytes / 1024)} KB, {formatDateTime(m.uploadedAt)}
                  </p>
                  <label className="admin-muted">
                    Markdown:
                    <input type="text" readOnly value={`![${m.alt}](${m.src})`} />
                  </label>
                  <DeleteMediaForm csrf={session.csrf} src={m.src} sha={sha} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
