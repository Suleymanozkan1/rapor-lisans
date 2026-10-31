import 'server-only'
import { githubConfig, missingGithubVars, storeKind } from '../env'
import { GithubStore } from './github'
import { LocalStore } from './local'
import { ReadOnlyStore } from './readonly'
import type { ContentStore } from './types'

export function getStore(): ContentStore {
  const kind = storeKind()
  if (kind === 'local') return new LocalStore()
  if (kind === 'github') return new GithubStore(githubConfig()!)
  // No writable store: show the content shipped with this deployment, refuse saves.
  const missing = missingGithubVars()
  return new ReadOnlyStore(
    `Kaydedilemedi: içerik deposu yapılandırılmamış. Eksik ortam değişkeni: ${missing.length ? missing.join(', ') : 'CONTENT_STORE=github'} (README: "GitHub entegrasyonu").`,
  )
}

export * from './types'
