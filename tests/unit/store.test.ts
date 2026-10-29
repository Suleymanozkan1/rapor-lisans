import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { LocalStore } from '@/lib/store/local'
import { GithubStore } from '@/lib/store/github'
import { ConflictError, StoreUnavailableError, assertLogicalPath } from '@/lib/store/types'
import { gitBlobSha } from '@/lib/store/sha'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'isg-store-'))
  vi.stubEnv('CONTENT_DIR', path.join(dir, 'content'))
  vi.stubEnv('UPLOADS_DIR', path.join(dir, 'uploads'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(dir, { recursive: true, force: true })
})

describe('logical paths', () => {
  it('rejects traversal and foreign roots', () => {
    for (const bad of ['../etc/passwd', 'content/../../x', 'content/posts/../../x', 'public/x', 'content/', 'content/.env', 'uploads/a/..', 'content/Posts/X.md']) {
      expect(() => assertLogicalPath(bad), bad).toThrow()
    }
    expect(() => assertLogicalPath('content/posts/a-b.md')).not.toThrow()
  })
})

describe('LocalStore', () => {
  it('writes, reads, lists and deletes with optimistic locking', async () => {
    const s = new LocalStore()
    await s.commit([{ path: 'content/posts/a.md', content: 'A', expectedSha: null }], 'm1')
    const f = await s.read('content/posts/a.md')
    expect(f?.content.toString()).toBe('A')
    expect(f?.sha).toBe(gitBlobSha(Buffer.from('A')))
    await expect(s.commit([{ path: 'content/posts/a.md', content: 'B', expectedSha: null }], 'dup')).rejects.toThrow(ConflictError)
    await expect(s.commit([{ path: 'content/posts/a.md', content: 'B', expectedSha: 'stale' }], 'stale')).rejects.toThrow(ConflictError)
    await s.commit([{ path: 'content/posts/a.md', content: 'B', expectedSha: f!.sha }], 'm2')
    expect((await s.list('content/posts')).map((e) => e.path)).toEqual(['content/posts/a.md'])
    await s.commit([{ path: 'content/posts/a.md', delete: true }], 'm3')
    expect(await s.read('content/posts/a.md')).toBeNull()
    expect((await s.activity(10)).map((a) => a.message)).toEqual(['m3', 'm2', 'm1'])
  })
  it('keeps uploads inside the uploads root', async () => {
    const s = new LocalStore()
    await s.commit([{ path: 'uploads/2026/x.png', content: Buffer.from([1, 2]) }], 'up')
    expect(existsSync(path.join(dir, 'uploads', '2026', 'x.png'))).toBe(true)
  })
  it('does not write anything when one change in a batch conflicts', async () => {
    const s = new LocalStore()
    await expect(
      s.commit(
        [
          { path: 'content/posts/new.md', content: 'N', expectedSha: null },
          { path: 'content/posts/missing.md', delete: true, expectedSha: 'abc' },
        ],
        'x',
      ),
    ).rejects.toThrow(ConflictError)
    expect(existsSync(path.join(dir, 'content', 'posts', 'new.md'))).toBe(false)
  })
})

