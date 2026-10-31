import type { Settings } from '../types'
import type { BlockData, BuilderData, PageMeta, SystemPageKey } from './model'

/*
 * Layouts of the system pages until they are first saved in the editor.
 * They reproduce the hand-built pages block for block, so turning on the
 * editor changes nothing visible.
 */

const flush = { gizle: 'yok', ust: 'yok', alt: 'yok', animasyon: 'yok', baglanti: '' }
const b = (type: string, props: Record<string, unknown>, adv = flush): BlockData => ({ type, props: { id: `${type}-varsayilan`, ...props, _adv: adv } })

export function defaultPage(key: SystemPageKey, s: Settings): { meta: PageMeta; data: BuilderData } {
  const meta = (title: string): PageMeta => ({ title, description: '', status: 'published', menu: false, menuLabel: '', menuOrder: 50 })
  if (key === 'anasayfa') {
    return {
      meta: meta('Ana sayfa'),
      data: {
        root: { props: {} },
        content: [
          b('Slider', { tanitim: 'var', baslik: '', metin: '', gorsel: '', gorselAlt: '', d1: '', d1Adres: '', d2: '', d2Adres: '', yaziSayisi: 3, urunSayisi: 3 }),
          b('KayanSerit', { sayi: 8 }),
          b('SonYazilar', { baslik: 'Gündem', tumu: 'Tüm yazılar', sayi: 6, kategori: '', duzen: 'manset' }),
          b('Urunler', { baslik: 'Doküman rafı', tumu: 'Mağazaya git', sayi: 3, duzen: 'yelpaze' }),
          b('KonuDizini', { baslik: 'Konu dizini' }),
          b('IletisimSeridi', { baslik: 'Sahada bir sorun mu var?', metin: '', dugme: 'E-posta gönder' }),
        ],
      },
    }
  }
  if (key === 'hakkimda') {
    return {
      meta: meta('Hakkımda'),
      data: {
        root: { props: {} },
        content: [
          b('SayfaBasligi', { baslik: 'Hakkımda', altyazi: `${s.author.name}${s.author.jobTitle ? `, ${s.author.jobTitle}` : ''}` }),
          b('YazarBilgisi', { dugmeler: 'var' }, { ...flush, alt: 'l' }),
        ],
      },
    }
  }
  return {
    meta: meta('İletişim'),
    data: {
      root: { props: {} },
      content: [
        b('SayfaBasligi', { baslik: 'İletişim', altyazi: s.contact.note || 'Yazılarla ilgili soru, düzeltme ve önerileriniz için aşağıdaki kanalları kullanabilirsiniz.' }),
        b('IletisimBilgileri', {}),
      ],
    },
  }
}
