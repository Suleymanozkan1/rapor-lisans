/**
 * Failed-login limiter. The default backend is in-memory, which on
 * serverless only limits per warm instance; set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN to share counters across instances (optional,
 * check the provider's current free quota first).
 */
export type LimitResult = { allowed: boolean; retryAfterSeconds: number }

type Bucket = { count: number; resetAt: number }
const memory = new Map<string, Bucket>()

export const LOGIN_LIMITS = {
  perIp: { max: 5, windowSeconds: 15 * 60 },
  perAccount: { max: 20, windowSeconds: 15 * 60 },
}

async function upstash(command: (string | number)[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    return ((await res.json()) as { result: unknown }[]).map((r) => r.result)
  } catch {
    return null
  }
}

function memoryCount(key: string, now: number): Bucket | undefined {
  const b = memory.get(key)
  if (b && b.resetAt <= now) {
    memory.delete(key)
    return undefined
  }
  return b
}

export async function checkLimit(key: string, max: number, now = Date.now()): Promise<LimitResult> {
  const remote = await upstash([
    ['GET', `rl:${key}`],
    ['TTL', `rl:${key}`],
  ])
  if (remote) {
    const count = Number(remote[0] ?? 0)
    const ttl = Number(remote[1] ?? 0)
    return { allowed: count < max, retryAfterSeconds: count < max ? 0 : Math.max(ttl, 1) }
  }
  const b = memoryCount(key, now)
  if (!b || b.count < max) return { allowed: true, retryAfterSeconds: 0 }
  return { allowed: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) }
}

export async function recordFailure(key: string, windowSeconds: number, now = Date.now()): Promise<void> {
  const remote = await upstash([
    ['INCR', `rl:${key}`],
    ['EXPIRE', `rl:${key}`, windowSeconds, 'NX'],
  ])
  if (remote) return
  if (memory.size > 10_000) memory.clear()
  const b = memoryCount(key, now)
  if (b) b.count += 1
  else memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
}

export async function resetLimit(key: string): Promise<void> {
  if (await upstash([['DEL', `rl:${key}`]])) return
  memory.delete(key)
}

export function __resetMemoryLimiter() {
  memory.clear()
}
