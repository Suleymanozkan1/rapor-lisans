'use client'

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react'

export type Slide = { key: string; kind: string; label: string; content: ReactNode }

const reducedQuery = '(prefers-reduced-motion: reduce)'
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(reducedQuery)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

/**
 * Home page carousel in the style of Instagram stories (WAI-ARIA carousel
 * pattern). Each slide is a yellow and black poster; the next one wipes over
 * the previous along the slanted edge. The current story bar's CSS animation
 * is the timer, so pausing (button, hover, focus) pauses both. Swipe on touch
 * screens, arrow keys on the keyboard. No auto-rotation and no wipe when the
 * visitor prefers reduced motion. Inactive slides are inert.
 */
export function HeroSlider({ slides, intervalMs = 6500 }: { slides: Slide[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false)
  const touchX = useRef<number | null>(null)
  const n = slides.length
  const auto = n > 1 && !reduced && !paused

  const go = (i: number, d: 'next' | 'prev' = i > index ? 'next' : 'prev') => {
    const to = ((i % n) + n) % n
    if (to === index) return
    setDir(d)
    // Without the wipe (reduced motion) there is no outgoing poster to keep.
    setLeaving(reduced ? null : index)
    setIndex(to)
  }
  const next = () => go(index + 1, 'next')
  const prev = () => go(index - 1, 'prev')
  const upcoming = slides[(index + 1) % n]

  return (
    <section
      className={`hero hero-slider hero-slider--${dir}`}
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next()
        else if (e.key === 'ArrowLeft') prev()
      }}
    >
      {n > 1 ? (
        <div className="wrap hero-slider__stories">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className="story"
              onClick={() => go(i)}
              aria-label={`${i + 1}. ${s.kind}: ${s.label}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <span
                key={i === index ? `on-${index}` : 'off'}
                className={`story__fill story__fill--${i < index ? 'past' : i === index ? (auto ? 'run' : 'full') : 'future'}${hold ? ' is-held' : ''}`}
                style={i === index && auto ? { animationDuration: `${intervalMs}ms` } : undefined}
                // The fill (::after) ends at the same moment and bubbles here too: only the clock advances.
                onAnimationEnd={i === index && auto ? (e) => e.animationName === 'story-clock' && next() : undefined}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="hero-slider__track"
        aria-live={auto ? 'off' : 'polite'}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') touchX.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (touchX.current === null) return
          const dx = e.clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 50) {
            if (dx < 0) next()
            else prev()
          }
        }}
      >
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`hero-slide${i === index ? ' is-active' : ''}${i === leaving ? ' is-leaving' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${n}: ${s.label}`}
            aria-hidden={i !== index}
            inert={i !== index}
            onAnimationEnd={(e) => {
              if (i === index && e.target === e.currentTarget) setLeaving(null)
            }}
          >
            {s.content}
          </div>
        ))}
      </div>

      {n > 1 ? (
        <div className="wrap hero-slider__controls">
          <div className="hero-slider__buttons">
            <button type="button" className="hero-slider__btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi durdur'}>
              {paused ? <Play size={18} weight="fill" aria-hidden="true" /> : <Pause size={18} weight="fill" aria-hidden="true" />}
            </button>
            <button type="button" className="hero-slider__btn" onClick={prev} aria-label="Önceki">
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <button type="button" className="hero-slider__btn" onClick={next} aria-label="Sonraki">
              <CaretRight size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="hero-slider__next" onClick={next} aria-label={`Sıradaki: ${upcoming.kind}, ${upcoming.label}`}>
            <small>
              Sıradaki <em>{upcoming.kind}</em>
            </small>
            <span>{upcoming.label}</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
