import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { contentDir, uploadsDir } from '../env'
import { gitBlobSha } from './sha'
import {
  assertLogicalPath,
  ConflictError,
  type ActivityEntry,
  type Change,
  type CommitResult,
  type ContentStore,
  type FileEntry,
  type LogicalPath,
  type StoredFile,
} from './types'

const LOG_FILE = '.admin-activity.jsonl'

/** Development-only store that writes straight to the working tree. */
export class LocalStore implements ContentStore {
  readonly kind = 'local' as const

  private resolve(p: LogicalPath): string {
    assertLogicalPath(p)
    const [root, ...rest] = p.split('/')
    const base = root === 'content' ? contentDir() : uploadsDir()
    const full = path.resolve(base, ...rest)
    if (full !== base && !full.startsWith(base + path.sep)) throw new Error('Yol kök dizinin dışında')
    return full
  }

  async read(p: LogicalPath): Promise<StoredFile | null> {
    try {
      const content = await fs.readFile(this.resolve(p))
      return { path: p, content, sha: gitBlobSha(content) }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  }

  async readMany(paths: LogicalPath[]): Promise<Map<LogicalPath, StoredFile>> {
    const out = new Map<LogicalPath, StoredFile>()
    for (const p of paths) {
      const f = await this.read(p)
      if (f) out.set(p, f)
    }
    return out
  }

  async list(dir: LogicalPath): Promise<FileEntry[]> {
    const full = this.resolve(dir)
    const out: FileEntry[] = []
    const walk = async (abs: string, rel: string) => {
      let entries
      try {
        entries = await fs.readdir(abs, { withFileTypes: true })
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
        throw e
      }
      for (const ent of entries) {
        if (ent.name.startsWith('.')) continue
        const childRel = `${rel}/${ent.name}`
        if (ent.isDirectory()) await walk(path.join(abs, ent.name), childRel)
        else {
          const buf = await fs.readFile(path.join(abs, ent.name))
          out.push({ path: childRel as LogicalPath, sha: gitBlobSha(buf), size: buf.length })
        }
      }
    }
    await walk(full, dir)
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }

  async commit(changes: Change[], message: string): Promise<CommitResult> {
    for (const c of changes) {
      if (c.expectedSha === undefined) continue
      const current = await this.read(c.path)
      if ((current?.sha ?? null) !== c.expectedSha) {
        throw new ConflictError(`${c.path} başka bir oturumda değiştirilmiş`)
      }
    }
    for (const c of changes) {
      const full = this.resolve(c.path)
      if ('delete' in c) {
        await fs.rm(full, { force: true })
      } else {
        await fs.mkdir(path.dirname(full), { recursive: true })
        const tmp = `${full}.${process.pid}.tmp`
        await fs.writeFile(tmp, c.content)
        await fs.rename(tmp, full)
      }
    }
    const entry: ActivityEntry = {
      sha: gitBlobSha(Buffer.from(message + Date.now())).slice(0, 12),
      message,
      author: 'local',
      date: new Date().toISOString(),
    }
    await fs.mkdir(contentDir(), { recursive: true })
    await fs.appendFile(path.join(contentDir(), LOG_FILE), JSON.stringify(entry) + '\n')
    return { sha: entry.sha }
  }

  async activity(limit: number): Promise<ActivityEntry[]> {
    try {
      const raw = await fs.readFile(path.join(contentDir(), LOG_FILE), 'utf8')
      return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as ActivityEntry)
        .reverse()
        .slice(0, limit)
    } catch {
      return []
    }
  }
}
