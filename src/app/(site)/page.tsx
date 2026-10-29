import Link from 'next/link'
import { getCategories, getPublishedPosts, getSettings } from '@/lib/content'
import { PostList, EmptyPosts } from '@/components/site/PostList'

export default function HomePage() {
  const s = getSettings()
  const posts = getPublishedPosts()
  const categories = getCategories()
  return (
    <div className="wrap">
      <section className="intro" aria-labelledby="intro-title">
        <div>
          <h1 id="intro-title">{s.author.name}</h1>
          {s.author.jobTitle ? <p className="intro__role">{s.author.jobTitle}</p> : null}
          {s.author.shortBio ? <p className="intro__bio">{s.author.shortBio}</p> : null}
          {s.author.bio ? <Link href="/hakkimda">Hakkımda daha fazlası</Link> : null}
        </div>
        {categories.length > 0 ? (
          <div className="topics">
            <h2>Konu alanları</h2>
            <dl>
              {categories.map((c) => (
                <div key={c.slug}>
                  <dt>
                    <Link href={`/kategori/${c.slug}`}>{c.name}</Link>
                  </dt>
                  {c.description ? <dd>{c.description}</dd> : null}
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      <section className="section" aria-labelledby="latest-title">
        <div className="section__head">
          <h2 id="latest-title">Son yazılar</h2>
          {posts.length > 5 ? <Link href="/blog">Tüm yazılar ({posts.length})</Link> : null}
        </div>
        {posts.length > 0 ? (
          <PostList posts={posts.slice(0, 5)} categories={categories} />
        ) : (
          <EmptyPosts title="İlk yazılar hazırlanıyor.">
            <p>Yayımlanan yazılar burada listelenecek.</p>
          </EmptyPosts>
        )}
      </section>

      <section className="contact-call" aria-labelledby="contact-title">
        <div>
          <h2 id="contact-title">İletişim</h2>
          <p>{s.contact.note || 'Bir yazıyla ilgili soru, düzeltme veya öneriniz varsa yazabilirsiniz.'}</p>
        </div>
        <Link className="button" href="/iletisim">
          İletişim bilgileri
        </Link>
      </section>
    </div>
  )
}