/** Minimal in-memory GitHub Git Data API. */
function fakeGithub() {
  const blobs = new Map<string, Buffer>()
  const files = new Map<string, string>() // path -> blob sha
  let head = 'c0'
  let headTree = new Map(files)
  const commits = new Map<string, Map<string, string>>([['c0', new Map()]])
  const trees = new Map<string, Map<string, string>>([['t-c0', new Map()]])
  const calls: { method: string; url: string; auth: string | null }[] = []
  let n = 0
  const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace('https://api.github.com/repos/o/r', '')
    const method = init?.method ?? 'GET'
    calls.push({ method, url, auth: new Headers(init?.headers).get('authorization') })
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    if (method === 'GET' && url === '/git/ref/heads/main') return ok({ object: { sha: head } })
    if (method === 'GET' && url.startsWith('/git/commits/')) return ok({ tree: { sha: `t-${url.split('/').pop()}` } })
    if (method === 'GET' && url.startsWith('/git/trees/')) {
      const t = trees.get(url.split('/')[3].split('?')[0])!
      return ok({ truncated: false, tree: [...t].map(([p, sha]) => ({ path: p, type: 'blob', sha, size: blobs.get(sha)!.length })) })
    }
    if (method === 'GET' && url.startsWith('/git/blobs/')) return ok({ content: blobs.get(url.split('/').pop()!)!.toString('base64'), encoding: 'base64' })
    if (method === 'POST' && url === '/git/blobs') {
      const buf = Buffer.from(body.content, 'base64')
      const sha = gitBlobSha(buf)
      blobs.set(sha, buf)
      return ok({ sha }, 201)
    }
    if (method === 'POST' && url === '/git/trees') {
      const t = new Map(trees.get(body.base_tree)!)
      for (const e of body.tree) {
        if (e.sha === null) t.delete(e.path)
        else t.set(e.path, e.sha)
      }
      const id = `tree${++n}`
      trees.set(id, t)
      return ok({ sha: id }, 201)
    }
    if (method === 'POST' && url === '/git/commits') {
      const id = `c${++n}`
      commits.set(id, trees.get(body.tree)!)
      trees.set(`t-${id}`, trees.get(body.tree)!)
      ;(commits as Map<string, unknown>).set(`${id}:parent`, body.parents[0])
      return ok({ sha: id, html_url: `https://github.com/o/r/commit/${id}` }, 201)
    }
    if (method === 'PATCH' && url === '/git/refs/heads/main') {
      if ((commits as Map<string, unknown>).get(`${body.sha}:parent`) !== head) return ok({ message: 'not fast forward' }, 422)
      head = body.sha
      headTree = trees.get(`t-${head}`)!
      return ok({ object: { sha: head } })
    }
    if (method === 'GET' && url.startsWith('/commits')) return ok([])
    return ok({ message: 'not found' }, 404)
  }) as typeof fetch
  return { impl, calls, moveHead: (sha: string) => (head = sha), files: () => headTree }
}

const cfg = { token: 'ghp_SECRETTOKEN', owner: 'o', repo: 'r', branch: 'main', contentPath: 'content', uploadsPath: 'public/uploads' }

describe('GithubStore', () => {
  it('commits several files atomically and maps logical paths to repo paths', async () => {
    const gh = fakeGithub()
    const s = new GithubStore(cfg, gh.impl)
    await s.commit(
      [
        { path: 'content/posts/a.md', content: 'A', expectedSha: null },
        { path: 'uploads/2026/x.png', content: Buffer.from([137, 80]) },
      ],
      'panel(ugur): test',
    )
    expect([...gh.files().keys()].sort()).toEqual(['content/posts/a.md', 'public/uploads/2026/x.png'])
    const a = await s.read('content/posts/a.md')
    expect(a?.content.toString()).toBe('A')
    expect((await s.list('content/posts')).map((e) => e.path)).toEqual(['content/posts/a.md'])
    // Token only in the Authorization header, never in URLs.
    expect(gh.calls.every((c) => c.auth === 'Bearer ghp_SECRETTOKEN' && !c.url.includes('SECRET'))).toBe(true)
  })

  it('refuses stale writes (expected SHA mismatch) before creating any blob', async () => {
    const gh = fakeGithub()
    const s = new GithubStore(cfg, gh.impl)
    await s.commit([{ path: 'content/posts/a.md', content: 'A', expectedSha: null }], 'one')
    const before = gh.calls.length
    await expect(s.commit([{ path: 'content/posts/a.md', content: 'B', expectedSha: 'old' }], 'two')).rejects.toThrow(ConflictError)
    expect(gh.calls.slice(before).some((c) => c.method === 'POST')).toBe(false)
  })

  it('surfaces a non-fast-forward ref update as a conflict', async () => {
    const gh = fakeGithub()
    const racing = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await gh.impl(input, init)
      // Simulate another writer moving the branch right after our commit object is created.
      if (String(input).endsWith('/git/commits') && init?.method === 'POST') gh.moveHead('someone-else')
      return res
    }) as typeof fetch
    const s = new GithubStore(cfg, racing)
    await expect(s.commit([{ path: 'content/posts/a.md', content: 'A' }], 'race')).rejects.toThrow(ConflictError)
  })

  it('reports auth failures without echoing the token', async () => {
    const s = new GithubStore(cfg, (async () => new Response('{"message":"Bad credentials"}', { status: 401 })) as typeof fetch)
    const err = await s.read('content/settings.json').catch((e) => e)
    expect(err).toBeInstanceOf(StoreUnavailableError)
    expect(String(err.message)).not.toContain('ghp_')
  })
})

