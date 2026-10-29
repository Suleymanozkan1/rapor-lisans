/**
 * Logical paths used by the admin panel. They are mapped to real
 * locations by each store, and nothing outside these roots is reachable.
 *   content/posts/<slug>.md, content/categories.json, content/settings.json
 *   uploads/<yyyy>/<name>.<ext>
 */
export type LogicalPath = `content/${string}` | `uploads/${string}`

export type StoredFile = { path: LogicalPath; content: Buffer; sha: string }
export type FileEntry = { path: LogicalPath; sha: string; size?: number }

export type Change =
  | { path: LogicalPath; content: string | Buffer; expectedSha?: string | null }
  | { path: LogicalPath; delete: true; expectedSha?: string }

export type CommitResult = { sha: string; url?: string }

export type ActivityEntry = {
  sha: string
  message: string
  author: string
  date: string
  url?: string
}

export interface ContentStore {
  readonly kind: 'github' | 'local'
  read(path: LogicalPath): Promise<StoredFile | null>
  list(dir: LogicalPath): Promise<FileEntry[]>
  /** Reads several files from one consistent snapshot. Missing files are omitted. */
  readMany(paths: LogicalPath[]): Promise<Map<LogicalPath, StoredFile>>
  /**
   * Applies every change in one commit. `expectedSha` gives optimistic
   * locking: undefined skips the check, null means "must not exist yet".
   */
  commit(changes: Change[], message: string): Promise<CommitResult>
  activity(limit: number): Promise<ActivityEntry[]>
}

export class ConflictError extends Error {}
export class StoreUnavailableError extends Error {}

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/

export function assertLogicalPath(p: string): asserts p is LogicalPath {
  const [root, ...rest] = p.split('/')
  if (root !== 'content' && root !== 'uploads') throw new Error(`Geçersiz yol kökü: ${p}`)
  if (rest.length === 0 || rest.some((s) => !SAFE_SEGMENT.test(s) || s.includes('..'))) {
    throw new Error(`Geçersiz yol: ${p}`)
  }
}
