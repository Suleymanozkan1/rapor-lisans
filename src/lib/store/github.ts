import 'server-only'
import type { GithubConfig } from '../env'
import {
  ConflictError,
  StoreUnavailableError,
  assertLogicalPath,
  type ActivityEntry,
  type Change,
  type CommitResult,
  type ContentStore,
  type FileEntry,
  type LogicalPath,
  type StoredFile,
} from './types'

type TreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; sha: string; size?: number }

/**
 * Writes content as Git commits through the GitHub REST API (Git Data API),
 * so several files change atomically and Vercel redeploys from the commit.
 * The token stays on the server; it is never logged or sent to the browser.
 */
export class GithubStore implements ContentStore {
  readonly kind = 'github' as const
  constructor(
    private readonly cfg: GithubConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private repoPath(p: LogicalPath): string {
    assertLogicalPath(p)
    const [root, ...rest] = p.split('/')
    const base = root === 'content' ? this.cfg.contentPath : this.cfg.uploadsPath
    return [base, ...rest].filter(Boolean).join('/')
  }

  private logical(repoPath: string): LogicalPath | null {
    for (const [root, base] of [
      ['content', this.cfg.contentPath],
      ['uploads', this.cfg.uploadsPath],
    ] as const) {
      const prefix = base ? `${base}/` : ''
      if (repoPath.startsWith(prefix)) {
        const lp = `${root}/${repoPath.slice(prefix.length)}`
        try {
          assertLogicalPath(lp)
          return lp
        } catch {
          return null
        }
      }
    }
    return null
  }

  private async api<T>(method: string, url: string, body?: unknown, allow404 = false): Promise<T | null> {
    let res: Response
    try {
      res = await this.fetchImpl(`https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.cfg.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'isg-blog-admin',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      })
    } catch (e) {
      throw new StoreUnavailableError(`GitHub'a ulaşılamadı: ${(e as Error).name}`)
    }
    if (allow404 && res.status === 404) return null
    if (res.status === 409 || res.status === 422) {
      throw new ConflictError(`GitHub isteği reddetti (${res.status}). Sayfayı yenileyip tekrar deneyin.`)
    }
    if (!res.ok) {
      const hint =
        res.status === 401
          ? 'token geçersiz veya süresi dolmuş'
          : res.status === 403
            ? 'token yetkisi yetersiz veya API kotası doldu'
            : res.status === 404
              ? 'depo/dal bulunamadı veya token bu depoya erişemiyor'
              : 'beklenmeyen hata'
      throw new StoreUnavailableError(`GitHub API ${res.status}: ${hint}`)
    }
    return (await res.json()) as T
  }

  private async headCommit(): Promise<{ commitSha: string; treeSha: string }> {
    const ref = await this.api<{ object: { sha: string } }>('GET', `/git/ref/heads/${encodeURIComponent(this.cfg.branch)}`)
    const commit = await this.api<{ tree: { sha: string } }>('GET', `/git/commits/${ref!.object.sha}`)
    return { commitSha: ref!.object.sha, treeSha: commit!.tree.sha }
  }

  private async tree(treeSha: string): Promise<TreeEntry[]> {
    const t = await this.api<{ tree: TreeEntry[]; truncated: boolean }>('GET', `/git/trees/${treeSha}?recursive=1`)
    if (t!.truncated) throw new StoreUnavailableError('Depo ağacı çok büyük (GitHub listeyi kesti)')
    return t!.tree
  }

  async read(p: LogicalPath): Promise<StoredFile | null> {
    const { treeSha } = await this.headCommit()
    const entry = (await this.tree(treeSha)).find((e) => e.type === 'blob' && e.path === this.repoPath(p))
    if (!entry) return null
    const blob = await this.api<{ content: string; encoding: string }>('GET', `/git/blobs/${entry.sha}`)
    return { path: p, content: Buffer.from(blob!.content, 'base64'), sha: entry.sha }
  }

  async list(dir: LogicalPath): Promise<FileEntry[]> {
    const { treeSha } = await this.headCommit()
    const prefix = `${this.repoPath(dir)}/`
    const out: FileEntry[] = []
    for (const e of await this.tree(treeSha)) {
      if (e.type !== 'blob' || !e.path.startsWith(prefix)) continue
      const path = this.logical(e.path)
      if (path) out.push({ path, sha: e.sha, size: e.size })
    }
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }

  /** Reads several files from one tree snapshot. */
  async readMany(paths: LogicalPath[]): Promise<Map<LogicalPath, StoredFile>> {
    const { treeSha } = await this.headCommit()
    const tree = await this.tree(treeSha)
    const out = new Map<LogicalPath, StoredFile>()
    await Promise.all(
      paths.map(async (p) => {
        const entry = tree.find((e) => e.type === 'blob' && e.path === this.repoPath(p))
        if (!entry) return
        const blob = await this.api<{ content: string }>('GET', `/git/blobs/${entry.sha}`)
        out.set(p, { path: p, content: Buffer.from(blob!.content, 'base64'), sha: entry.sha })
      }),
    )
    return out
  }

  async commit(changes: Change[], message: string): Promise<CommitResult> {
    const { commitSha, treeSha } = await this.headCommit()
    const tree = await this.tree(treeSha)
    const shaOf = (p: LogicalPath) => tree.find((e) => e.type === 'blob' && e.path === this.repoPath(p))?.sha ?? null

    for (const c of changes) {
      if (c.expectedSha !== undefined && shaOf(c.path) !== c.expectedSha) {
        throw new ConflictError(`${c.path} başka bir oturumda değiştirilmiş`)
      }
    }

    const entries = await Promise.all(
      changes.map(async (c) => {
        const path = this.repoPath(c.path)
        if ('delete' in c) return { path, mode: '100644', type: 'blob', sha: null }
        const buf = typeof c.content === 'string' ? Buffer.from(c.content, 'utf8') : c.content
        const blob = await this.api<{ sha: string }>('POST', '/git/blobs', {
          content: buf.toString('base64'),
          encoding: 'base64',
        })
        return { path, mode: '100644', type: 'blob', sha: blob!.sha }
      }),
    )
    const newTree = await this.api<{ sha: string }>('POST', '/git/trees', { base_tree: treeSha, tree: entries })
    const commit = await this.api<{ sha: string; html_url: string }>('POST', '/git/commits', {
      message,
      tree: newTree!.sha,
      parents: [commitSha],
    })
    // force:false makes GitHub reject the update if the branch moved meanwhile.
    await this.api('PATCH', `/git/refs/heads/${encodeURIComponent(this.cfg.branch)}`, { sha: commit!.sha, force: false })
    return { sha: commit!.sha, url: commit!.html_url }
  }

  async activity(limit: number): Promise<ActivityEntry[]> {
    type GhCommit = { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }
    const q = (path: string) =>
      this.api<GhCommit[]>(
        'GET',
        `/commits?sha=${encodeURIComponent(this.cfg.branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`,
      )
    const [a, b] = await Promise.all([q(this.cfg.contentPath), q(this.cfg.uploadsPath)])
    const seen = new Set<string>()
    return [...(a ?? []), ...(b ?? [])]
      .filter((c) => (seen.has(c.sha) ? false : (seen.add(c.sha), true)))
      .map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      }))
      .sort((x, y) => y.date.localeCompare(x.date))
      .slice(0, limit)
  }
}
