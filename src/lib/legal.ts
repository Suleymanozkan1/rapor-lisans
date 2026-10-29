import type { Settings } from './types'

/*
 * Pre-contract information form and distance sales contract for one order,
 * as plain text. The same function renders the preview on the checkout page
 * and the text stored with the order and e-mailed to the buyer, so what the
 * buyer approved is exactly what is kept. This is a template based on the
 * Mesafeli Sözleşmeler Yönetmeliği; have it reviewed by a lawyer.
 * Change CONTRACT_VERSION whenever the wording changes.
 */

export const CONTRACT_VERSION = '2026-10-29.2'

export type ContractInput = {
  seller: Settings['seller']
  siteName: string
  siteUrl: string
  buyer: { name: string; surname: string; email: string; phone: string; city: string; address: string }
  product: { title: string; excerpt: string; format?: string; features: string[]; fileName: string; contentType: string }
  priceKurus: number
  date: Date
  downloadDays: number
  downloadLimit: number
}

const SOFTWARE: Record<string, string> = {
  'application/pdf': 'PDF dosyası; herhangi bir güncel PDF okuyucu ile açılır.',
  'application/zip': 'ZIP arşivi; içindeki dosyalar arşiv açma programıyla çıkarılır.',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx) dosyası; Microsoft Excel, LibreOffice Calc veya uyumlu bir tablo programıyla açılır.',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx) dosyası; Microsoft Word, LibreOffice Writer veya uyumlu bir kelime işlemciyle açılır.',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (.pptx) dosyası; Microsoft PowerPoint, LibreOffice Impress veya uyumlu bir sunum programıyla açılır.',
}

// Formatted by hand (not Intl) so the server and the browser preview produce identical text.
export function money(kurus: number): string {
  const lira = Math.floor(kurus / 100)
  const rest = String(kurus % 100).padStart(2, '0')
  return `${String(lira).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${rest} TL`
}
/** Türkiye time (UTC+3 all year since 2016), "29.10.2026 14:05". */
export function day(d: Date): string {
  const t = new Date(d.getTime() + 3 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(t.getUTCDate())}.${p(t.getUTCMonth() + 1)}.${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())} (TSİ)`
}
const or = (v: string, fallback = 'Belirtilmemiş') => v.trim() || fallback

export function buildContract(i: ContractInput): { version: string; text: string } {
  const s = i.seller
  const buyerName = `${i.buyer.name} ${i.buyer.surname}`.trim() || '[Alıcının adı soyadı]'
  const sellerBlock = [
    `Unvan / ad soyad: ${or(s.legalName)}`,
    ...(s.mersisNo ? [`MERSİS numarası: ${s.mersisNo}`] : []),
    `Adres: ${or(s.address)}`,
    `Telefon: ${or(s.phone)}`,
    `E-posta: ${or(s.email)}`,
    ...(s.kep ? [`KEP adresi: ${s.kep}`] : []),
    `Vergi dairesi ve numarası: ${or(s.taxOffice)} ${or(s.taxNumber, '')}`.trimEnd(),
    ...(s.chamber ? [`Bağlı olunan meslek odası: ${s.chamber}`] : []),
    `Web sitesi: ${i.siteUrl}`,
  ]
  const buyerBlock = [
    `Ad soyad: ${buyerName}`,
    `E-posta: ${or(i.buyer.email, '[E-posta]')}`,
    `Telefon: ${or(i.buyer.phone, '[Telefon]')}`,
    `Fatura adresi: ${or(i.buyer.address, '[Adres]')}${i.buyer.city ? `, ${i.buyer.city}` : ''}`,
  ]
  const productBlock = [
    `Ürün: ${i.product.title}`,
    ...(i.product.excerpt ? [`Açıklama: ${i.product.excerpt}`] : []),
    ...(i.product.format ? [`Biçim: ${i.product.format}`] : []),
    ...(i.product.features.length ? ['İçerik:', ...i.product.features.map((f) => `  - ${f}`)] : []),
    'Niteliği: Elektronik ortamda indirilerek teslim edilen dijital içerik (gayrimaddi mal). Fiziksel teslimat yapılmaz.',
    `Teslim edilen dosya: ${i.product.fileName}`,
    `İşlevsellik ve uyumluluk: ${SOFTWARE[i.product.contentType] ?? 'Dosya türüne uygun bir programla açılır.'} Dosyada kopya koruması gibi teknik koruma önlemi yoktur.`,
    'Adet: 1',
  ]

  const text = `ÖN BİLGİLENDİRME FORMU

1. SATICI
${sellerBlock.join('\n')}

2. ALICI
${buyerBlock.join('\n')}

3. ÜRÜNÜN TEMEL NİTELİKLERİ
${productBlock.join('\n')}

4. TOPLAM FİYAT
${money(i.priceKurus)}, tüm vergiler (KDV) dahil. Teslimat veya başka bir ek ücret yoktur.

5. ÖDEME
Ödeme, siparişin onaylanmasının ardından iyzico Ödeme Hizmetleri A.Ş.nin güvenli ödeme sayfasında kredi veya banka kartıyla, tek çekim olarak yapılır. Kart bilgileri satıcıya iletilmez ve satıcı tarafından saklanmaz.

6. TESLİMAT VE İFA
Ödeme onaylandığında ürün dosyası alıcının sipariş sayfasında indirilmeye hazır olur ve bu sayfanın bağlantısı alıcının e-posta adresine gönderilir. İndirme bağlantısı ödemeden itibaren ${i.downloadDays} gün ve en fazla ${i.downloadLimit} indirme için geçerlidir; süre veya hak dolduğunda alıcının talebi üzerine yeniden gönderilir.

