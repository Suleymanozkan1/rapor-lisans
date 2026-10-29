import 'server-only'
import { githubConfig, storeKind } from '../env'
import { GithubStore } from './github'
import { LocalStore } from './local'
import { StoreUnavailableError, type ContentStore } from './types'

export function getStore(): ContentStore {
  const kind = storeKind()
  if (kind === 'local') return new LocalStore()
  if (kind === 'github') return new GithubStore(githubConfig()!)
  throw new StoreUnavailableError(
    'İçerik deposu yapılandırılmamış. GITHUB_TOKEN, GITHUB_OWNER ve GITHUB_REPO ortam değişkenlerini ayarlayın (README: "GitHub entegrasyonu").',
  )
}

export * from './types'
