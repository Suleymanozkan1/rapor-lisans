/*
 * Builds preview page images for products sold as Word, Excel or PowerPoint
 * files (and for PDFs that have none yet). Run by the GitHub Actions job
 * .github/workflows/urun-onizleme.yml after content/products changes:
 *
 *   1. find products whose preview is missing or was made from another file,
 *   2. fetch the sold file from the site (the job proves who it is with the
 *      OpenID Connect token GitHub issues; see src/app/api/onizleme-kaynagi),
 *   3. convert it to PDF with LibreOffice (headless), render the first page
 *      and one random middle page, write the JPEGs to public/uploads and the
 *      page list to the product's front matter.
 *
 * The workflow then commits the result; Vercel deploys it like any edit.
 * Locally: PREVIEW_SOURCE_DIR=<private files folder> npx tsx scripts/urun-onizleme.ts
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { parseProductFile, serializeProduct } from '../src/lib/frontmatter'
import { previewImageRel, renderPdfPages } from '../src/lib/pdf-render'
import type { Product, ProductPreview } from '../src/lib/types'

const run = promisify(execFile)
const root = process.cwd()
const productsDir = path.resolve(root, process.env.CONTENT_DIR ?? 'content', 'products')
const uploadsDir = path.resolve(root, process.env.UPLOADS_DIR ?? 'public/uploads')

/** Formats LibreOffice turns into pages. ZIP archives have no pages to show. */
export const CONVERTIBLE = new Set(['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'])

const extOf = (name: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? '').toLowerCase()

export function needsPreview(p: Product): boolean {
  if (!p.file || p.previewDisabled) return false
  const ext = extOf(p.file.pathname)
  if (ext !== 'pdf' && !CONVERTIBLE.has(ext)) return false
  return !p.preview || p.preview.source.sha256 !== p.file.sha256
}

async function oidcToken(audience: string): Promise<string> {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const auth = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!url || !auth) throw new Error('OIDC belirteci alınamıyor: iş akışında "permissions: id-token: write" gerekli.')
  const res = await fetch(`${url}&audience=${encodeURIComponent(audience)}`, { headers: { Authorization: `bearer ${auth}` } })
  if (!res.ok) throw new Error(`OIDC belirteci alınamadı (${res.status})`)
  return ((await res.json()) as { value: string }).value
}

async function fetchSource(p: Product, token: string | null): Promise<Buffer> {
  const local = process.env.PREVIEW_SOURCE_DIR
  if (local) return readFile(path.join(local, p.file!.pathname))
  const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '')
  if (!site) throw new Error('SITE_URL tanımlı değil.')
  const res = await fetch(`${site}/api/onizleme-kaynagi/${p.slug}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`${p.slug}: dosya alınamadı (${res.status} ${await res.text().catch(() => '')})`)
  return Buffer.from(await res.arrayBuffer())
}

/** Converts an Office file to PDF with a throwaway LibreOffice profile (parallel runs would share a lock otherwise). */
export async function officeToPdf(data: Buffer, ext: string): Promise<Buffer> {
  const work = await mkdtemp(path.join(tmpdir(), 'onizleme-'))
  try {
    const input = path.join(work, `belge.${ext}`)
    await writeFile(input, data)
    const soffice = process.env.SOFFICE ?? 'soffice'
    await run(soffice, [`-env:UserInstallation=file://${path.join(work, 'profil')}`, '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', work, input], {
      timeout: 180_000,
      maxBuffer: 4 * 1024 * 1024,
    })
    const out = path.join(work, 'belge.pdf')
    if (!existsSync(out)) throw new Error('LibreOffice PDF üretmedi.')
    return await readFile(out)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

async function buildFor(p: Product, token: string | null): Promise<ProductPreview> {
  const file = p.file!
  const data = await fetchSource(p, token)
  const sha = createHash('sha256').update(data).digest('hex')
  // The site serves the file of the newest commit; if that is not the file this checkout describes, a later run handles it.
  if (file.sha256 && sha !== file.sha256) throw new Error(`${p.slug}: indirilen dosya bu sürümdekiyle aynı değil; sonraki çalıştırmaya bırakıldı.`)
  const ext = extOf(file.pathname)
  const pdf = ext === 'pdf' ? data : await officeToPdf(data, ext)
  const { total, images } = await renderPdfPages(pdf)
  const salt = Date.now().toString(36)
  const out = []
  for (const img of images) {
    const rel = previewImageRel(p.slug, sha, img.page, salt)
    await mkdir(path.dirname(path.join(uploadsDir, rel)), { recursive: true })
    await writeFile(path.join(uploadsDir, rel), img.jpeg)
    out.push({ src: `/uploads/${rel}`, page: img.page, width: img.width, height: img.height })
  }
  return { source: { pathname: file.pathname, sha256: sha }, pages: total, images: out }
}

export async function main(): Promise<number> {
  const names = (await readdir(productsDir)).filter((n) => n.endsWith('.md'))
  const todo: { product: Product; fileName: string }[] = []
  for (const n of names) {
    const product = parseProductFile(n.slice(0, -3), await readFile(path.join(productsDir, n), 'utf8'))
    if (needsPreview(product)) todo.push({ product, fileName: n })
  }
  if (todo.length === 0) {
    console.log('Önizlemesi eksik ürün yok.')
    return 0
  }
  const token = process.env.PREVIEW_SOURCE_DIR ? null : await oidcToken(process.env.PREVIEW_AUDIENCE ?? 'guvenli-calis-urun-onizleme')
  let done = 0
  let failed = 0
  for (const { product, fileName } of todo) {
    try {
      const preview = await buildFor(product, token)
      // Old images of this product go; their URLs are cached forever, so new ones get new names.
      for (const img of product.preview?.images ?? []) await rm(path.join(uploadsDir, img.src.replace(/^\/uploads\//, '')), { force: true })
      const { slug, body, ...fm } = product
      void slug
      await writeFile(path.join(productsDir, fileName), serializeProduct({ ...fm, preview }, body))
      console.log(`${product.slug}: ${preview.pages} sayfa, gösterilen: ${preview.images.map((i) => i.page).join(' ve ')}`)
      done++
    } catch (e) {
      console.error(`${product.slug}: ${(e as Error).message}`)
      failed++
    }
  }
  console.log(`Önizleme: ${done} hazır, ${failed} hata.`)
  return failed > 0 && done === 0 ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename ?? '')) {
  main().then((code) => process.exit(code), (e) => {
    console.error(e)
    process.exit(1)
  })
}