7. CAYMA HAKKI
Mesafeli Sözleşmeler Yönetmeliği madde 15 birinci fıkra (ğ) bendi uyarınca, elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde cayma hakkı kullanılamaz. Bu ürün ödeme onaylanınca anında teslim edilen dijital içerik olduğundan alıcının cayma hakkı yoktur. Alıcı, sipariş sırasında dijital içeriğin hemen teslim edilmesini açıkça istediğini ve teslimattan sonra cayma hakkını kullanamayacağını bildiğini onaylar. Ödeme onaylanmadan önce sipariş, bedel ödenmeden ve herhangi bir yükümlülük doğmadan terk edilebilir.

8. AYIPLI İFA
Dosya açılamıyor, eksik veya ürün açıklamasına aykırıysa alıcı, 6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 11. maddesindeki seçimlik haklarını kullanabilir. Bu durumda satıcıya ${or(s.email, 'yukarıdaki iletişim adresleri')} üzerinden sipariş numarasıyla başvurulması yeterlidir.

9. ŞİKAYET VE İTİRAZ
Şikayetler satıcının yukarıdaki iletişim bilgilerine iletilebilir. Uyuşmazlıklarda, Ticaret Bakanlığınca her yıl belirlenen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya işlemin yapıldığı yerdeki tüketici hakem heyetine başvurulabilir. Bu sınırların üzerindeki uyuşmazlıklarda, 6502 sayılı Kanun'un 73/A maddesi uyarınca tüketici mahkemesinde dava açmadan önce arabulucuya başvurulması zorunludur. Hakem heyeti başvuruları E-Devlet üzerinden Tüketici Bilgi Sistemi (TÜBİS) ile de yapılabilir.

10. SÖZLEŞME METNİNİN SAKLANMASI
Bu form ve mesafeli satış sözleşmesi siparişle birlikte satıcı tarafından en az üç yıl saklanır, ödeme onaylanınca alıcının e-posta adresine gönderilir ve alıcının sipariş sayfasından görüntülenebilir.

11. KİŞİSEL VERİLER
Sipariş için verilen kişisel veriler, ${i.siteUrl}/gizlilik adresindeki aydınlatma metnine uygun olarak, sözleşmenin kurulması ve ifası ile yasal yükümlülükler için işlenir.


MESAFELİ SATIŞ SÖZLEŞMESİ

MADDE 1. TARAFLAR
Satıcı: ${or(s.legalName)}, ${or(s.address)} (bilgileri yukarıdaki ön bilgilendirme formunun 1. maddesindedir).
Alıcı: ${buyerName}, ${or(i.buyer.address, '[Adres]')}${i.buyer.city ? `, ${i.buyer.city}` : ''} (bilgileri ön bilgilendirme formunun 2. maddesindedir).

MADDE 2. KONU
Bu sözleşmenin konusu, alıcının ${i.siteName} internet sitesinden (${i.siteUrl}) elektronik ortamda sipariş verdiği aşağıdaki dijital ürünün satışı ve teslimine ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülükleridir.

MADDE 3. ÜRÜN VE BEDEL
${productBlock.join('\n')}
Toplam bedel: ${money(i.priceKurus)} (KDV dahil)
Ödeme şekli: Kredi veya banka kartı, tek çekim (iyzico güvenli ödeme sayfası)

MADDE 4. TESLİM
Ürün, ödemenin onaylanmasının hemen ardından elektronik ortamda teslim edilir: dosya alıcının sipariş sayfasından indirilir ve sayfanın bağlantısı alıcının ${or(i.buyer.email, '[e-posta]')} adresine gönderilir. Bağlantı ${i.downloadDays} gün ve ${i.downloadLimit} indirme için geçerlidir ve talep üzerine yenilenir. Satıcı, yasal 30 günlük ifa süresini aşmadan teslimi yapmakla yükümlüdür.

MADDE 5. CAYMA HAKKI
Ürün, tüketiciye anında teslim edilen gayrimaddi mal niteliğinde olduğundan Mesafeli Sözleşmeler Yönetmeliği madde 15/1-ğ uyarınca cayma hakkı kullanılamaz. Alıcı, siparişi onaylarken dijital içeriğin hemen teslim edilmesini istediğini ve teslimattan sonra cayma hakkını kullanamayacağını bildiğini ayrıca onaylamıştır.

MADDE 6. AYIPLI İFA
Teslim edilen dosyanın açılmaması, eksik veya açıklamaya aykırı olması halinde alıcının 6502 sayılı Kanun'un 11. maddesindeki hakları saklıdır.

MADDE 7. FATURA
Satıcı, satışa ilişkin faturayı mevzuata uygun olarak düzenler ve alıcının e-posta adresine elektronik ortamda iletir.

MADDE 8. UYUŞMAZLIKLAR
Uyuşmazlıklarda, Ticaret Bakanlığınca ilan edilen parasal sınırlar dahilinde tüketici hakem heyetleri, bu sınırların üzerinde (6502 sayılı Kanun md. 73/A uyarınca zorunlu arabuluculuk aşamasından sonra) tüketici mahkemeleri yetkilidir.

MADDE 9. YÜRÜRLÜK
Ön bilgilendirme formu bu sözleşmenin ayrılmaz parçasıdır. Alıcı, bu sözleşmeyi ve ön bilgilendirme formunu okuyup onayladıktan sonra "Onayla ve öde" düğmesine basarak ödeme yükümlülüğü altına girer; sözleşme ödemenin onaylanmasıyla kurulur. Sözleşme metni satıcı tarafından en az üç yıl saklanır ve alıcının e-posta adresine gönderilir.

Sipariş tarihi: ${day(i.date)}
Metin sürümü: ${CONTRACT_VERSION}
`
  return { version: CONTRACT_VERSION, text }
}
