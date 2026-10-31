import 'server-only'
import { LocalStore } from './local'
import {
  StoreUnavailableError,
  type ActivityEntry,
  type CommitResult,
  type ContentStore,
  type FileEntry,
  type LogicalPath,
  type StoredFile,
} from './types'

/**
 * Used when no writable store is configured (e.g. GITHUB_TOKEN missing on
 * Vercel). The panel can still show the content that shipped with the
 * deployment, but every save is refused with a message naming what to set.
 */
export class ReadOnlyStore implements ContentStore {
  readonly kind = 'readonly' as const
  private readonly source = new LocalStore()

  constructor(private readonly reason: string) {}

  read(p: LogicalPath): Promise<StoredFile | null> {
    return this.source.read(p)
  }

  readMany(paths: LogicalPath[]): Promise<Map<LogicalPath, StoredFile>> {
    return this.source.readMany(paths)
  }

  list(dir: LogicalPath): Promise<FileEntry[]> {
    return this.source.list(dir)
  }

  async commit(): Promise<CommitResult> {
    throw new StoreUnavailableError(this.reason)
  }

  async activity(): Promise<ActivityEntry[]> {
    return []
  }
}
