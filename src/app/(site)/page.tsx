import Link from 'next/link'
import { HardHat } from '@phosphor-icons/react/ssr'
import { getCategories, getPublishedPosts, getSettings, mediaFor } from '@/lib/content'
import { PostList, EmptyPosts } from '@/components/site/PostList'
import { CategoryIcon, SITE_PHOTOS } from '@/lib/visuals'

/** Visual treatment per bento cell, in order; the grid has exactly as many cells as categories. */
const TOPIC_STYLES = ['topic--photo', 'topic--accent', 'topic--tint', 'topic--ink', '', 'topic--tint']

export default function HomePage() {
  const s = getSettings()
  const posts = getPublishedPosts()
  const categories = getCategories()
  const latest = posts[0]
  const portrait = s.author.photo
  const portraitMeta = mediaFor(portrait?.src)
  const counts = Object.fromEntries(categories.map((c) => [c.slug, posts.filter((p) => p.category === c.slug).length]))

  return (
    <>
      <section className="hero" aria-labelledby="intro-title">
        <div className="wrap hero__inner">
          <div>
            {s.author.jobTitle ? (
              <p className="hero__role rise">
                <HardHat size={24} weight="fill" aria-hidden="true" />
                {s.author.jobTitle}
              </p>
            ) : null}
            <h1 id="intro-title" className="rise rise-2">
              {s.author.name}
            </h1>
            {s.author.shortBio || s.description ? <p className="hero__bio rise rise-3">{s.author.shortBio || s.description}</p> : null}
            <div className="hero__actions rise rise-4">
              <Link className="button" href="/blog">
                Yazıları oku
              </Link>
              <Link className="button button--ghost-light" href="/hakkimda">
                Hakkımda
              </Link>
            </div>
          </div>
          <div>
            <figure className="hero__visual">
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="reveal-media" src={portrait.src} alt={portrait.alt} width={portraitMeta?.width} height={portraitMeta?.height} fetchPriority="high" />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="reveal-media"
                    src={SITE_PHOTOS.hero.src}
                    srcSet={SITE_PHOTOS.hero.srcSet}
                    sizes="(min-width: 60rem) 40vw, 100vw"
                    alt={SITE_PHOTOS.hero.alt}
                    width={SITE_PHOTOS.hero.width}
                    height={SITE_PHOTOS.hero.height}
                    fetchPriority="high"
                  />
                </>
              )}
            </figure>
            {latest ? (
              <Link className="hero__latest rise rise-4" href={`/blog/${latest.slug}`}>
                <small>Son yazı</small>
                <strong>{latest.title}</strong>
              </Link>
            ) : null}
            {portrait ? null : <p className="hero__credit">Temsili görsel. Fotoğraf: {SITE_PHOTOS.hero.credit}</p>}
          </div>
        </div>
      </section>

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
              <a className="button button--ink" href={`mailto:${s.contact.email}`}>
                E-posta gönder
              </a>
            ) : (
              <Link className="button button--ink" href="/iletisim">
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
