import { requireAdmin } from '@/lib/auth/guard'
import { getAdminMedia, getAdminSettings } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { LoadError } from '@/components/admin/LoadError'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { SettingsForm } from './SettingsForm'

export const metadata = { title: 'Site ayarları' }

export default async function SettingsPage({ searchParams }: PageProps<'/admin/ayarlar'>) {
  const session = await requireAdmin()
  const { durum } = await searchParams
  const r = await safeLoad(async () => ({ settings: await getAdminSettings(), media: (await getAdminMedia()).value }))
  if (r.error !== undefined) return <LoadError message={r.error} />
  return (
    <>
      <h1>Site ayarları</h1>
      <StatusBanner code={durum} />
      <div className="notice notice--warn">
        <p>
          Yalnızca doğrulanmış bilgileri girin. Belge, sertifika, unvan veya referans eklerken belgesi elinizde olmayan bilgiyi
          yazmayın; boş alanlar sitede gösterilmez.
        </p>
      </div>
      <SettingsForm csrf={session.csrf} settings={r.data.settings.value} sha={r.data.settings.sha} media={r.data.media} />
    </>
  )
}
