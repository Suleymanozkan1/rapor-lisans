import 'server-only'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { openFile } from './files'
import { pickPreviewPages } from './preview-pages'
import { MAX_PRODUCT_FILE_BYTES, type ProductPreview } from './types'
import type { Change, LogicalPath } from './store'

/*
 * Renders preview pages of a product PDF on the server (pdf.js + Skia canvas)
 * and turns them into public JPEG files committed next to the content.
 */

export class PreviewError extends Error {}

/** Rendered width in pixels: sharp at roughly 550 CSS px on 2x screens. */
const TARGET_WIDTH = 1100
const MAX_HEIGHT = 8000
const JPEG_QUALITY = 82

type Rendered = { page: number; width: number; height: number; jpeg: Buffer }

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

const pdfAsset = (dir: string) => path.join(process.cwd(), 'node_modules', 'pdfjs-dist', dir) + path.sep

/** Renders the chosen pages (or a fresh pick of first + random middle page) to JPEG. */
export async function renderPdfPages(data: Uint8Array, choose: (total: number) => number[] = pickPreviewPages): Promise<{ total: number; images: Rendered[] }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Run pdf.js's worker code in this process; there is no Worker thread on the server.
  const g = globalThis as { pdfjsWorker?: unknown }
  g.pdfjsWorker ??= await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  const { createCanvas } = await import('@napi-rs/canvas')

  const task = pdfjs.getDocument({
      // pdf.js may transfer (detach) the buffer it is given, so it gets a copy.
    data: new Uint8Array(data),
    enableXfa: false,
    standardFontDataUrl: pdfAsset('standard_fonts'),
    cMapUrl: pdfAsset('cmaps'),
    cMapPacked: true,
    wasmUrl: pdfAsset('wasm'),
    verbosity: 0,
  })
  let doc
  try {
    doc = await task.promise
  } catch (e) {
    await task.destroy().catch(() => {})
    const name = (e as Error)?.name
    if (name === 'PasswordException') throw new PreviewError('PDF parola korumalı; önizleme oluşturulamadı. Parolasız bir PDF yükleyin.')
    throw new PreviewError('PDF okunamadı; dosya bozuk olabilir.')
  }

  try {
    const total = doc.numPages
    const images: Rendered[] = []
    for (const n of choose(total)) {
      const page = await doc.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(TARGET_WIDTH / base.width, MAX_HEIGHT / base.height)
      const viewport = page.getViewport({ scale })
      const width = Math.round(viewport.width)
      const height = Math.round(viewport.height)
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')
      // PDF pages are transparent; JPEG needs a paper-white background.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise
      images.push({ page: n, width, height, jpeg: await canvas.encode('jpeg', JPEG_QUALITY) })
      page.cleanup()
    }
    return { total, images }
  } finally {
    await task.destroy()
  }
}

/** Repository path and public URL of a preview image. The hash keeps URLs unique, since /uploads is cached forever. */
function previewImagePath(slug: string, sourceSha: string, page: number, salt: string) {
  const id = createHash('sha256').update(`${sourceSha}:${page}:${salt}`).digest('hex').slice(0, 10)
  const rel = `urunler/${slug}/onizleme-${page}-${id}.jpg`
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
