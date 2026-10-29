import type { Metadata } from 'next'
import './admin.css'

/** Admin output must never be prerendered or cached. */
export const dynamic = 'force-dynamic'
/** Caps a stuck request (e.g. a slow GitHub API call) well below the Hobby plan's 300 s maximum. */
export const maxDuration = 30

export const metadata: Metadata = {
  title: { default: 'Yönetim paneli', template: '%s | Yönetim paneli' },
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>
}
