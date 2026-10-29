import 'server-only'
import path from 'node:path'
import { createHash } from 'node:crypto'

/** Directory with Markdown/JSON content, relative to the project root. */
export function contentDir(): string {
  // The static default lets output file tracing include content/ in functions;
  // CONTENT_DIR is meant for tests and local demos only.
  return process.env.CONTENT_DIR
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.CONTENT_DIR)
    : path.join(process.cwd(), 'content')
}

/** Directory uploaded media is written to by the local store. */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOADS_DIR)
    : path.join(process.cwd(), 'public', 'uploads')
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

export type StoreKind = 'github' | 'local' | 'none'

/**
 * The admin panel writes either to GitHub (production) or to the local
 * file system (development only). Local writes are refused on Vercel,
 * because a function's file system is not persistent.
 */
export function storeKind(): StoreKind {
  const requested = process.env.CONTENT_STORE
  if (requested === 'local') {
    // Never on Vercel; in a production build only for the e2e suite's disposable copy.
    if (process.env.VERCEL) return 'none'
    return process.env.NODE_ENV !== 'production' || process.env.E2E_LOCAL_STORE === '1' ? 'local' : 'none'
  }
  if (requested === 'github' || (!requested && process.env.GITHUB_TOKEN)) {
    return githubConfig() ? 'github' : 'none'
  }
  if (!requested && process.env.NODE_ENV === 'development') return 'local'
  return 'none'
}

export type GithubConfig = {
  token: string
  owner: string
  repo: string
  branch: string
  /** Repo path that holds the content directory. */
  contentPath: string
  /** Repo path that holds uploaded media (served from /uploads). */
  uploadsPath: string
}

export function githubConfig(): GithubConfig | null {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return null
  const clean = (p: string) => p.replace(/^\/+|\/+$/g, '')
  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
    contentPath: clean(process.env.GITHUB_CONTENT_PATH || 'content'),
    uploadsPath: clean(process.env.GITHUB_UPLOADS_PATH || 'public/uploads'),
  }
}

export type AuthConfig = {
  username: string
  passwordHash: string
  sessionSecret: string
  sessionVersion: string
}

/** Returns null (admin disabled) unless every auth secret is present and strong enough. */
export function authConfig(): AuthConfig | null {
  const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SESSION_SECRET } = process.env
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !SESSION_SECRET) return null
  if (SESSION_SECRET.length < 32) return null
  if (!ADMIN_PASSWORD_HASH.startsWith('scrypt:')) return null
  return {
    username: ADMIN_USERNAME,
    passwordHash: ADMIN_PASSWORD_HASH,
    sessionSecret: SESSION_SECRET,
    // Changing the password (its hash) or SESSION_VERSION invalidates every issued session.
    sessionVersion: `${process.env.SESSION_VERSION || '1'}.${createHash('sha256').update(ADMIN_PASSWORD_HASH).digest('base64url').slice(0, 10)}`,
  }
}
