import { requireAdmin } from '@/lib/auth/guard'
import { recentActivity } from '@/lib/admin-content'
import { safeLoad } from '@/lib/safe'
import { formatDateTime } from '@/lib/format'
import { LoadError } from '@/components/admin/LoadError'

export const metadata = { title: 'İşlem kayıtları' }

export default async function LogPage() {
  await requireAdmin()
  const r = await safeLoad(() => recentActivity(50))
  if (r.error !== undefined) return <LoadError message={r.error} />
  return (
    <>
      <h1>İşlem kayıtları</h1>
      <p className="admin-muted">
        Paneldeki her değişiklik bir Git commit’i olarak saklanır: ne zaman, hangi içerik; yazar, GitHub token’ının sahibidir (kullanıcı adı güvenlik için commit mesajına yazılmaz). Parola, token veya çerez
        kaydedilmez. Tam geçmiş için deponun commit geçmişine bakın.
      </p>
      {r.data.length === 0 ? (
        <p className="admin-muted">Henüz kayıt yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Zaman</th>
              <th scope="col">İşlem</th>
              <th scope="col">Yazar</th>
            </tr>
          </thead>
          <tbody>
            {r.data.map((a) => (
              <tr key={a.sha}>
                <td>
                  <time dateTime={a.date}>{formatDateTime(a.date)}</time>
                </td>
                <td>
                  {a.url ? (
                    <a href={a.url} rel="noopener noreferrer" target="_blank">
                      {a.message.split('\n')[0]}
                    </a>
                  ) : (
                    a.message.split('\n')[0]
                  )}
                </td>
                <td>{a.author}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
