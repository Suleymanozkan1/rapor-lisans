import {
  ChalkboardTeacher,
  ClipboardText,
  FirstAid,
  Folder,
  HardHat,
  Scales,
  Siren,
} from '@phosphor-icons/react/ssr'
import type { Icon } from '@phosphor-icons/react'

/** Icons for the default topic slugs; unknown categories fall back to a folder. */
const CATEGORY_ICONS: Record<string, Icon> = {
  'risk-degerlendirmesi': ClipboardText,
  'is-kazalari': FirstAid,
  mevzuat: Scales,
  egitim: ChalkboardTeacher,
  'saha-uygulamalari': HardHat,
  'acil-durumlar': Siren,
}

export function CategoryIcon({ slug, size = 22 }: { slug?: string; size?: number }) {
  const C = (slug && CATEGORY_ICONS[slug]) || Folder
  return <C size={size} weight="duotone" aria-hidden="true" />
}

/**
 * Site photos (Unsplash License, verified 2026-10-29; see public/images/CREDITS.md).
 * They are representative and never presented as a specific workplace or incident.
 */
export const SITE_PHOTOS = {
  hero: {
    src: '/images/baretler-sira.jpg',
    srcSet: '/images/baretler-sira-900.jpg 900w, /images/baretler-sira.jpg 1800w',
    width: 1800,
    height: 1200,
    alt: 'Karton üzerinde sıra hâlinde dizilmiş kırmızı baretler',
    credit: 'Declan Sun, Unsplash',
  },
  ppe: {
    src: '/images/baret-yelek-duvar-700.jpg',
    width: 700,
    height: 700,
    alt: 'Duvarda asılı turuncu baretler ve sarı reflektörlü yelekler',
    credit: 'Tanya Paquet, Unsplash',
  },
  caution: {
    src: '/images/uyari-seridi-koni-1600.jpg',
    width: 1600,
    height: 700,
    alt: 'Ahşap direğe bağlı sarı uyarı şeridi ve kırmızı trafik konisi',
    credit: 'John Cardamone, Unsplash',
  },
} as const

/**
 * Category mark styled as an ISO 7010 warning sign: a yellow triangle with the
 * category pictogram. Used wherever a post is labelled with its topic.
 */
export function SignMark({ slug, size = 'sm' }: { slug?: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={`sign-mark sign-mark--${size}`} aria-hidden="true">
      <CategoryIcon slug={slug} size={size === 'lg' ? 26 : 12} />
    </span>
  )
}
