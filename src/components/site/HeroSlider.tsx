'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react'

export type Slide = { key: string; label: string; content: ReactNode }

const reducedQuery = '(prefers-reduced-motion: reduce)'
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(reducedQuery)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

/**
 * Home page carousel (WAI-ARIA carousel pattern): the site intro, the latest
 * posts and store products rotate automatically. The progress bar's CSS
 * animation is the timer, so pausing (button, hover, keyboard focus) pauses
 * both together. No auto-rotation when the visitor prefers reduced motion.
 * Inactive slides are inert, so keyboard focus only reaches the visible one.
 */
export function HeroSlider({ slides, intervalMs = 6500 }: { slides: Slide[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false)
  const n = slides.length
  const auto = n > 1 && !reduced && !paused
  const go = (i: number) => setIndex(((i % n) + n) % n)

  return (
    <section
      className="hero hero-slider"
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
    >
      <div className="hero-slider__track" aria-live={auto ? 'off' : 'polite'}>
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`hero-slide${i === index ? ' is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${n}: ${s.label}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {s.content}
          </div>
        ))}
      </div>
      {n > 1 ? (
        <div className="wrap hero-slider__controls">
          <button type="button" className="hero-slider__btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi durdur'}>
            {paused ? <Play size={18} weight="fill" aria-hidden="true" /> : <Pause size={18} weight="fill" aria-hidden="true" />}
          </button>
          <button type="button" className="hero-slider__btn" onClick={() => go(index - 1)} aria-label="Önceki">
            <CaretLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <ol className="hero-slider__dots">
            {slides.map((s, i) => (
              <li key={s.key}>
                <button type="button" onClick={() => go(i)} aria-label={`${i + 1}. öğe: ${s.label}`} aria-current={i === index ? 'true' : undefined} />
              </li>
            ))}
          </ol>
          <button type="button" className="hero-slider__btn" onClick={() => go(index + 1)} aria-label="Sonraki">
            <CaretRight size={18} weight="bold" aria-hidden="true" />
          </button>
          {auto ? (
            <span
              key={index}
              className={`hero-slider__progress${hold ? ' is-held' : ''}`}
              style={{ animationDuration: `${intervalMs}ms` }}
              onAnimationEnd={() => go(index + 1)}
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
