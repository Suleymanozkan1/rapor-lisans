import { getAdminProduct } from '@/lib/admin-content'
import { githubConfig } from '@/lib/env'
import { openFile } from '@/lib/files'
import { OidcError, PREVIEW_AUDIENCE, PREVIEW_WORKFLOW, verifyGithubOidc } from '@/lib/github-oidc'
import { consume } from '@/lib/auth/rate-limit'
import { isValidSlug } from '@/lib/slug'

/*
 * Hands a product's sold file to the preview job (GitHub Actions,
 * .github/workflows/urun-onizleme.yml), which converts Word, Excel and
 * PowerPoint files to page images with LibreOffice. Only that workflow,
 * running on this repository's content branch, gets through: the caller
 * proves it with the OpenID Connect token GitHub issues to the run.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const deny = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request, ctx: RouteContext<'/api/onizleme-kaynagi/[slug]'>) {
  const gh = githubConfig()
  if (!gh) return deny(503, 'İçerik deposu yapılandırılmamış.')
  if (!(await consume('onizleme-kaynagi', 60, 60)).allowed) return deny(429, 'Çok fazla istek.')

  const auth = request.headers.get('authorization') ?? ''
  const token = /^Bearer (\S+)$/.exec(auth)?.[1]
  if (!token) return deny(401, 'Kimlik belirteci gerekli.')
  try {
    await verifyGithubOidc(token, { audience: PREVIEW_AUDIENCE, repository: `${gh.owner}/${gh.repo}`, branch: gh.branch, workflow: PREVIEW_WORKFLOW })
  } catch (e) {
    console.warn(JSON.stringify({ type: 'preview_source_refused', at: new Date().toISOString(), reason: e instanceof OidcError ? e.message : 'error' }))
    return deny(403, 'Yetkisiz.')
  }

  const { slug } = await ctx.params
  if (!isValidSlug(slug)) return deny(404, 'Ürün bulunamadı.')
  const product = await getAdminProduct(slug)
  if (!product?.file) return deny(404, 'Ürünün dosyası yok.')
  const f = await openFile(product.file.pathname)
  if (!f) return deny(404, 'Dosya depoda bulunamadı.')
  console.info(JSON.stringify({ type: 'preview_source_served', at: new Date().toISOString(), slug }))
  return new Response(f.stream, {
    headers: {
      'Content-Type': f.contentType,
      'Content-Length': String(f.size),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-File-Sha256': product.file.sha256 ?? '',
    },
  })
}
