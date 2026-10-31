/** Shown at once while a panel page loads its content from GitHub. */
export default function Loading() {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading__bar" aria-hidden="true" />
      <p>Yükleniyor…</p>
    </div>
  )
}
