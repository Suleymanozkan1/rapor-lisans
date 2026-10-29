#!/usr/bin/env node
// Builds and starts the site against a disposable copy of the test fixtures
// for Playwright. Uses a throwaway admin password; never real secrets.
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const work = path.join(root, '.e2e')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
cpSync(path.join(root, 'tests/fixtures/content'), path.join(work, 'content'), { recursive: true })
mkdirSync(path.join(work, 'uploads'), { recursive: true })

const password = 'e2e-test-parolasi-2026'
const salt = randomBytes(16)
const N = 2 ** 14
const hash = ['scrypt', N, 8, 1, salt.toString('base64url'), scryptSync(password, salt, 32, { N, r: 8, p: 1 }).toString('base64url')].join(':')
writeFileSync(path.join(work, 'credentials.json'), JSON.stringify({ username: 'yonetici', password }))

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_DIST_DIR: '.next-e2e',
  CONTENT_DIR: '.e2e/content',
  UPLOADS_DIR: '.e2e/uploads',
  CONTENT_STORE: 'local',
  E2E_LOCAL_STORE: '1',
  // Tests send X-Forwarded-For per test so login rate limits do not leak between tests.
  TRUST_PROXY: '1',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
  ADMIN_USERNAME: 'yonetici',
  ADMIN_PASSWORD_HASH: hash,
  SESSION_SECRET: randomBytes(32).toString('base64url'),
}
delete env.VERCEL
delete env.GITHUB_TOKEN

if (!process.env.E2E_SKIP_BUILD) {
  const b = spawnSync('npx', ['next', 'build'], { cwd: root, env, stdio: 'inherit' })
  if (b.status !== 0) process.exit(b.status ?? 1)
}
const server = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', '3100'], { cwd: root, env, stdio: 'inherit' })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig))
server.on('exit', (code) => process.exit(code ?? 0))
