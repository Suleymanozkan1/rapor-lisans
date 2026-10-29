import 'server-only'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/*
 * Transactional e-mail (order confirmation with the contract and the
 * download link). Production: Resend's HTTP API (RESEND_API_KEY, MAIL_FROM
 * on a verified domain). e2e: messages are written to MAIL_OUTBOX_DIR.
 */

export type Mail = { to: string; subject: string; text: string; replyTo?: string }

export function mailConfigured(): boolean {
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) return true
  return Boolean(process.env.MAIL_OUTBOX_DIR && process.env.E2E_LOCAL_STORE === '1' && !process.env.VERCEL)
}

export async function sendMail(m: Mail): Promise<void> {
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text, reply_to: m.replyTo || undefined }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`E-posta gönderilemedi (HTTP ${res.status}).`)
    return
  }
  if (mailConfigured()) {
    const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.MAIL_OUTBOX_DIR!)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(m, null, 2))
    return
  }
  throw new Error('E-posta gönderimi yapılandırılmamış.')
}
