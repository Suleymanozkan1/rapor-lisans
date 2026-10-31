'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Play } from '@phosphor-icons/react'

/** ARIA tabs (arrow keys move between tabs). Panels are rendered on the server and only shown/hidden here. */
export function Tabs({ labels, panels }: { labels: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = labels.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    setActive(next)
    refs.current[next]?.focus()
  }
  return (
    <div className="bk-tabs">
      <div className="bk-tabs__list" role="tablist">
        {labels.map((l, i) => (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-t${i}`}
            aria-controls={`${base}-p${i}`}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            className="bk-tabs__tab"
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {l}
          </button>
        ))}
      </div>
      {panels.map((p, i) => (
        <div key={i} role="tabpanel" id={`${base}-p${i}`} aria-labelledby={`${base}-t${i}`} hidden={i !== active} className="bk-tabs__panel" tabIndex={0}>
          {p}
        </div>
      ))}
    </div>
  )
}

/**
 * Video that loads only after a click: until then nothing is requested from
 * YouTube or Vimeo (no cookies, no tracking before consent).
 */
export function VideoFacade({ src, title, provider }: { src: string; title: string; provider: 'youtube' | 'vimeo' }) {
  const [on, setOn] = useState(false)
  if (on) {
    return (
      <iframe
        className="bk-video__frame"
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    )
  }
  return (
    <button type="button" className="bk-video__poster" onClick={() => setOn(true)}>
      <Play size={44} weight="fill" aria-hidden="true" />
      <span>
        {title} <small>({provider === 'youtube' ? 'YouTube' : 'Vimeo'}; tıklayınca yüklenir)</small>
      </span>
    </button>
  )
}
