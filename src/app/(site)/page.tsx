import Link from 'next/link'
import { BookOpenText, CalendarBlank, Clock, HardHat, Newspaper, ShoppingBagOpen, Warning } from '@phosphor-icons/react/ssr'
import { getCategories, getPublishedPosts, getPublishedProducts, getSettings, mediaFor } from '@/lib/content'
import { PostList, EmptyPosts } from '@/components/site/PostList'
import { ProductList } from '@/components/site/ProductList'
import { CategoryIcon, SITE_PHOTOS } from '@/lib/visuals'
import { HeroSlider } from '@/components/site/HeroSlider'
import { ProductMedia } from '@/components/site/ProductList'
import { categoryName } from '@/lib/posts'
import { formatDate, isoDay } from '@/lib/format'
import { markdownWordCount, readingMinutes } from '@/lib/markdown'
import { formatPrice } from '@/lib/products'
import { isForSale, type Post, type Product } from '@/lib/types'

/** Visual treatment per bento cell, in order; the grid has exactly as many cells as categories. */
const TOPIC_STYLES = ['topic--photo', 'topic--accent', 'topic--tint', 'topic--ink', '', 'topic--tint']

/** Icons for the purpose lines, in order (risk, mevzuat, saha, mağaza); decorative. */
const MOTTO_ICONS = [Warning, BookOpenText, HardHat, ShoppingBagOpen]

