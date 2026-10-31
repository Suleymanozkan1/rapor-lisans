import { createPublicKey, verify, type JsonWebKeyInput } from 'node:crypto'

/*
 * Verifies the identity token GitHub Actions issues to a workflow run
 * (OpenID Connect, RS256). The preview job uses it to fetch a product file
 * from the private store, so no long-lived secret is kept in GitHub.
 */

export const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
export const PREVIEW_AUDIENCE = 'guvenli-calis-urun-onizleme'
export const PREVIEW_WORKFLOW = '.github/workflows/urun-onizleme.yml'

export class OidcError extends Error {}

export type GithubClaims = {
  iss: string
  aud: string | string[]
  exp: number
  iat: number
  nbf?: number
  repository: string
  ref: string
  workflow_ref: string
  [key: string]: unknown
}

type Jwks = { keys: (JsonWebKeyInput['key'] & { kid?: string })[] }
export type JwksFetcher = () => Promise<Jwks>

const g = globalThis as typeof globalThis & { __githubJwks?: { at: number; jwks: Promise<Jwks> } }

/** GitHub's signing keys, cached for an hour (refetched once when a key id is unknown). */
export const fetchGithubJwks: JwksFetcher = () => {
  if (g.__githubJwks && Date.now() - g.__githubJwks.at < 3600_000) return g.__githubJwks.jwks
  const jwks = fetch(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) }).then((r) => {
    if (!r.ok) throw new OidcError(`JWKS alınamadı (${r.status})`)
    return r.json() as Promise<Jwks>
  })
  g.__githubJwks = { at: Date.now(), jwks }
  jwks.catch(() => {
    if (g.__githubJwks?.jwks === jwks) g.__githubJwks = undefined
  })
  return jwks
}

const b64 = (s: string) => Buffer.from(s, 'base64url')

export async function verifyGithubOidc(
  token: string,
  expect: { audience: string; repository: string; branch: string; workflow: string },
  jwks: JwksFetcher = fetchGithubJwks,
  now = Date.now(),
): Promise<GithubClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new OidcError('Biçimsiz belirteç')
  let header: { alg?: string; kid?: string }
  let claims: GithubClaims
  try {
    header = JSON.parse(b64(parts[0]).toString('utf8'))
    claims = JSON.parse(b64(parts[1]).toString('utf8'))
  } catch {
    throw new OidcError('Biçimsiz belirteç')
  }
  if (header.alg !== 'RS256' || !header.kid) throw new OidcError('Desteklenmeyen imza')

  let key = (await jwks()).keys.find((k) => k.kid === header.kid)
  if (!key && jwks === fetchGithubJwks) {
    g.__githubJwks = undefined
    key = (await jwks()).keys.find((k) => k.kid === header.kid)
  }
  if (!key) throw new OidcError('Bilinmeyen anahtar')
  const ok = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: 'jwk' }), b64(parts[2]))
  if (!ok) throw new OidcError('İmza geçersiz')

  const t = Math.floor(now / 1000)
  const skew = 60
  if (claims.iss !== GITHUB_OIDC_ISSUER) throw new OidcError('Yayıncı geçersiz')
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!aud.includes(expect.audience)) throw new OidcError('Hedef geçersiz')
  if (typeof claims.exp !== 'number' || claims.exp + skew < t) throw new OidcError('Süresi dolmuş')
  if ((claims.nbf ?? claims.iat) - skew > t) throw new OidcError('Henüz geçerli değil')
  if (String(claims.repository).toLowerCase() !== expect.repository.toLowerCase()) throw new OidcError('Depo eşleşmiyor')
  if (claims.ref !== `refs/heads/${expect.branch}`) throw new OidcError('Dal eşleşmiyor')
  if (String(claims.workflow_ref).toLowerCase() !== `${expect.repository}/${expect.workflow}@refs/heads/${expect.branch}`.toLowerCase()) {
    throw new OidcError('İş akışı eşleşmiyor')
  }
  return claims
}