describe('admin content service (local store)', () => {
  beforeEach(() => {
    vi.stubEnv('CONTENT_STORE', 'local')
    vi.stubEnv('VERCEL', '')
  })

  it('creates a draft, publishes it, bumps revision on published edits, renames and deletes', async () => {
    const svc = await import('@/lib/admin-content')
    const fm = { title: 'Deneme yazısı', excerpt: 'Özet', status: 'draft' as const, tags: ['kkd'], references: [] }
    await svc.savePost({ originalSlug: null, sha: null, slug: 'deneme', frontmatter: fm, body: 'Gövde' }, 'ugur')
    let p = (await svc.getAdminPost('deneme'))!
    expect(p.status).toBe('draft')
    expect(p.publishedAt).toBeUndefined()

    await svc.savePost({ originalSlug: 'deneme', sha: p.sha, slug: 'deneme', frontmatter: { ...fm, status: 'published' }, body: 'Gövde' }, 'ugur')
    p = (await svc.getAdminPost('deneme'))!
    expect(p.status).toBe('published')
    expect(p.publishedAt).toBeDefined()
    expect(p.revision).toBe(0)

    await svc.savePost({ originalSlug: 'deneme', sha: p.sha, slug: 'deneme', frontmatter: { ...fm, status: 'published' }, body: 'Yeni gövde' }, 'ugur')
    const p2 = (await svc.getAdminPost('deneme'))!
    expect(p2.revision).toBe(1)
    expect(p2.publishedAt).toBe(p.publishedAt)

    // Stale SHA is refused.
    await expect(
      svc.savePost({ originalSlug: 'deneme', sha: p.sha, slug: 'deneme', frontmatter: fm, body: 'x' }, 'ugur'),
    ).rejects.toThrow(ConflictError)

    await svc.savePost({ originalSlug: 'deneme', sha: p2.sha, slug: 'yeni-adres', frontmatter: { ...fm, status: 'published' }, body: 'Yeni gövde' }, 'ugur')
    expect(await svc.getAdminPost('deneme')).toBeNull()
    const moved = (await svc.getAdminPost('yeni-adres'))!
    expect(moved.createdAt).toBe(p.createdAt)

    // Renaming onto an existing slug is refused.
    await svc.savePost({ originalSlug: null, sha: null, slug: 'baska', frontmatter: fm, body: '' }, 'ugur')
    await expect(
      svc.savePost({ originalSlug: 'baska', sha: (await svc.getAdminPost('baska'))!.sha, slug: 'yeni-adres', frontmatter: fm, body: '' }, 'ugur'),
    ).rejects.toThrow(ConflictError)

    expect(await svc.rewriteTag('kkd', 'kisisel-koruyucu', 'ugur')).toBe(2)
    expect((await svc.getAdminPost('yeni-adres'))!.tags).toEqual(['kisisel-koruyucu'])

    await svc.deletePost('yeni-adres', (await svc.getAdminPost('yeni-adres'))!.sha, 'ugur')
    expect(await svc.getAdminPost('yeni-adres')).toBeNull()
    expect(readFileSync(path.join(dir, 'content', '.admin-activity.jsonl'), 'utf8')).toContain('panel(ugur): yazıyı sildi yeni-adres')
  })

  it('rejects invalid slugs at the service boundary', async () => {
    const svc = await import('@/lib/admin-content')
    expect(await svc.getAdminPost('../settings')).toBeNull()
    await expect(
      svc.savePost({ originalSlug: null, sha: null, slug: '../../x', frontmatter: { title: 'abc', excerpt: '', status: 'draft', tags: [], references: [] }, body: '' }, 'u'),
    ).rejects.toThrow()
  })
})
