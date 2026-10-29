# Architecture (security audit, source ref 5487d76)

Target: /home/user/rapor-lisans — Next.js 16.4 App Router app (TypeScript), deployed to Vercel Hobby.

## Components
- Public site (src/app/(site)/**, sitemap.ts, robots.ts, rss.xml/route.ts, search-index.json/route.ts): statically
  generated at build time from repository files under content/ (Markdown posts with YAML front matter, JSON settings,
  categories, media index). Visibility filter: src/lib/posts.ts isPublic(). Markdown -> HTML: src/lib/markdown.ts
  (remark/rehype, rehype-sanitize). Rendered with dangerouslySetInnerHTML in src/components/site/ArticleView.tsx and
  hakkimda page. JSON-LD via src/lib/seo.ts jsonLd(). Client search in src/app/(site)/ara/SearchClient.tsx.
- Admin panel (src/app/admin/**): request-time rendered. src/proxy.ts (Next 16 "proxy", formerly middleware) checks only
  cookie presence for /admin/*. Real checks: src/lib/auth/guard.ts requireAdmin() in each page/layout,
  requireAdminAction(formData) in every Server Action in src/app/admin/actions.ts (session + per-session CSRF token +
  Origin/Host compare). Login/logout: src/app/admin/login-actions.ts.
- Auth primitives: src/lib/auth/password.ts (scrypt), session.ts (HMAC-SHA256 stateless token, 8h, version claim; CSRF
  token = HMAC(sid)), rate-limit.ts (in-memory or optional Upstash REST), cookie.ts (__Host- prefixed cookie in prod).
- Config/secrets: src/lib/env.ts — ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SESSION_SECRET (>=32 chars), SESSION_VERSION,
  GITHUB_TOKEN/OWNER/REPO/BRANCH/CONTENT_PATH/UPLOADS_PATH, CONTENT_STORE, CONTENT_DIR, UPLOADS_DIR, UPSTASH_*.
- Content store (src/lib/store/**): ContentStore interface; LocalStore (dev only, writes to working tree; refused when
  VERCEL is set) and GithubStore (GitHub REST Git Data API: blobs/trees/commits/refs, optimistic locking by blob SHA).
  Logical path validation: src/lib/store/types.ts assertLogicalPath(). Admin service: src/lib/admin-content.ts.
- Uploads: src/lib/upload.ts (magic-byte sniff, extension/MIME agreement, size 3 MB, dimension limit via image-size),
  committed under public/uploads/<year>/ and indexed in content/media.json.
- Security headers / CSP: next.config.ts headers().

## Trust boundaries
1. Anonymous internet visitor -> public static pages and static JSON/XML (no cookies, no forms).
2. Anonymous visitor -> /admin/* pages and Server Action POST endpoints (any action ID can be POSTed directly).
3. Authenticated single admin -> content store (GitHub repo write via server-held fine-grained token).
4. Admin-authored content (Markdown/YAML/JSON, uploaded files) -> every public visitor's browser (stored XSS boundary).
5. Server -> GitHub API (token confidentiality, path confinement inside the repo).
6. Build pipeline: repository content -> static output (drafts must never be emitted).

## Not in source / deployment facts
Vercel sets x-forwarded-for; HSTS/TLS at Vercel edge; GitHub token scopes chosen by owner; repo visibility (currently a
PUBLIC GitHub repo: drafts committed to it are visible on GitHub).
