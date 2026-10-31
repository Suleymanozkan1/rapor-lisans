'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pause, Play } from '@phosphor-icons/react'

export type TickerItem = { href: string; label: string }

/**
 * Hazard-tape news band: the latest headlines run between yellow and black
 * stripes. It pauses on hover and focus, and with its own button
 * (WCAG 2.2.2); with reduced motion it does not move at all and scrolls by
 * hand instead. The second copy only closes the loop without a jump and is hidden
 * from assistive technology and the keyboard.
 */
export function HazardTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false)
  if (items.length === 0) return null
  const list = (copy: boolean) => (
    <ul className="ticker__list" aria-hidden={copy || undefined}>
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} tabIndex={copy ? -1 : undefined}>
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <section className={`ticker${paused ? ' is-paused' : ''}`} aria-label="Son yazılar bandı">
      <div className="ticker__viewport">
        <div className="ticker__track">
          {list(false)}
          {list(true)}
        </div>
      </div>
      <button type="button" className="ticker__toggle" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Bandı oynat' : 'Bandı durdur'}>
        {paused ? <Play size={16} weight="fill" aria-hidden="true" /> : <Pause size={16} weight="fill" aria-hidden="true" />}
      </button>
    </section>
  )
}
