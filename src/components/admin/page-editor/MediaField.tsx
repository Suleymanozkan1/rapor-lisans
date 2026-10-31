'use client'

import { createContext, useContext } from 'react'
import type { CustomFieldRender } from '@puckeditor/core'

export type MediaOption = { src: string; alt: string }
export const MediaContext = createContext<MediaOption[]>([])

/** Thumbnail picker over the media library (Panel › Medya). */
export const MediaField: CustomFieldRender<string> = ({ field, name, value, onChange, readOnly }) => {
  const media = useContext(MediaContext)
  const current = media.find((m) => m.src === value)
  return (
    <div className="pe-media">
      <span className="pe-media__label">{field.label ?? name}</span>
      {value ? (
        <div className="pe-media__current">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" width={64} height={48} />
          <span>{current?.alt ?? value.split('/').pop()}</span>
          {readOnly ? null : (
            <button type="button" className="pe-media__clear" onClick={() => onChange('')}>
              Kaldır
            </button>
          )}
        </div>
      ) : null}
      {media.length === 0 ? (
        <p className="pe-media__empty">
          Kütüphane boş. Görselleri <a href="/admin/medya" target="_blank">Panel › Medya</a> bölümünden yükleyin.
        </p>
      ) : (
        <ul className="pe-media__grid" role="listbox" aria-label={field.label ?? name}>
          {media.map((m) => (
            <li key={m.src}>
              <button
                type="button"
                role="option"
                aria-selected={m.src === value}
                className="pe-media__item"
                title={m.alt}
                disabled={readOnly}
                onClick={() => onChange(m.src)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.alt} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
