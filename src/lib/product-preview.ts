import 'server-only'
import { openFile } from './files'
import { PreviewError, previewImageRel, renderPdfPages } from './pdf-render'
import { MAX_PRODUCT_FILE_BYTES, type ProductPreview } from './types'
import type { Change, LogicalPath } from './store'

/*
 * Turns preview pages of a product PDF into public JPEG files committed next
 * to the content (rendering itself: ./pdf-render).
 */

export { PreviewError, renderPdfPages }

/** Reads a private file fully into memory (the size is capped by the upload limit). */
export async function readPrivateFile(pathname: string): Promise<Buffer> {
  const f = await openFile(pathname)
  if (!f) throw new PreviewError('Önizleme dosyası depoda bulunamadı.')
  if (f.size > MAX_PRODUCT_FILE_BYTES) throw new PreviewError('Önizleme dosyası çok büyük.')
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = f.stream.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_PRODUCT_FILE_BYTES) {
      await reader.cancel().catch(() => {})
      throw new PreviewError('Önizleme dosyası çok büyük.')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/** Repository path and public URL of a preview image. The hash keeps URLs unique, since /uploads is cached forever. */
function previewImagePath(slug: string, sourceSha: string, page: number, salt: string) {
  const rel = previewImageRel(slug, sourceSha, page, salt)
  return { logical: `uploads/${rel}` as LogicalPath, src: `/uploads/${rel}` }
}

export function previewFileChanges(preview: ProductPreview | undefined): Change[] {
  return (preview?.images ?? []).map((i) => ({ path: i.src.replace(/^\/uploads\//, 'uploads/') as LogicalPath, delete: true as const }))
}

/**
 * Builds a new preview from a private PDF: the commit changes that add the
 * images (and remove the previous ones) plus the frontmatter to store.
 */
export async function buildPreview(opts: {
  slug: string
  source: { pathname: string; sha256: string }
  previous?: ProductPreview
}): Promise<{ preview: ProductPreview; changes: Change[] }> {
  const data = await readPrivateFile(opts.source.pathname)
  const { total, images } = await renderPdfPages(data)
  const salt = Date.now().toString(36)
  const added = images.map((img) => ({ img, ...previewImagePath(opts.slug, opts.source.sha256, img.page, salt) }))
  const changes: Change[] = [...added.map((a) => ({ path: a.logical, content: a.img.jpeg, expectedSha: null })), ...previewFileChanges(opts.previous)]
  return {
    preview: {
      source: opts.source,
      pages: total,
      images: added.map((a) => ({ src: a.src, page: a.img.page, width: a.img.width, height: a.img.height })),
    },
    changes,
  }
}
