import Link from 'next/link'
import type { Category, Post, Settings } from '@/lib/types'
import type { MediaItem } from '@/lib/media'
import type { RenderedMarkdown } from '@/lib/markdown'
import { readingMinutes } from '@/lib/markdown'
import { categoryName } from '@/lib/posts'
import { slugify } from '@/lib/slug'
import { formatDate, isoDay } from '@/lib/format'
import { PostList } from './PostList'
import { CategoryIcon } from '@/lib/visuals'
import {
  ArrowsClockwise,
  CalendarBlank,
  Clock,
  EnvelopeSimple,
  LinkedinLogo,
  Stack,
  Tag,
  UserCircle,
  WhatsappLogo,
  XLogo,
} from '@phosphor-icons/react/ssr'

type Props = {
  post: Post
  rendered: RenderedMarkdown
  settings: Settings
  categories: Category[]
  cover?: MediaItem
  related: Post[]
  /** Absolute URL for share links; omitted in admin preview. */
  shareUrl?: string
}

export function ArticleView({ post, rendered, settings, categories, cover, related, shareUrl }: Props) {
  const cat = categoryName(categories, post.category)
  const updated = post.updatedAt && post.updatedAt.slice(0, 10) !== post.publishedAt?.slice(0, 10) ? post.updatedAt : undefined
  const enc = shareUrl ? encodeURIComponent(shareUrl) : ''
  const encTitle = encodeURIComponent(post.title)
  return (
    <article>
      <div className="read-progress" aria-hidden="true" />
      <header className="page-band page-band--article">
        <div className="wrap">
          <div className="article-head">
          <nav className="breadcrumb" aria-label="Konum">
            <ol>
              <li>
                <Link href="/blog">Yazılar</Link>
              </li>
              {cat ? (
                <li>
                  <Link href={`/kategori/${post.category}`}>{cat}</Link>
                </li>
              ) : null}
            </ol>
          </nav>
          <h1 className="rise">{post.title}</h1>
          {post.excerpt ? <p className="lede rise rise-2">{post.excerpt}</p> : null}
          </div>
        </div>
      </header>

      <div className="wrap">
        <dl className="doc-control rise rise-3" aria-label="Yazı bilgileri">
          <div>
            <UserCircle size={26} weight="duotone" aria-hidden="true" />
            <dt>Yazar</dt>
            <dd>{settings.author.name}</dd>
          </div>
          <div>
            <CalendarBlank size={26} weight="duotone" aria-hidden="true" />
            <dt>Yayın tarihi</dt>
            <dd>{post.publishedAt ? <time dateTime={isoDay(post.publishedAt)}>{formatDate(post.publishedAt)}</time> : 'Yayımlanmadı'}</dd>
          </div>
          <div>
            <ArrowsClockwise size={26} weight="duotone" aria-hidden="true" />
            <dt>Son güncelleme</dt>
            <dd>{updated ? <time dateTime={isoDay(updated)}>{formatDate(updated)}</time> : 'Yok'}</dd>
          </div>
          <div>
            <Stack size={26} weight="duotone" aria-hidden="true" />
            <dt>Revizyon</dt>
            <dd>{post.revision}</dd>
          </div>
          <div>
            <CategoryIcon slug={post.category} size={26} />
            <dt>Kategori</dt>
            <dd>{cat ?? 'Genel'}</dd>
          </div>
          <div>
            <Clock size={26} weight="duotone" aria-hidden="true" />
            <dt>Okuma süresi</dt>
            <dd>{readingMinutes(rendered.words)} dk</dd>
          </div>
        </dl>
      {post.sample ? (
        <div className="notice notice--warn sample-notice" role="note">
          <p>
            <strong>Örnek içerik.</strong> Bu yazı sitenin görünümünü göstermek için hazırlanmıştır ve henüz yazarı tarafından
            gözden geçirilmemiştir. Mevzuatın güncel hâli için kaynakçadaki resmî metinlere başvurun.
          </p>
        </div>
      ) : null}

      {post.cover ? (
        <figure className="cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover.src} alt={post.cover.alt} width={cover?.width} height={cover?.height} fetchPriority="high" />
        </figure>
      ) : null}

      <div className="article-layout">
        {rendered.toc.length >= 2 ? (
          <aside>
            <nav className="toc" aria-labelledby="toc-title">
              <h2 id="toc-title">Bu yazıda</h2>
              <ol>
                {rendered.toc.map((t) => (
                  <li key={t.id} className={t.depth === 3 ? 'toc__sub' : undefined}>
                    <a href={`#${t.id}`}>{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        ) : null}
        <div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: rendered.html }} />

          {post.references.length > 0 ? (
            <section className="references" aria-labelledby="refs-title">
              <h2 id="refs-title">Kaynakça</h2>
              <ol>
                {post.references.map((r, i) => (
                  <li key={i}>
                    {r.url ? (
                      <a href={r.url} rel="noopener noreferrer nofollow" target="_blank">
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div className="article-foot">
            {post.tags.length > 0 ? (
              <section aria-labelledby="tags-title">
                <h2 id="tags-title">Etiketler</h2>
                <ul className="filter-links">
                  {post.tags.map((t) => (
                    <li key={t}>
                      <Link href={`/etiket/${slugify(t)}`}>
                        <Tag size={16} aria-hidden="true" />
                        {t}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {shareUrl ? (
              <section className="share" aria-labelledby="share-title">
                <h2 id="share-title">Paylaş</h2>
                <ul>
                  <li>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc}`} target="_blank" rel="noopener noreferrer">
                      <LinkedinLogo size={18} aria-hidden="true" />
                      LinkedIn
                    </a>
                  </li>
                  <li>
                    <a href={`https://x.com/intent/post?url=${enc}&text=${encTitle}`} target="_blank" rel="noopener noreferrer">
                      <XLogo size={18} aria-hidden="true" />
                      X
                    </a>
                  </li>
                  <li>
                    <a href={`https://wa.me/?text=${encTitle}%20${enc}`} target="_blank" rel="noopener noreferrer">
                      <WhatsappLogo size={18} aria-hidden="true" />
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:?subject=${encTitle}&body=${enc}`}>
                      <EnvelopeSimple size={18} aria-hidden="true" />
                      E-posta
                    </a>
                  </li>
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>

        {related.length > 0 ? (
          <section className="related" aria-labelledby="related-title">
            <div className="section__head">
              <h2 id="related-title">İlgili yazılar</h2>
            </div>
            <PostList posts={related} categories={categories} />
          </section>
        ) : null}
      </div>
    </article>
  )
}
