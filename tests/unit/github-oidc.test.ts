import { describe, expect, it } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { GITHUB_OIDC_ISSUER, OidcError, verifyGithubOidc } from '@/lib/github-oidc'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const other = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' }
const jwks = async () => ({ keys: [jwk] })
const now = Date.UTC(2026, 9, 31, 12)
const t = Math.floor(now / 1000)
const expect_ = { audience: 'guvenli-calis-urun-onizleme', repository: 'Suleymanozkan1/rapor-lisans', branch: 'main', workflow: '.github/workflows/urun-onizleme.yml' }

function token(claims: Record<string, unknown>, opts: { kid?: string; alg?: string; key?: typeof privateKey } = {}) {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const head = enc({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'k1', typ: 'JWT' })
  const body = enc({
    iss: GITHUB_OIDC_ISSUER,
    aud: 'guvenli-calis-urun-onizleme',
    iat: t - 10,
    nbf: t - 10,
    exp: t + 300,
    repository: 'Suleymanozkan1/rapor-lisans',
    ref: 'refs/heads/main',
    workflow_ref: 'Suleymanozkan1/rapor-lisans/.github/workflows/urun-onizleme.yml@refs/heads/main',
    ...claims,
  })
  const sig = sign('RSA-SHA256', Buffer.from(`${head}.${body}`), opts.key ?? privateKey).toString('base64url')
  return `${head}.${body}.${sig}`
}

describe('verifyGithubOidc', () => {
  it('accepts a token from the preview workflow on the content branch', async () => {
    const c = await verifyGithubOidc(token({}), expect_, jwks, now)
    expect(c.repository).toBe('Suleymanozkan1/rapor-lisans')
  })

  it('rejects forged, foreign or stale tokens', async () => {
    const bad: [string, string][] = [
      ['imza', token({}, { key: other.privateKey })],
      ['anahtar', token({}, { kid: 'k2' })],
      ['alg', token({}, { alg: 'HS256' })],
      ['iss', token({ iss: 'https://example.com' })],
      ['aud', token({ aud: 'baska' })],
      ['exp', token({ exp: t - 120 })],
      ['nbf', token({ nbf: t + 600, iat: t + 600 })],
      ['repo', token({ repository: 'baska/depo', workflow_ref: 'baska/depo/.github/workflows/urun-onizleme.yml@refs/heads/main' })],
      ['dal', token({ ref: 'refs/heads/kotu', workflow_ref: 'Suleymanozkan1/rapor-lisans/.github/workflows/urun-onizleme.yml@refs/heads/kotu' })],
      ['akis', token({ workflow_ref: 'Suleymanozkan1/rapor-lisans/.github/workflows/baska.yml@refs/heads/main' })],
      ['bicim', 'abc.def'],
    ]
    for (const [name, tok] of bad) {
      await expect(verifyGithubOidc(tok, expect_, jwks, now), name).rejects.toBeInstanceOf(OidcError)
    }
  })

  it('accepts an audience list containing ours', async () => {
    await expect(verifyGithubOidc(token({ aud: ['x', 'guvenli-calis-urun-onizleme'] }), expect_, jwks, now)).resolves.toBeTruthy()
  })
})
