import { createHash } from 'node:crypto'
import path from 'node:path'
import { pickPreviewPages } from './preview-pages'

/*
 * Renders pages of a PDF to JPEG with pdf.js and Skia (@napi-rs/canvas).
 * Shared by the server (product saves) and scripts/urun-onizleme.ts (the
 * GitHub Actions job that converts Word, Excel and PowerPoint files).
 */

export class PreviewError extends Error {}

/** Rendered width in pixels: sharp at roughly 550 CSS px on 2x screens. */
const TARGET_WIDTH = 1100
const MAX_HEIGHT = 8000
const JPEG_QUALITY = 82

export type Rendered = { page: number; width: number; height: number; jpeg: Buffer }

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

/** File name of a preview image. The hash keeps URLs unique, since /uploads is cached forever. */
export function previewImageRel(slug: string, sourceSha: string, page: number, salt: string): string {
  const id = createHash('sha256').update(`${sourceSha}:${page}:${salt}`).digest('hex').slice(0, 10)
  return `urunler/${slug}/onizleme-${page}-${id}.jpg`
}
