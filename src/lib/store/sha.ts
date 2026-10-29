import { createHash } from 'node:crypto'

/** Same id git uses for a blob, so local and GitHub stores agree on file versions. */
export function gitBlobSha(content: Buffer): string {
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
}
