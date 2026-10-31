import 'server-only'
import { getSettings, mediaFor } from '@/lib/content'
import { markdownWordCount, readingMinutes } from '@/lib/markdown'
import type { SiteLookup } from './views/lookup'

export function serverLookup(): SiteLookup {
  return {
    dims: (src) => mediaFor(src),
    logo: getSettings().logo,
    minutes: (p) => readingMinutes(markdownWordCount(p.body)),
  }
}
