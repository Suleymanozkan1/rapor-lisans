import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ComponentConfig, Config, Field, Fields, PuckContext, SlotComponent } from '@puckeditor/core'
import {
  BookOpenText,
  ChalkboardTeacher,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileText,
  Fire,
  FirstAid,
  HardHat,
  Info,
  InstagramLogo,
  Lightning,
  LinkedinLogo,
  MapPin,
  Phone,
  Scales,
  ShieldCheck,
  Siren,
  Warning,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react/ssr'
import { HeroSlider } from '@/components/site/HeroSlider'
import { HazardTicker } from '@/components/site/HazardTicker'
import { LeadStoriesView, PostListView, EmptyPosts } from '@/components/site/views/posts'
import { ProductListView } from '@/components/site/views/products'
import { IntroSlide, PostSlide, ProductSlide } from '@/components/site/views/hero'
import { SignMark } from '@/lib/visuals'
import { categoryName } from '@/lib/posts'
import { renderBlockMarkdown } from '@/lib/markdown'
import { lookupFrom, type SiteData } from './site-data'
import { isExternal, safeAnchor, safeHref, safeImage, videoEmbed } from './safe'
import { Tabs, VideoFacade } from './interactive'

/*
 * The page editor's block library (Puck config). Styling is limited to the
 * brand's palette, type scale and spacing so every page stays on-brand and
 * readable; colours are never free hex values.
 *
 * The same config renders pages on the server (static) and in the editor
 * (browser), so block renderers are plain components: interactive parts live
 * in ./interactive, and data-driven blocks read SiteData from `puck.metadata`.
 */

/* ---------- fields ---------- */

/** Field kinds the server validates specially (see src/lib/pages/validate.ts). */
export type FieldKind = 'link' | 'media' | 'markdown' | 'anchor' | 'video'

/** The media field differs: a thumbnail picker in the editor, a plain value on the server. */
export type FieldKit = { media: Field }
export const SERVER_KIT: FieldKit = { media: { type: 'text', metadata: { kind: 'media' } } }

const text = (label: string, kind?: FieldKind): Field => ({ type: 'text', label, ...(kind ? { metadata: { kind } } : {}) })
const area = (label: string, kind?: FieldKind): Field => ({ type: 'textarea', label, ...(kind ? { metadata: { kind } } : {}) })
const select = (label: string, options: [string, string][]): Field => ({ type: 'select', label, options: options.map(([value, l]) => ({ value, label: l })) })
const radio = (label: string, options: [string, string][]): Field => ({ type: 'radio', label, options: options.map(([value, l]) => ({ value, label: l })) })
const number = (label: string, min: number, max: number): Field => ({ type: 'number', label, min, max })

const SPACES: [string, string][] = [
  ['yok', 'Yok'],
  ['s', 'Küçük'],
  ['m', 'Orta'],
  ['l', 'Büyük'],
  ['xl', 'Çok büyük'],
]
const ALIGN: [string, string][] = [
  ['sol', 'Sola'],
  ['orta', 'Ortaya'],
  ['sag', 'Sağa'],
]
const TONES: [string, string][] = [
  ['metin', 'Metin rengi'],
  ['soluk', 'Soluk'],
  ['sari', 'Tehlike sarısı'],
  ['kirmizi', 'Baret kırmızısı'],
]
const BACKGROUNDS: [string, string][] = [
  ['yok', 'Yok (sayfa zemini)'],
  ['asfalt', 'Asfalt'],
  ['siyah', 'İşaret siyahı'],
  ['sari', 'Tehlike sarısı'],
  ['kirmizi', 'Baret kırmızısı'],
  ['serit', 'Tehlike şeridi kenarlı'],
  ['gorsel', 'Görsel (karartılmış)'],
]

export const ICONS = {
  uyari: Warning,
  baret: HardHat,
  onay: CheckCircle,
  kalkan: ShieldCheck,
  ilkyardim: FirstAid,
  yangin: Fire,
  elektrik: Lightning,
  kitap: BookOpenText,
  egitim: ChalkboardTeacher,
  mevzuat: Scales,
  acil: Siren,
  belge: FileText,
  telefon: Phone,
  eposta: EnvelopeSimple,
  konum: MapPin,
  saat: Clock,
  bilgi: Info,
} as const
const ICON_OPTIONS: [string, string][] = [
  ['uyari', 'Uyarı'],
  ['baret', 'Baret'],
  ['onay', 'Onay işareti'],
  ['kalkan', 'Kalkan'],
  ['ilkyardim', 'İlk yardım'],
  ['yangin', 'Yangın'],
  ['elektrik', 'Elektrik'],
  ['kitap', 'Kitap'],
  ['egitim', 'Eğitim'],
  ['mevzuat', 'Mevzuat'],
  ['acil', 'Acil durum'],
  ['belge', 'Belge'],
  ['telefon', 'Telefon'],
  ['eposta', 'E-posta'],
  ['konum', 'Konum'],
  ['saat', 'Saat'],
  ['bilgi', 'Bilgi'],
]
function Icon({ name, size = 24, weight = 'fill' }: { name: unknown; size?: number; weight?: 'fill' | 'duotone' | 'bold' }) {
  const I = ICONS[(typeof name === 'string' && name in ICONS ? name : 'onay') as keyof typeof ICONS]
  return <I size={size} weight={weight} aria-hidden="true" />
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)
const site = (puck: PuckContext) => puck.metadata as SiteData

/* ---------- "Gelişmiş" (advanced) options on every block ---------- */

type Adv = { gizle: string; ust: string; alt: string; animasyon: string; baglanti: string }
const ADV_DEFAULT: Adv = { gizle: 'yok', ust: 'yok', alt: 'm', animasyon: 'yok', baglanti: '' }
const advField: Field = {
  type: 'object',
  label: 'Gelişmiş',
  objectFields: {
    gizle: radio('Görünürlük', [
      ['yok', 'Her yerde'],
      ['telefon', 'Telefonda gizle'],
      ['masaustu', 'Masaüstünde gizle'],
    ]),
    ust: select('Üst boşluk', SPACES),
    alt: select('Alt boşluk', SPACES),
    animasyon: select('Giriş animasyonu', [
      ['yok', 'Yok'],
      ['belir', 'Belirerek'],
      ['yuksel', 'Aşağıdan yükselerek'],
    ]),
    baglanti: text('Bağlantı adı (#adres, sayfa içi bağlantılar için)', 'anchor'),
  },
}

type BlockDef<P> = {
  label: string
  fields: { [K in keyof P]: Field }
  defaultProps: P
  /** Full-width blocks (sections, slider, strips) are not narrowed to the page column. */
  bleed?: boolean
  render: (props: P & { puck: PuckContext; id: string }) => ReactNode
}

// Puck's config generics do not compose with a wrapper like this; block props are validated at runtime instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentConfig<any>

function block<P>(def: BlockDef<P>): AnyComponent {
  return {
    label: def.label,
    fields: { ...def.fields, _adv: advField } as Fields,
    defaultProps: { ...def.defaultProps, _adv: ADV_DEFAULT },
    render: (props: Record<string, unknown>) => {
      const a = { ...ADV_DEFAULT, ...((props as { _adv?: Partial<Adv> })._adv ?? {}) }
      return (
        <div
          id={safeAnchor(a.baglanti)}
          className={cx(
            'bk',
            def.bleed && 'bk--bleed',
            a.gizle !== 'yok' && `bk--gizle-${pick(a.gizle, ['telefon', 'masaustu'], 'telefon')}`,
            `bk--ust-${pick(a.ust, ['yok', 's', 'm', 'l', 'xl'], 'yok')}`,
            `bk--alt-${pick(a.alt, ['yok', 's', 'm', 'l', 'xl'], 'm')}`,
            a.animasyon !== 'yok' && `bk--anim-${pick(a.animasyon, ['belir', 'yuksel'], 'belir')}`,
          )}
        >
          {def.render(props as unknown as P & { puck: PuckContext; id: string })}
        </div>
      )
    },
  }
}

function ButtonLink({ label, href, style = 'birincil' }: { label: string; href: unknown; style?: string }) {
  const h = safeHref(href)
  if (!label) return null
  const cls = cx('button', style === 'cizgili' && 'button--quiet', style === 'siyah' && 'button--black')
  if (!h) return <span className={cls}>{label}</span>
  if (isExternal(h) || h.startsWith('mailto:') || h.startsWith('tel:')) {
    return (
      <a className={cls} href={h} {...(isExternal(h) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
        {label}
      </a>
    )
  }
  return (
    <Link className={cls} href={h}>
      {label}
    </Link>
  )
}

function Markdown({ source, className }: { source: string; className?: string }) {
  if (!source.trim()) return null
  return <div className={cx('prose', className)} dangerouslySetInnerHTML={{ __html: renderBlockMarkdown(source) }} />
}

/* ---------- the config ---------- */

type Slot = SlotComponent

export function buildConfig(kit: FieldKit = SERVER_KIT): Config {
  const media = (label: string): Field => ({ ...kit.media, label })

  const components = {
    /* Layout */
    Bolum: block<{ arkaplan: string; gorsel: string; ic: string; genislik: string; hiza: string; icerik: Slot | unknown[] }>({
      label: 'Bölüm',
      bleed: true,
      fields: {
        arkaplan: select('Arka plan', BACKGROUNDS),
        gorsel: media('Arka plan görseli (Görsel seçeneği için)'),
        ic: select('İç boşluk', SPACES),
        genislik: radio('İçerik genişliği', [
          ['dar', 'Dar (okuma)'],
          ['normal', 'Normal'],
          ['tam', 'Tam genişlik'],
        ]),
        hiza: radio('Metin hizası', ALIGN),
        icerik: { type: 'slot', label: 'İçerik' },
      },
      defaultProps: { arkaplan: 'asfalt', gorsel: '', ic: 'l', genislik: 'normal', hiza: 'sol', icerik: [] },
      render: ({ arkaplan, gorsel, ic, genislik, hiza, icerik }) => {
        const Content = icerik as Slot
        const img = arkaplan === 'gorsel' ? safeImage(gorsel) : undefined
        return (
          <section
            className={cx(
              'bk-section',
              `bk-section--${pick(arkaplan, ['yok', 'asfalt', 'siyah', 'sari', 'kirmizi', 'serit', 'gorsel'], 'yok')}`,
              `bk-pad-${pick(ic, ['yok', 's', 'm', 'l', 'xl'], 'l')}`,
              `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'sol')}`,
            )}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="bk-section__bg" src={img} alt="" loading="lazy" decoding="async" />
            ) : null}
            <Content className={cx('bk-section__inner', genislik === 'tam' ? 'bk-w-tam' : genislik === 'dar' ? 'bk-w-dar' : 'wrap')} />
          </section>
        )
      },
    }),

    Sutunlar: block<{ duzen: string; aralik: string; dikey: string; telefon: string; s1: Slot | unknown[]; s2: Slot | unknown[]; s3: Slot | unknown[]; s4: Slot | unknown[] }>({
      label: 'Sütunlar',
      fields: {
        duzen: select('Düzen', [
          ['1-1', 'İki eşit sütun'],
          ['2-1', 'Geniş + dar'],
          ['1-2', 'Dar + geniş'],
          ['1-1-1', 'Üç sütun'],
          ['1-1-1-1', 'Dört sütun'],
        ]),
        aralik: select('Sütun arası', SPACES.slice(1)),
        dikey: radio('Dikey hiza', [
          ['ust', 'Üst'],
          ['orta', 'Orta'],
          ['alt', 'Alt'],
        ]),
        telefon: radio('Telefonda', [
          ['alt-alta', 'Alt alta'],
          ['ters', 'Alt alta (ters sıra)'],
        ]),
        s1: { type: 'slot', label: '1. sütun' },
        s2: { type: 'slot', label: '2. sütun' },
        s3: { type: 'slot', label: '3. sütun' },
        s4: { type: 'slot', label: '4. sütun' },
      },
      defaultProps: { duzen: '1-1', aralik: 'l', dikey: 'ust', telefon: 'alt-alta', s1: [], s2: [], s3: [], s4: [] },
      render: ({ duzen, aralik, dikey, telefon, s1, s2, s3, s4 }) => {
        const layout = pick(duzen, ['1-1', '2-1', '1-2', '1-1-1', '1-1-1-1'], '1-1')
        const n = layout.split('-').length
        const cols = [s1, s2, s3, s4].slice(0, n) as Slot[]
        return (
          <div className={cx('bk-cols', `bk-cols--${layout}`, `bk-gap-${pick(aralik, ['s', 'm', 'l', 'xl'], 'l')}`, `bk-cols--${pick(dikey, ['ust', 'orta', 'alt'], 'ust')}`, telefon === 'ters' && 'bk-cols--ters')}>
            {cols.map((Col, i) => (
              <Col key={i} className="bk-col" />
            ))}
          </div>
        )
      },
    }),

    Bosluk: block<{ boyut: string }>({
      label: 'Boşluk',
      fields: { boyut: select('Yükseklik', SPACES.slice(1)) },
      defaultProps: { boyut: 'm' },
      render: ({ boyut }) => <div className={`bk-spacer bk-spacer--${pick(boyut, ['s', 'm', 'l', 'xl'], 'm')}`} aria-hidden="true" />,
    }),

    Ayirici: block<{ stil: string }>({
      label: 'Ayırıcı',
      fields: {
        stil: radio('Görünüm', [
          ['cizgi', 'İnce çizgi'],
          ['serit', 'Tehlike şeridi'],
          ['kalin', 'Kalın sarı çizgi'],
        ]),
      },
      defaultProps: { stil: 'cizgi' },
      render: ({ stil }) => <hr className={`bk-rule bk-rule--${pick(stil, ['cizgi', 'serit', 'kalin'], 'cizgi')}`} />,
    }),

    /* Basic */
    Baslik: block<{ metin: string; seviye: string; boyut: string; hiza: string; renk: string; vurgu: string; ust: string }>({
      label: 'Başlık',
      fields: {
        ust: text('Üst etiket (küçük, isteğe bağlı)'),
        metin: text('Başlık'),
        seviye: select('Başlık düzeyi (sayfa yapısı)', [
          ['h1', 'H1 (sayfada bir tane)'],
          ['h2', 'H2'],
          ['h3', 'H3'],
          ['h4', 'H4'],
        ]),
        boyut: select('Boyut', [
          ['dev', 'Dev (vitrin)'],
          ['buyuk', 'Büyük'],
          ['orta', 'Orta'],
          ['kucuk', 'Küçük'],
        ]),
        hiza: radio('Hiza', ALIGN),
        renk: select('Renk', TONES),
        vurgu: radio('Vurgu', [
          ['yok', 'Yok'],
          ['cizgi', 'Altında sarı çizgi'],
          ['isaret', 'Uyarı üçgeni'],
        ]),
      },
      defaultProps: { ust: '', metin: 'Başlık', seviye: 'h2', boyut: 'orta', hiza: 'sol', renk: 'metin', vurgu: 'yok' },
      render: ({ ust, metin, seviye, boyut, hiza, renk, vurgu }) => {
        const H = pick(seviye, ['h1', 'h2', 'h3', 'h4'], 'h2')
        return (
          <div className={cx('bk-heading', `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'sol')}`, `bk-tone-${pick(renk, ['metin', 'soluk', 'sari', 'kirmizi'], 'metin')}`)}>
            {ust ? <p className="bk-eyebrow">{ust}</p> : null}
            <H className={cx(`bk-h--${pick(boyut, ['dev', 'buyuk', 'orta', 'kucuk'], 'orta')}`, vurgu === 'cizgi' && 'bk-h--bar')}>
              {vurgu === 'isaret' ? <SignMark size="lg" /> : null}
              {metin}
            </H>
          </div>
        )
      },
    }),

    Metin: block<{ icerik: string; boyut: string; hiza: string; genislik: string }>({
      label: 'Metin',
      fields: {
        icerik: area('Metin (Markdown: **kalın**, *italik*, [bağlantı](/blog), - liste, | tablo |)', 'markdown'),
        boyut: radio('Yazı boyutu', [
          ['normal', 'Normal'],
          ['giris', 'Giriş (büyük)'],
          ['kucuk', 'Küçük'],
        ]),
        hiza: radio('Hiza', ALIGN),
        genislik: radio('Satır genişliği', [
          ['okuma', 'Okuma genişliği'],
          ['tam', 'Tam'],
        ]),
      },
      defaultProps: { icerik: 'Metninizi buraya yazın. **Kalın**, *italik* ve [bağlantı](/blog) kullanabilirsiniz.', boyut: 'normal', hiza: 'sol', genislik: 'okuma' },
      render: ({ icerik, boyut, hiza, genislik }) => (
        <Markdown
          source={str(icerik)}
          className={cx('bk-text', `bk-text--${pick(boyut, ['normal', 'giris', 'kucuk'], 'normal')}`, `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'sol')}`, genislik === 'tam' && 'bk-text--tam')}
        />
      ),
    }),

    Gorsel: block<{ gorsel: string; alt: string; aciklama: string; baglanti: string; oran: string; genislik: string; hiza: string }>({
      label: 'Görsel',
      fields: {
        gorsel: media('Görsel'),
        alt: text('Alternatif metin (görme engelliler için; boşsa kütüphanedeki kullanılır)'),
        aciklama: text('Görsel altı yazısı'),
        baglanti: text('Tıklayınca gidilecek adres (isteğe bağlı)', 'link'),
        oran: select('Kırpma oranı', [
          ['ozgun', 'Özgün'],
          ['16-9', '16:9'],
          ['4-3', '4:3'],
          ['1-1', 'Kare'],
          ['4-5', 'Dikey 4:5'],
        ]),
        genislik: radio('Genişlik', [
          ['tam', 'Tam'],
          ['orta', 'Orta'],
          ['kucuk', 'Küçük'],
        ]),
        hiza: radio('Hiza', ALIGN),
      },
      defaultProps: { gorsel: '', alt: '', aciklama: '', baglanti: '', oran: 'ozgun', genislik: 'tam', hiza: 'orta' },
      render: ({ gorsel, alt, aciklama, baglanti, oran, genislik, hiza, puck }) => {
        const src = safeImage(gorsel)
        if (!src) return <div className="bk-placeholder">Görsel seçilmedi</div>
        const m = site(puck)?.media?.find((x) => x.src === src)
        const img = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={str(alt) || m?.alt || ''} width={m?.width} height={m?.height} loading="lazy" decoding="async" />
        )
        const href = safeHref(baglanti)
        return (
          <figure className={cx('bk-image', `bk-ratio-${pick(oran, ['ozgun', '16-9', '4-3', '1-1', '4-5'], 'ozgun')}`, `bk-image--${pick(genislik, ['tam', 'orta', 'kucuk'], 'tam')}`, `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'orta')}`)}>
            {href ? (
              <a href={href} {...(isExternal(href) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
                {img}
              </a>
            ) : (
              img
            )}
            {aciklama ? <figcaption>{aciklama}</figcaption> : null}
          </figure>
        )
      },
    }),

    Dugmeler: block<{ dugmeler: { etiket: string; adres: string; stil: string }[]; hiza: string }>({
      label: 'Düğmeler',
      fields: {
        dugmeler: {
          type: 'array',
          label: 'Düğmeler',
          max: 4,
          getItemSummary: (i: { etiket?: string }) => i.etiket || 'Düğme',
          arrayFields: {
            etiket: text('Yazı'),
            adres: text('Adres (/blog, https://…, mailto:…)', 'link'),
            stil: select('Görünüm', [
              ['birincil', 'Sarı (ana eylem)'],
              ['cizgili', 'Çerçeveli'],
              ['siyah', 'Siyah (sarı zeminde)'],
            ]),
          },
          defaultItemProps: { etiket: 'Düğme', adres: '/', stil: 'birincil' },
        },
        hiza: radio('Hiza', ALIGN),
      },
      defaultProps: { dugmeler: [{ etiket: 'Yazıları oku', adres: '/blog', stil: 'birincil' }], hiza: 'sol' },
      render: ({ dugmeler, hiza }) => (
        <div className={cx('bk-buttons', `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'sol')}`)}>
          {(Array.isArray(dugmeler) ? dugmeler : []).map((d, i) => (
            <ButtonLink key={i} label={str(d.etiket)} href={d.adres} style={str(d.stil)} />
          ))}
        </div>
      ),
    }),

    IkonListesi: block<{ maddeler: { ikon: string; metin: string }[]; duzen: string }>({
      label: 'İkon listesi',
      fields: {
        maddeler: {
          type: 'array',
          label: 'Maddeler',
          max: 20,
          getItemSummary: (i: { metin?: string }) => i.metin || 'Madde',
          arrayFields: { ikon: select('İkon', ICON_OPTIONS), metin: text('Metin') },
          defaultItemProps: { ikon: 'onay', metin: 'Yeni madde' },
        },
        duzen: radio('Düzen', [
          ['dikey', 'Alt alta'],
          ['yatay', 'Yan yana'],
        ]),
      },
      defaultProps: {
        maddeler: [
          { ikon: 'onay', metin: 'Birinci madde' },
          { ikon: 'onay', metin: 'İkinci madde' },
        ],
        duzen: 'dikey',
      },
      render: ({ maddeler, duzen }) => (
        <ul className={cx('bk-iconlist', duzen === 'yatay' && 'bk-iconlist--yatay')}>
          {(Array.isArray(maddeler) ? maddeler : []).map((m, i) => (
            <li key={i}>
              <Icon name={m.ikon} />
              <span>{str(m.metin)}</span>
            </li>
          ))}
        </ul>
      ),
    }),

    UyariKutusu: block<{ tur: string; baslik: string; metin: string }>({
      label: 'Uyarı kutusu',
      fields: {
        tur: radio('Tür', [
          ['bilgi', 'Bilgi'],
          ['uyari', 'Uyarı (sarı)'],
          ['tehlike', 'Tehlike (kırmızı)'],
          ['olumlu', 'Olumlu (yeşil)'],
        ]),
        baslik: text('Başlık'),
        metin: area('Metin (Markdown)', 'markdown'),
      },
      defaultProps: { tur: 'uyari', baslik: 'Dikkat', metin: 'Önemli bir uyarıyı buraya yazın.' },
      render: ({ tur, baslik, metin }) => {
        const t = pick(tur, ['bilgi', 'uyari', 'tehlike', 'olumlu'], 'uyari')
        const icon = { bilgi: 'bilgi', uyari: 'uyari', tehlike: 'acil', olumlu: 'onay' }[t]
        return (
          <aside className={`bk-callout bk-callout--${t}`} role="note">
            <Icon name={icon} size={30} />
            <div>
              {baslik ? <p className="bk-callout__title">{baslik}</p> : null}
              <Markdown source={str(metin)} className="bk-callout__body" />
            </div>
          </aside>
        )
      },
    }),

    Kartlar: block<{ kartlar: { ikon: string; baslik: string; metin: string; baglanti: string; etiket: string }[]; sutun: string; stil: string }>({
      label: 'Kartlar',
      fields: {
        kartlar: {
          type: 'array',
          label: 'Kartlar',
          max: 12,
          getItemSummary: (i: { baslik?: string }) => i.baslik || 'Kart',
          arrayFields: {
            ikon: select('İkon', [['yok', 'İkon yok'], ['isaret', 'Uyarı üçgeni'], ...ICON_OPTIONS]),
            baslik: text('Başlık'),
            metin: area('Metin'),
            baglanti: text('Bağlantı (isteğe bağlı)', 'link'),
            etiket: text('Bağlantı yazısı'),
          },
          defaultItemProps: { ikon: 'baret', baslik: 'Kart başlığı', metin: 'Kısa açıklama.', baglanti: '', etiket: 'Devamı' },
        },
        sutun: radio('Sütun', [
          ['2', '2'],
          ['3', '3'],
          ['4', '4'],
        ]),
        stil: radio('Görünüm', [
          ['kutu', 'Kutu'],
          ['cizgi', 'Üstte sarı çizgi'],
        ]),
      },
      defaultProps: {
        kartlar: [
          { ikon: 'uyari', baslik: 'Risk değerlendirmesi', metin: 'Tehlikeleri tanımlayın, riskleri önceliklendirin.', baglanti: '/kategori/risk-degerlendirmesi', etiket: 'Yazılar' },
          { ikon: 'kitap', baslik: 'Mevzuat', metin: 'Yönetmelikleri sade bir dille özetliyoruz.', baglanti: '/kategori/mevzuat', etiket: 'Yazılar' },
          { ikon: 'baret', baslik: 'Saha', metin: 'Kontrol listeleri ve uygulama notları.', baglanti: '/magaza', etiket: 'Mağaza' },
        ],
        sutun: '3',
        stil: 'kutu',
      },
      render: ({ kartlar, sutun, stil }) => (
        <ul className={cx('bk-cards', `bk-cards--${pick(sutun, ['2', '3', '4'], '3')}`, stil === 'cizgi' && 'bk-cards--cizgi')}>
          {(Array.isArray(kartlar) ? kartlar : []).map((k, i) => {
            const href = safeHref(k.baglanti)
            return (
              <li key={i} className="bk-card">
                {k.ikon === 'isaret' ? <SignMark size="lg" /> : k.ikon && k.ikon !== 'yok' ? <Icon name={k.ikon} size={34} weight="duotone" /> : null}
                {k.baslik ? <h3>{k.baslik}</h3> : null}
                {k.metin ? <p>{k.metin}</p> : null}
                {href ? (
                  <a className="bk-card__link" href={href} {...(isExternal(href) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
                    {str(k.etiket) || 'Devamı'}
                  </a>
                ) : null}
              </li>
            )
          })}
        </ul>
      ),
    }),

    SSS: block<{ sorular: { soru: string; cevap: string }[]; ilkAcik: string }>({
      label: 'Sık sorulanlar (akordeon)',
      fields: {
        sorular: {
          type: 'array',
          label: 'Sorular',
          max: 30,
          getItemSummary: (i: { soru?: string }) => i.soru || 'Soru',
          arrayFields: { soru: text('Soru'), cevap: area('Cevap (Markdown)', 'markdown') },
          defaultItemProps: { soru: 'Yeni soru', cevap: 'Cevap.' },
        },
        ilkAcik: radio('İlk soru', [
          ['kapali', 'Kapalı'],
          ['acik', 'Açık'],
        ]),
      },
      defaultProps: { sorular: [{ soru: 'Örnek soru?', cevap: 'Örnek cevap.' }], ilkAcik: 'kapali' },
      render: ({ sorular, ilkAcik }) => (
        <div className="bk-faq">
          {(Array.isArray(sorular) ? sorular : []).map((q, i) => (
            <details key={i} open={i === 0 && ilkAcik === 'acik'}>
              <summary>{str(q.soru)}</summary>
              <Markdown source={str(q.cevap)} />
            </details>
          ))}
        </div>
      ),
    }),

    Sekmeler: block<{ sekmeler: { baslik: string; metin: string }[] }>({
      label: 'Sekmeler',
      fields: {
        sekmeler: {
          type: 'array',
          label: 'Sekmeler',
          max: 8,
          getItemSummary: (i: { baslik?: string }) => i.baslik || 'Sekme',
          arrayFields: { baslik: text('Sekme adı'), metin: area('İçerik (Markdown)', 'markdown') },
          defaultItemProps: { baslik: 'Sekme', metin: 'İçerik.' },
        },
      },
      defaultProps: {
        sekmeler: [
          { baslik: 'Birinci', metin: 'Birinci sekmenin içeriği.' },
          { baslik: 'İkinci', metin: 'İkinci sekmenin içeriği.' },
        ],
      },
      render: ({ sekmeler }) => {
        const list = Array.isArray(sekmeler) ? sekmeler : []
        return <Tabs labels={list.map((s) => str(s.baslik) || 'Sekme')} panels={list.map((s, i) => <Markdown key={i} source={str(s.metin)} />)} />
      },
    }),

    Alinti: block<{ metin: string; kaynak: string }>({
      label: 'Alıntı',
      fields: { metin: area('Alıntı'), kaynak: text('Kaynak / kişi') },
      defaultProps: { metin: 'Güvenlik bir öncelik değil, bir değerdir.', kaynak: '' },
      render: ({ metin, kaynak }) => (
        <figure className="bk-quote">
          <blockquote>
            <p>{metin}</p>
          </blockquote>
          {kaynak ? <figcaption>{kaynak}</figcaption> : null}
        </figure>
      ),
    }),

    Video: block<{ adres: string; baslik: string }>({
      label: 'Video (YouTube / Vimeo)',
      fields: { adres: text('Video bağlantısı (YouTube veya Vimeo)', 'video'), baslik: text('Video başlığı') },
      defaultProps: { adres: '', baslik: 'Video' },
      render: ({ adres, baslik }) => {
        const v = videoEmbed(adres)
        if (!v) return <div className="bk-placeholder">YouTube veya Vimeo bağlantısı girin</div>
        return (
          <div className="bk-video">
            <VideoFacade src={v.src} title={str(baslik) || 'Video'} provider={v.provider} />
          </div>
        )
      },
    }),

    Galeri: block<{ gorseller: { gorsel: string; alt: string }[]; sutun: string; oran: string }>({
      label: 'Galeri',
      fields: {
        gorseller: {
          type: 'array',
          label: 'Görseller',
          max: 24,
          getItemSummary: (i: { gorsel?: string }) => (i.gorsel ? i.gorsel.split('/').pop()! : 'Görsel'),
          arrayFields: { gorsel: media('Görsel'), alt: text('Alternatif metin') },
          defaultItemProps: { gorsel: '', alt: '' },
        },
        sutun: radio('Sütun', [
          ['2', '2'],
          ['3', '3'],
          ['4', '4'],
        ]),
        oran: select('Kırpma oranı', [
          ['1-1', 'Kare'],
          ['4-3', '4:3'],
          ['16-9', '16:9'],
          ['4-5', 'Dikey 4:5'],
        ]),
      },
      defaultProps: { gorseller: [], sutun: '3', oran: '4-3' },
      render: ({ gorseller, sutun, oran, puck }) => {
        const list = (Array.isArray(gorseller) ? gorseller : []).filter((g) => safeImage(g.gorsel))
        if (!list.length) return <div className="bk-placeholder">Galeriye görsel ekleyin</div>
        return (
          <ul className={cx('bk-gallery', `bk-gallery--${pick(sutun, ['2', '3', '4'], '3')}`, `bk-ratio-${pick(oran, ['1-1', '4-3', '16-9', '4-5'], '4-3')}`)}>
            {list.map((g, i) => {
              const m = site(puck)?.media?.find((x) => x.src === g.gorsel)
              return (
                <li key={i}>
                  <a href={g.gorsel}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.gorsel} alt={str(g.alt) || m?.alt || ''} width={m?.width} height={m?.height} loading="lazy" decoding="async" />
                  </a>
                </li>
              )
            })}
          </ul>
        )
      },
    }),

    Sayilar: block<{ sayilar: { deger: string; etiket: string }[] }>({
      label: 'Sayılar',
      fields: {
        sayilar: {
          type: 'array',
          label: 'Sayılar (yalnızca doğrulanabilir gerçek veriler)',
          max: 6,
          getItemSummary: (i: { deger?: string; etiket?: string }) => `${i.deger ?? ''} ${i.etiket ?? ''}`.trim() || 'Sayı',
          arrayFields: { deger: text('Değer (ör. 120+)'), etiket: text('Açıklama') },
          defaultItemProps: { deger: '0', etiket: 'Açıklama' },
        },
      },
      defaultProps: { sayilar: [{ deger: '6331', etiket: 'İş Sağlığı ve Güvenliği Kanunu' }] },
      render: ({ sayilar }) => (
        <dl className="bk-stats">
          {(Array.isArray(sayilar) ? sayilar : []).map((s, i) => (
            <div key={i}>
              <dt>{str(s.etiket)}</dt>
              <dd>{str(s.deger)}</dd>
            </div>
          ))}
        </dl>
      ),
    }),

    IlerlemeCubuklari: block<{ cubuklar: { etiket: string; yuzde: number }[] }>({
      label: 'İlerleme çubukları',
      fields: {
        cubuklar: {
          type: 'array',
          label: 'Çubuklar',
          max: 10,
          getItemSummary: (i: { etiket?: string; yuzde?: number }) => `${i.etiket ?? ''} %${i.yuzde ?? 0}`,
          arrayFields: { etiket: text('Etiket'), yuzde: number('Yüzde', 0, 100) },
          defaultItemProps: { etiket: 'Etiket', yuzde: 50 },
        },
      },
      defaultProps: { cubuklar: [{ etiket: 'Tamamlanan eğitimler', yuzde: 60 }] },
      render: ({ cubuklar }) => (
        <ul className="bk-progress">
          {(Array.isArray(cubuklar) ? cubuklar : []).map((c, i) => {
            const v = Math.max(0, Math.min(100, Math.round(Number(c.yuzde) || 0)))
            return (
              <li key={i}>
                <span className="bk-progress__label">
                  {str(c.etiket)} <strong>%{v}</strong>
                </span>
                <span className="bk-progress__track" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={str(c.etiket)}>
                  <span className="bk-progress__bar" style={{ inlineSize: `${v}%` }} />
                </span>
              </li>
            )
          })}
        </ul>
      ),
    }),

    SosyalBaglantilar: block<{ hiza: string }>({
      label: 'Sosyal bağlantılar',
      fields: { hiza: radio('Hiza', ALIGN) },
      defaultProps: { hiza: 'sol' },
      render: ({ hiza, puck }) => {
        const s = site(puck)?.settings
        const items = s
          ? ([
              [s.social.instagram, InstagramLogo, 'Instagram'],
              [s.social.linkedin, LinkedinLogo, 'LinkedIn'],
              [s.social.x, XLogo, 'X'],
              [s.social.youtube, YoutubeLogo, 'YouTube'],
            ] as const).filter(([u]) => safeHref(u))
          : []
        if (!items.length) return <div className="bk-placeholder">Ayarlarda sosyal medya adresi yok</div>
        return (
          <ul className={cx('bk-social', `bk-align-${pick(hiza, ['sol', 'orta', 'sag'], 'sol')}`)}>
            {items.map(([u, I, label]) => (
              <li key={label}>
                <a href={safeHref(u)} rel="me noopener noreferrer" target="_blank" aria-label={label}>
                  <I size={26} weight="fill" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )
      },
    }),

    /* Site blocks */
    SayfaBasligi: block<{ baslik: string; altyazi: string }>({
      label: 'Sayfa başlığı (bant)',
      bleed: true,
      fields: { baslik: text('Başlık (H1)'), altyazi: area('Alt yazı') },
      defaultProps: { baslik: 'Sayfa başlığı', altyazi: '' },
      render: ({ baslik, altyazi }) => (
        <header className="page-band">
          <div className="wrap">
            <h1>{baslik}</h1>
            {altyazi ? <p>{altyazi}</p> : null}
          </div>
        </header>
      ),
    }),

    Slider: block<{ tanitim: string; baslik: string; metin: string; gorsel: string; gorselAlt: string; d1: string; d1Adres: string; d2: string; d2Adres: string; yaziSayisi: number; urunSayisi: number }>({
      label: 'Vitrin slaytı',
      bleed: true,
      fields: {
        tanitim: radio('Tanıtım slaytı', [
          ['var', 'Göster'],
          ['yok', 'Gösterme'],
        ]),
        baslik: text('Tanıtım başlığı (boşsa site adı)'),
        metin: area('Tanıtım metni (boşsa ayarlardaki amaç satırları)'),
        gorsel: media('Tanıtım görseli (boşsa portre veya baret fotoğrafı)'),
        gorselAlt: text('Görselin alternatif metni'),
        d1: text('1. düğme yazısı'),
        d1Adres: text('1. düğme adresi', 'link'),
        d2: text('2. düğme yazısı'),
        d2Adres: text('2. düğme adresi', 'link'),
        yaziSayisi: number('Son yazılardan kaç slayt', 0, 5),
        urunSayisi: number('Ürünlerden kaç slayt', 0, 5),
      },
      defaultProps: { tanitim: 'var', baslik: '', metin: '', gorsel: '', gorselAlt: '', d1: '', d1Adres: '', d2: '', d2Adres: '', yaziSayisi: 3, urunSayisi: 3 },
      render: (p) => {
        const d = site(p.puck)
        if (!d) return null
        const lookup = lookupFrom(d)
        const nPosts = Math.max(0, Math.min(5, Number(p.yaziSayisi) || 0))
        const nProducts = Math.max(0, Math.min(5, Number(p.urunSayisi) || 0))
        const link = (label: string, href: string) => (label && safeHref(href) ? { label, href: safeHref(href)! } : undefined)
        const intro = {
          key: 'tanitim',
          kind: 'Tanıtım',
          label: str(p.baslik) || d.settings.siteName,
          content: (
            <IntroSlide
              settings={d.settings}
              hasProducts={d.products.length > 0}
              lookup={lookup}
              options={{ title: str(p.baslik), text: str(p.metin), image: safeImage(p.gorsel), imageAlt: str(p.gorselAlt), primary: link(p.d1, p.d1Adres), secondary: link(p.d2, p.d2Adres) }}
            />
          ),
        }
        const postSlides = d.posts.slice(0, nPosts).map((x) => ({ key: `yazi-${x.slug}`, kind: 'Gündem', label: x.title, content: <PostSlide post={x} category={categoryName(d.categories, x.category)} lookup={lookup} /> }))
        const productSlides = d.products.slice(0, nProducts).map((x) => ({ key: `urun-${x.slug}`, kind: 'Mağaza', label: x.title, content: <ProductSlide product={x} lookup={lookup} /> }))
        const slides = p.tanitim === 'yok' ? [] : [intro]
        for (let i = 0; i < Math.max(postSlides.length, productSlides.length); i++) {
          if (postSlides[i]) slides.push(postSlides[i])
          if (productSlides[i]) slides.push(productSlides[i])
        }
        if (!slides.length) return <div className="bk-placeholder">Slayt yok</div>
        return <HeroSlider slides={slides} />
      },
    }),

    KayanSerit: block<{ sayi: number }>({
      label: 'Kayan şerit (son yazılar)',
      bleed: true,
      fields: { sayi: number('Yazı sayısı', 2, 12) },
      defaultProps: { sayi: 8 },
      render: ({ sayi, puck }) => {
        const d = site(puck)
        const items = (d?.posts ?? []).slice(0, Math.max(2, Math.min(12, Number(sayi) || 8))).map((x) => ({ href: `/blog/${x.slug}`, label: x.title }))
        return items.length ? <HazardTicker items={items} /> : <div className="bk-placeholder">Yayında yazı yok</div>
      },
    }),

    SonYazilar: block<{ baslik: string; tumu: string; sayi: number; kategori: string; duzen: string }>({
      label: 'Son yazılar',
      bleed: true,
      fields: {
        baslik: text('Başlık'),
        tumu: text('“Tümü” bağlantı yazısı (boşsa gizli)'),
        sayi: number('Yazı sayısı', 1, 12),
        kategori: text('Yalnızca bu kategori (kategori adresi, ör. mevzuat; boşsa hepsi)'),
        duzen: radio('Düzen', [
          ['manset', 'Manşet + başlıklar'],
          ['liste', 'Liste'],
        ]),
      },
      defaultProps: { baslik: 'Gündem', tumu: 'Tüm yazılar', sayi: 6, kategori: '', duzen: 'manset' },
      render: ({ baslik, tumu, sayi, kategori, duzen, puck, id }) => {
        const d = site(puck)
        if (!d) return null
        const lookup = lookupFrom(d)
        const all = kategori ? d.posts.filter((x) => x.category === kategori) : d.posts
        const posts = all.slice(0, Math.max(1, Math.min(12, Number(sayi) || 6)))
        const hid = `h-${id}`
        return (
          <section className="wrap section" aria-labelledby={baslik ? hid : undefined}>
            {baslik || tumu ? (
              <div className="section__head">
                {baslik ? <h2 id={hid}>{baslik}</h2> : <span />}
                {tumu ? (
                  <Link className="section__more" href={kategori ? `/kategori/${kategori}` : '/blog'}>
                    {tumu}
                    {all.length ? ` (${all.length})` : ''}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {posts.length === 0 ? (
              <EmptyPosts title="İlk yazılar hazırlanıyor.">
                <p>Yayımlanan yazılar burada listelenecek.</p>
              </EmptyPosts>
            ) : duzen === 'liste' ? (
              <PostListView posts={posts} categories={d.categories} lookup={lookup} />
            ) : (
              <LeadStoriesView posts={posts} categories={d.categories} lookup={lookup} />
            )}
          </section>
        )
      },
    }),

    Urunler: block<{ baslik: string; tumu: string; sayi: number; duzen: string }>({
      label: 'Ürünler (doküman rafı)',
      bleed: true,
      fields: {
        baslik: text('Başlık'),
        tumu: text('“Mağaza” bağlantı yazısı (boşsa gizli)'),
        sayi: number('Ürün sayısı', 1, 12),
        duzen: radio('Düzen', [
          ['yelpaze', 'Yelpaze (kaydırınca açılır)'],
          ['izgara', 'Izgara'],
        ]),
      },
      defaultProps: { baslik: 'Doküman rafı', tumu: 'Mağazaya git', sayi: 3, duzen: 'yelpaze' },
      render: ({ baslik, tumu, sayi, duzen, puck, id }) => {
        const d = site(puck)
        if (!d) return null
        const products = d.products.slice(0, Math.max(1, Math.min(12, Number(sayi) || 3)))
        if (!products.length) return null
        const hid = `h-${id}`
        return (
          <section className="wrap section" aria-labelledby={baslik ? hid : undefined}>
            {baslik || tumu ? (
              <div className="section__head">
                {baslik ? <h2 id={hid}>{baslik}</h2> : <span />}
                {tumu ? (
                  <Link className="section__more" href="/magaza">
                    {tumu}
                  </Link>
                ) : null}
              </div>
            ) : null}
            <ProductListView products={products} headingLevel={3} fan={duzen === 'yelpaze'} lookup={lookupFrom(d)} />
          </section>
        )
      },
    }),

    KonuDizini: block<{ baslik: string }>({
      label: 'Konu dizini (kategoriler)',
      bleed: true,
      fields: { baslik: text('Başlık') },
      defaultProps: { baslik: 'Konu dizini' },
      render: ({ baslik, puck, id }) => {
        const d = site(puck)
        if (!d?.categories.length) return null
        const hid = `h-${id}`
        return (
          <section className="wrap section" aria-labelledby={baslik ? hid : undefined}>
            {baslik ? (
              <div className="section__head">
                <h2 id={hid}>{baslik}</h2>
              </div>
            ) : null}
            <ol className="topic-index">
              {d.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/kategori/${c.slug}`} className="topic-row">
                    <SignMark slug={c.slug} size="lg" />
                    <span className="topic-row__name">{c.name}</span>
                    {c.description ? <span className="topic-row__desc">{c.description}</span> : null}
                    <span className="topic-row__count">{d.counts[c.slug] ? `${d.counts[c.slug]} yazı` : 'Yakında'}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )
      },
    }),

    IletisimSeridi: block<{ baslik: string; metin: string; dugme: string }>({
      label: 'İletişim şeridi (sarı)',
      bleed: true,
      fields: { baslik: text('Başlık'), metin: area('Metin (boşsa ayarlardaki iletişim notu)'), dugme: text('Düğme yazısı') },
      defaultProps: { baslik: 'Sahada bir sorun mu var?', metin: '', dugme: 'E-posta gönder' },
      render: ({ baslik, metin, dugme, puck, id }) => {
        const s = site(puck)?.settings
        const hid = `h-${id}`
        return (
          <section className="strip" aria-labelledby={hid}>
            <div className="wrap strip__inner">
              <h2 id={hid}>{baslik}</h2>
              <p>{str(metin) || s?.contact.note || 'Bir yazıyla ilgili soru, düzeltme veya öneriniz varsa yazın.'}</p>
              {s?.contact.email ? (
                <a className="button button--black" href={`mailto:${s.contact.email}`}>
                  {dugme || 'E-posta gönder'}
                </a>
              ) : (
                <Link className="button button--black" href="/iletisim">
                  İletişim
                </Link>
              )}
            </div>
          </section>
        )
      },
    }),

    YazarBilgisi: block<{ dugmeler: string }>({
      label: 'Yazar bilgisi (ayarlardan)',
      fields: {
        dugmeler: radio('Düğmeler', [
          ['var', 'Göster'],
          ['yok', 'Gösterme'],
        ]),
      },
      defaultProps: { dugmeler: 'var' },
      render: ({ dugmeler, puck }) => {
        const d = site(puck)
        if (!d) return null
        const s = d.settings
        const photo = s.author.photo ? { ...s.author.photo, ...lookupFrom(d).dims(s.author.photo.src) } : null
        return (
          <div className="plain-page about-grid">
            <div>
              {s.author.shortBio ? <p className="lede">{s.author.shortBio}</p> : null}
              {s.author.bio ? (
                <Markdown source={s.author.bio} />
              ) : (
                <div className="empty">
                  <strong>Biyografi yakında eklenecek.</strong>
                  <p>Biyografi Panel › Site ayarları › Yazar bölümünden eklenir.</p>
                </div>
              )}
              {dugmeler === 'var' ? (
                <p className="page-actions">
                  <Link className="button" href="/blog">
                    Yazıları oku
                  </Link>
                  <Link className="button button--quiet" href="/iletisim">
                    İletişim
                  </Link>
                </p>
              ) : null}
            </div>
            {photo ? (
              <figure className="portrait reveal-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} />
              </figure>
            ) : null}
          </div>
        )
      },
    }),

    IletisimBilgileri: block<Record<string, never>>({
      label: 'İletişim bilgileri (ayarlardan)',
      fields: {},
      defaultProps: {},
      render: ({ puck }) => {
        const s = site(puck)?.settings
        if (!s) return null
        const c = s.contact
        const items = [
          c.email ? { key: 'email', icon: 'eposta', label: 'E-posta', href: `mailto:${c.email}`, text: c.email } : null,
          c.phone ? { key: 'phone', icon: 'telefon', label: 'Telefon', href: `tel:${c.phone.replace(/[^\d+]/g, '')}`, text: c.phone } : null,
          c.location ? { key: 'loc', icon: 'konum', label: 'Konum', text: c.location } : null,
        ].filter((x) => x !== null)
        const social = ([
          ['li', s.social.linkedin, LinkedinLogo, 'LinkedIn', 'Profili aç'],
          ['x', s.social.x, XLogo, 'X', 'Profili aç'],
          ['ig', s.social.instagram, InstagramLogo, 'Instagram', 'Profili aç'],
          ['yt', s.social.youtube, YoutubeLogo, 'YouTube', 'Kanalı aç'],
        ] as const).filter(([, u]) => safeHref(u))
        if (!items.length && !social.length) {
          return (
            <div className="empty empty--spaced">
              <strong>İletişim bilgileri henüz eklenmedi.</strong>
            </div>
          )
        }
        return (
          <ul className="contact-cards">
            {items.map((it) => (
              <li key={it.key}>
                <div className="contact-card">
                  <Icon name={it.icon} size={30} weight="duotone" />
                  <span>{it.label}</span>
                  {it.href ? <a href={it.href}>{it.text}</a> : <strong>{it.text}</strong>}
                </div>
              </li>
            ))}
            {social.map(([key, u, I, label, t]) => (
              <li key={key}>
                <div className="contact-card">
                  <I size={30} weight="duotone" aria-hidden="true" />
                  <span>{label}</span>
                  <a href={safeHref(u)} rel="me noopener noreferrer" target="_blank">
                    {t}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )
      },
    }),
  }

  return {
    categories: {
      duzen: { title: 'Düzen', components: ['Bolum', 'Sutunlar', 'Bosluk', 'Ayirici'] },
      temel: { title: 'Temel', components: ['Baslik', 'Metin', 'Gorsel', 'Dugmeler', 'IkonListesi', 'UyariKutusu', 'Kartlar', 'Alinti'] },
      gelismis: { title: 'Etkileşimli ve medya', components: ['SSS', 'Sekmeler', 'Video', 'Galeri', 'Sayilar', 'IlerlemeCubuklari', 'SosyalBaglantilar'] },
      site: { title: 'Site içeriği', components: ['SayfaBasligi', 'Slider', 'KayanSerit', 'SonYazilar', 'Urunler', 'KonuDizini', 'IletisimSeridi', 'YazarBilgisi', 'IletisimBilgileri'] },
    },
    root: {
      fields: {
        title: { type: 'text', label: 'Sayfa başlığı (sekme ve arama motorları)' },
      },
      render: ({ children }: { children: ReactNode }) => <div className="bk-page">{children}</div>,
    },
    components: components as unknown as Config['components'],
  } as Config
}
