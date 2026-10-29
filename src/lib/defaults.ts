import type { Settings } from './types'

/** Used when content/settings.json is missing. No invented credentials or claims. */
export const DEFAULT_SETTINGS: Settings = {
  siteName: 'Uğur Durak',
  tagline: 'İş sağlığı ve güvenliği üzerine notlar',
  description: 'Uğur Durak’ın iş sağlığı ve güvenliği üzerine yazıları.',
  author: { name: 'Uğur Durak', jobTitle: 'İş Sağlığı ve Güvenliği Uzmanı', shortBio: '', bio: '' },
  contact: { email: '', phone: '', location: '', note: '' },
  social: { linkedin: '', x: '', instagram: '', youtube: '' },
  seo: { defaultOgImage: '' },
  privacy: { controller: '', updatedAt: '' },
}