export default function HomePage() {
  const s = getSettings()
  const posts = getPublishedPosts()
  const categories = getCategories()
  const products = getPublishedProducts()
  const portrait = s.author.photo
  const portraitMeta = mediaFor(portrait?.src)
  const counts = Object.fromEntries(categories.map((c) => [c.slug, posts.filter((p) => p.category === c.slug).length]))

  const introSlide = (
    <div className="wrap hero__inner hero__inner--intro">
      <div className="hero__copy">
        {s.logo ? (
          // Decorative: the h1 carries the name.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero__logo rise" src={s.logo.src} alt="" width={136} height={136} fetchPriority="high" />
        ) : null}
        <h1 id="intro-title" className="rise rise-2">
          {s.siteName}
        </h1>
        {s.motto.length > 0 ? (
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
        ) : s.author.shortBio || s.description ? (
          <p className="hero__bio rise rise-3">{s.author.shortBio || s.description}</p>
        ) : null}
        <p className="hero__byline rise rise-3">
          <HardHat size={20} weight="fill" aria-hidden="true" />
          <span>
            Hazırlayan: <Link href="/hakkimda">{s.author.name}</Link>
            {s.author.jobTitle ? `, ${s.author.jobTitle}` : ''}
          </span>
        </p>
        <div className="hero__actions rise rise-4">
          <Link className="button button--black" href="/blog">
            Yazıları oku
          </Link>
          {products.length > 0 ? (
            <Link className="button button--outline-black" href="/magaza">
              Mağaza
            </Link>
          ) : (
            <Link className="button button--outline-black" href="/hakkimda">
              Hakkımda
            </Link>
          )}
        </div>
      </div>
      <div>
        <figure className="hero__visual">
          {portrait ? (
            <span className="hero__frame reveal-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portrait.src} alt={portrait.alt} width={portraitMeta?.width} height={portraitMeta?.height} fetchPriority="high" />
            </span>
          ) : (
            <span className="hero__frame reveal-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SITE_PHOTOS.hero.src}
                srcSet={SITE_PHOTOS.hero.srcSet}
                sizes="(min-width: 60rem) 40vw, 100vw"
                alt={SITE_PHOTOS.hero.alt}
                width={SITE_PHOTOS.hero.width}
                height={SITE_PHOTOS.hero.height}
                fetchPriority="high"
              />
            </span>
          )}
        </figure>
        {portrait ? null : <p className="hero__credit">Temsili görsel. Fotoğraf: {SITE_PHOTOS.hero.credit}</p>}
      </div>
    </div>
  )

  // Intro first, then the latest posts and store products, interleaved.
  const postSlides = posts.slice(0, 3).map((p) => ({ key: `yazi-${p.slug}`, kind: 'Gündem', label: p.title, content: <PostSlide post={p} category={categoryName(categories, p.category)} /> }))
  const productSlides = products.slice(0, 3).map((p) => ({ key: `urun-${p.slug}`, kind: 'Mağaza', label: p.title, content: <ProductSlide product={p} /> }))
  const slides = [{ key: 'tanitim', kind: 'Tanıtım', label: s.siteName, content: introSlide }]
  for (let i = 0; i < Math.max(postSlides.length, productSlides.length); i++) {
    if (postSlides[i]) slides.push(postSlides[i])
    if (productSlides[i]) slides.push(productSlides[i])
  }

  return (
    <>
      <HeroSlider slides={slides} />

      <section className="wrap section" aria-labelledby="latest-title">
        <div className="section__head">
          <h2 id="latest-title">Son yazılar</h2>
          {posts.length > 6 ? (
            <Link className="section__more" href="/blog">
              Tüm yazılar ({posts.length})
            </Link>
          ) : null}
        </div>
        {posts.length > 0 ? (
          // Feature (2x2) + 5 cards fill a 3-column grid exactly.
          <PostList posts={posts.slice(0, 6)} categories={categories} featured />
        ) : (
          <EmptyPosts title="İlk yazılar hazırlanıyor.">
            <p>Yayımlanan yazılar burada listelenecek. Konu başlıklarına aşağıdan göz atabilirsiniz.</p>
          </EmptyPosts>
        )}
      </section>

      {products.length > 0 ? (
        <section className="wrap section" aria-labelledby="store-title">
          <div className="section__head">
            <h2 id="store-title">Mağazadan</h2>
            <Link className="section__more" href="/magaza">
              {products.length > 3 ? `Tüm ürünler (${products.length})` : 'Mağazaya git'}
            </Link>
          </div>
          <ProductList products={products.slice(0, 3)} headingLevel={3} />
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="wrap section" aria-labelledby="topics-title">
          <div className="section__head">
            <h2 id="topics-title">Konu alanları</h2>
          </div>
          <div className="topics">
            {categories.map((c, i) => {
              const style = TOPIC_STYLES[i % TOPIC_STYLES.length]
              return (
                <Link key={c.slug} href={`/kategori/${c.slug}`} className={`topic reveal ${style}`}>
                  {style === 'topic--photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={SITE_PHOTOS.ppe.src} alt="" width={SITE_PHOTOS.ppe.width} height={SITE_PHOTOS.ppe.height} loading="lazy" />
                  ) : null}
                  <span className="topic__icon">
                    <CategoryIcon slug={c.slug} size={24} />
                  </span>
                  <h3>{c.name}</h3>
                  {c.description ? <p>{c.description}</p> : null}
                  <span className="topic__count">{counts[c.slug] ? `${counts[c.slug]} yazı` : 'Yakında'}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="band" aria-labelledby="contact-title">
        <div className="wrap band__inner">
          <div>
            <h2 id="contact-title">Bir sorunuz mu var?</h2>
            <p>{s.contact.note || 'Bir yazıyla ilgili soru, düzeltme veya öneriniz varsa yazabilirsiniz.'}</p>
          </div>
          <div>
            {s.contact.email ? (
              <a className="button button--black" href={`mailto:${s.contact.email}`}>
                E-posta gönder
              </a>
            ) : (
              <Link className="button button--black" href="/iletisim">
                İletişim
              </Link>
            )}
          </div>
        </div>
        <figure className="band__photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_PHOTOS.caution.src} alt="" width={SITE_PHOTOS.caution.width} height={SITE_PHOTOS.caution.height} loading="lazy" />
        </figure>
      </section>
    </>
  )
}

function PostSlide({ post: p, category }: { post: Post; category?: string }) {
  const cover = p.cover ? mediaFor(p.cover.src) : undefined
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
            {readingMinutes(markdownWordCount(p.body))} dk okuma
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

function ProductSlide({ product: p }: { product: Product }) {
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
          <ProductMedia product={p} />
        </figure>
      </div>
    </div>
  )
}
