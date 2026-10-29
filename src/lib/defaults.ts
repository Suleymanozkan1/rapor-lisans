import type { Settings } from './types'

/** Used when content/settings.json is missing. No invented credentials or claims. */
export const DEFAULT_SETTINGS: Settings = {
  siteName: 'Güvenli Çalış',
  tagline: 'Haklar, mevzuat ve saha kesitleri',
  description: 'Uğur Durak’ın iş sağlığı ve güvenliği üzerine yazıları.',
  motto: [],
  author: { name: 'Uğur Durak', jobTitle: 'İş Sağlığı ve Güvenliği Uzmanı', shortBio: '', bio: '' },
  contact: { email: '', phone: '', location: '', note: '' },
  social: { linkedin: '', x: '', instagram: '', youtube: '' },
  seller: { legalName: '', address: '', phone: '', email: '', taxOffice: '', taxNumber: '', mersisNo: '', kep: '', chamber: '' },
  seo: { defaultOgImage: '' },
  privacy: { controller: '', updatedAt: '' },
}
