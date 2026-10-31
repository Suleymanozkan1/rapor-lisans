import Link from 'next/link'
import { BookOpenText, CalendarBlank, Clock, HardHat, Newspaper, ShoppingBagOpen, Warning } from '@phosphor-icons/react/ssr'
import { CategoryIcon, SITE_PHOTOS } from '@/lib/visuals'
import { formatDate, isoDay } from '@/lib/format'
import { formatPrice } from '@/lib/products'
import { isForSale, type Post, type Product, type Settings } from '@/lib/types'
import type { SiteLookup } from './lookup'
import { ProductMediaView } from './products'

/** Icons for the purpose lines, in order (risk, mevzuat, saha, mağaza); decorative. */
const MOTTO_ICONS = [Warning, BookOpenText, HardHat, ShoppingBagOpen]

export type IntroOptions = {
  /** Heading; the site name when empty. */
  title?: string
  /** Text under the heading when the site has no motto lines. */
  text?: string
  /** Library image; the portrait from the settings, else the stock photo, when empty. */
  image?: string
  imageAlt?: string
  primary?: { label: string; href: string }
  secondary?: { label: string; href: string }
}

export function IntroSlide({ settings: s, hasProducts, lookup, options: o = {} }: { settings: Settings; hasProducts: boolean; lookup: SiteLookup; options?: IntroOptions }) {
  const custom = o.image ? { src: o.image, alt: o.imageAlt || '', ...lookup.dims(o.image) } : null
  const portrait = !custom && s.author.photo ? { ...s.author.photo, ...lookup.dims(s.author.photo.src) } : null
  const primary = o.primary?.label ? o.primary : { label: 'Yazıları oku', href: '/blog' }
  const secondary = o.secondary?.label ? o.secondary : hasProducts ? { label: 'Mağaza', href: '/magaza' } : { label: 'Hakkımda', href: '/hakkimda' }
  const shown = custom ?? portrait
  return (
    <div className="wrap hero__inner hero__inner--intro">
      <div className="hero__copy">
        {s.logo ? (
          // Decorative: the h1 carries the name.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero__logo rise" src={s.logo.src} alt="" width={136} height={136} fetchPriority="high" />
        ) : null}
        <h1 id="intro-title" className="rise rise-2">
          {o.title || s.siteName}
        </h1>
        {s.motto.length > 0 && !o.text ? (
          <ul className="hero__motto rise rise-3">
            {s.motto.map((line, i) => {
              const I = MOTTO_ICONS[i] ?? HardHat
              return (
                <li key={line}>
                  <I size={28} weight="fill" aria-hidden="true" />
                  {line}
                </li>
              )
            })}
          </ul>
        ) : o.text || s.author.shortBio || s.description ? (
          <p className="hero__bio rise rise-3">{o.text || s.author.shortBio || s.description}</p>
        ) : null}
        <p className="hero__byline rise rise-3">
          <HardHat size={20} weight="fill" aria-hidden="true" />
          <span>
            Hazırlayan: <Link href="/hakkimda">{s.author.name}</Link>
            {s.author.jobTitle ? `, ${s.author.jobTitle}` : ''}
          </span>
        </p>
        <div className="hero__actions rise rise-4">
          <Link className="button button--black" href={primary.href}>
            {primary.label}
          </Link>
          <Link className="button button--outline-black" href={secondary.href}>
            {secondary.label}
          </Link>
        </div>
      </div>
      <div>
        <figure className="hero__visual">
          <span className="hero__frame reveal-media">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown.src} alt={shown.alt} width={shown.width} height={shown.height} fetchPriority="high" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={SITE_PHOTOS.hero.src}
                srcSet={SITE_PHOTOS.hero.srcSet}
                sizes="(min-width: 60rem) 40vw, 100vw"
                alt={SITE_PHOTOS.hero.alt}
                width={SITE_PHOTOS.hero.width}
                height={SITE_PHOTOS.hero.height}
                fetchPriority="high"
              />
            )}
          </span>
        </figure>
        {shown ? null : <p className="hero__credit">Temsili görsel. Fotoğraf: {SITE_PHOTOS.hero.credit}</p>}
      </div>
    </div>
  )
}

export function PostSlide({ post: p, category, lookup }: { post: Post; category?: string; lookup: SiteLookup }) {
  const cover = p.cover ? lookup.dims(p.cover.src) : undefined
  return (
    <div className="wrap hero__inner hero__inner--story">
      <div className="hero__copy">
        <p className="hero__eyebrow rise">
          <Newspaper size={22} weight="fill" aria-hidden="true" />
          Gündem
          {category ? <span className="hero__tag">{category}</span> : null}
        </p>
        <h2 className="hero__title rise rise-2">
          <Link href={`/blog/${p.slug}`}>{p.title}</Link>
        </h2>
        {p.excerpt ? <p className="hero__bio rise rise-3">{p.excerpt}</p> : null}
        <p className="hero__meta rise rise-3">
          <span>
            <CalendarBlank size={18} aria-hidden="true" />
            <time dateTime={isoDay(p.publishedAt)}>{formatDate(p.publishedAt)}</time>
          </span>
          <span>
            <Clock size={18} aria-hidden="true" />
            {lookup.minutes(p)} dk okuma
          </span>
        </p>
        <div className="hero__actions rise rise-4">
          <Link className="button button--black" href={`/blog/${p.slug}`}>
            Yazıyı oku
          </Link>
          <Link className="button button--outline-black" href="/blog">
            Tüm yazılar
          </Link>
        </div>
      </div>
      <div>
        <figure className="hero__visual">
          {p.cover ? (
            <span className="hero__frame reveal-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover.src} alt={p.cover.alt} width={cover?.width} height={cover?.height} loading="lazy" decoding="async" />
            </span>
          ) : (
            <div className="hero__art reveal-media" aria-hidden="true">
              <CategoryIcon slug={p.category} size={160} />
            </div>
          )}
        </figure>
      </div>
    </div>
  )
}

export function ProductSlide({ product: p, lookup }: { product: Product; lookup: SiteLookup }) {
  const price = formatPrice(p.price)
  return (
    <div className="wrap hero__inner hero__inner--story">
      <div className="hero__copy">
        <p className="hero__eyebrow rise">
          <ShoppingBagOpen size={22} weight="fill" aria-hidden="true" />
          Mağaza
          {p.sample ? <span className="hero__tag">Örnek ürün</span> : null}
        </p>
        <h2 className="hero__title rise rise-2">
          <Link href={`/magaza/${p.slug}`}>{p.title}</Link>
        </h2>
        {p.excerpt ? <p className="hero__bio rise rise-3">{p.excerpt}</p> : null}
        {price ? (
          <p className="hero__price rise rise-3">
            {price}
            {p.format ? <small>{p.format}</small> : null}
          </p>
        ) : null}
        <div className="hero__actions rise rise-4">
          {isForSale(p) ? (
            <>
              <Link className="button button--black" href={`/magaza/${p.slug}/satin-al`}>
                Satın al
              </Link>
              <Link className="button button--outline-black" href={`/magaza/${p.slug}`}>
                İncele
              </Link>
            </>
          ) : (
            <>
              <Link className="button button--black" href={`/magaza/${p.slug}`}>
                İncele
              </Link>
              <Link className="button button--outline-black" href="/magaza">
                Mağaza
              </Link>
            </>
          )}
        </div>
      </div>
      <div>
        <figure className="hero__visual hero__visual--product reveal-media">
          <ProductMediaView product={p} lookup={lookup} />
        </figure>
      </div>
    </div>
  )
}
