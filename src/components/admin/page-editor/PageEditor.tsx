'use client'

import '@puckeditor/core/no-external.css'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Puck, useGetPuck, type Config, type Data } from '@puckeditor/core'
import { buildConfig } from '@/components/builder/config'
import type { SiteData } from '@/components/builder/site-data'
import { savePageAction } from '@/app/admin/page-actions'
import type { BuilderData, PageMeta } from '@/lib/pages/model'
import { TR_DICTIONARY } from './dictionary'
import { MediaContext, MediaField, type MediaOption } from './MediaField'

type Props = {
  csrf: string
  pageKey: string
  system: boolean
  path: string
  sha: string | null
  meta: PageMeta
  data: BuilderData
  site: SiteData
  media: MediaOption[]
}

const VIEWPORTS = [
  { width: 390, height: 'auto' as const, label: 'Telefon', icon: 'Smartphone' as const },
  { width: 820, height: 'auto' as const, label: 'Tablet', icon: 'Tablet' as const },
  { width: 1280, height: 'auto' as const, label: 'Masaüstü', icon: 'Monitor' as const },
]

type Status = { kind: 'idle' | 'saving' | 'ok' | 'error'; text: string }

export function PageEditor({ csrf, pageKey, system, path, sha: initialSha, meta, data, site, media }: Props) {
  const [sha, setSha] = useState(initialSha)
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: initialSha ? '' : 'Bu sayfa henüz düzenleyicide kaydedilmedi; sitede varsayılan düzen görünüyor.' })
  const dirty = useRef(false)

  const config = useMemo<Config>(() => {
    const base = buildConfig({ media: { type: 'custom', render: MediaField, metadata: { kind: 'media' } } })
    // Page settings: shown when no block is selected ("Sayfa" in the right panel).
    const fields: Record<string, unknown> = {
      title: { type: 'text', label: 'Sayfa adı (sekme başlığı ve arama sonuçları)' },
      description: { type: 'textarea', label: 'Arama motoru açıklaması (en fazla 170 karakter)' },
    }
    if (!system) {
      fields.status = {
        type: 'radio',
        label: 'Durum',
        options: [
          { value: 'draft', label: 'Taslak (sitede görünmez)' },
          { value: 'published', label: 'Yayında' },
        ],
      }
      fields.menu = {
        type: 'radio',
        label: 'Ana menüde göster',
        options: [
          { value: 'hayir', label: 'Hayır' },
          { value: 'evet', label: 'Evet' },
        ],
      }
      fields.menuLabel = { type: 'text', label: 'Menüdeki adı (boşsa sayfa adı)' }
      fields.menuOrder = { type: 'number', label: 'Menü sırası (küçük önce)', min: 0, max: 99 }
    }
    return { ...base, root: { ...base.root, fields } } as Config
  }, [system])

  const initial = useMemo<Data>(
    () => ({
      root: {
        props: {
          title: meta.title,
          description: meta.description,
          status: meta.status,
          menu: meta.menu ? 'evet' : 'hayir',
          menuLabel: meta.menuLabel,
          menuOrder: meta.menuOrder,
        },
      },
      content: data.content as Data['content'],
    }),
    [meta, data],
  )

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  async function save(next: Data) {
    setStatus({ kind: 'saving', text: 'Kaydediliyor…' })
    const fd = new FormData()
    fd.set('csrf', csrf)
    fd.set('key', pageKey)
    fd.set('sha', sha ?? '')
    fd.set('data', JSON.stringify(next))
    try {
      const r = await savePageAction(fd)
      if (r.error) {
        setStatus({ kind: 'error', text: r.error })
        return
      }
      if (r.sha) setSha(r.sha)
      dirty.current = false
      setStatus({ kind: 'ok', text: r.ok ?? 'Kaydedildi.' })
    } catch {
      setStatus({ kind: 'error', text: 'Sunucuya ulaşılamadı; değişiklikler kaydedilmedi. Bağlantınızı kontrol edip tekrar deneyin.' })
    }
  }

  // Puck's own publish control is not a <button>; this one is reachable by keyboard and screen readers.
  const headerActions = () => <HeaderActions status={status} path={path} onSave={save} />

  return (
    <MediaContext.Provider value={media}>
      <div className="pe">
        <Puck
          config={config}
          data={initial}
          metadata={site}
          dictionary={TR_DICTIONARY}
          viewports={VIEWPORTS}
          headerTitle={`${meta.title} (${path})`}
          onChange={() => {
            dirty.current = true
          }}
          onPublish={save}
          overrides={{ headerActions }}
        />
      </div>
    </MediaContext.Provider>
  )
}

function HeaderActions({ status, path, onSave }: { status: Status; path: string; onSave: (d: Data) => void }) {
  const getPuck = useGetPuck()
  return (
    <>
      <span className={`pe-status pe-status--${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
        {status.text}
      </span>
      <a className="pe-link" href={path} target="_blank" rel="noopener">
        Sitede aç
      </a>
      <Link className="pe-link" href="/admin/sayfalar">
        Sayfalar
      </Link>
      <button type="button" className="pe-save" disabled={status.kind === 'saving'} onClick={() => onSave(getPuck().appState.data)}>
        {status.kind === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </>
  )
}
