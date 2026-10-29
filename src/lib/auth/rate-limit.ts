/**
 * Login attempt limiter. Each attempt reserves a slot atomically *before*
 * the slow password hash runs, so concurrent bursts cannot exceed the limit.
 *
 * The default backend is in-memory, which on serverless only limits per warm
 * instance; set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to share
 * counters across instances (optional, check the provider's current free
 * quota first).
 */
export type LimitResult = { allowed: boolean; retryAfterSeconds: number }

type Bucket = { count: number; resetAt: number }
const memory = new Map<string, Bucket>()
const MAX_KEYS = 10_000

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
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return ((await res.json()) as { result: unknown }[]).map((r) => r.result)
  } catch (e) {
    // Falls back to the per-instance limiter; say so in the logs instead of failing silently.
    console.warn(JSON.stringify({ type: 'rate_limit_backend_unavailable', at: new Date().toISOString(), error: (e as Error).name }))
    return null
  }
}

/** Evicts expired buckets first, then the oldest per-IP buckets; never account buckets. */
function makeRoom(now: number) {
  if (memory.size < MAX_KEYS) return
  for (const [k, b] of memory) if (b.resetAt <= now) memory.delete(k)
  for (const k of memory.keys()) {
    if (memory.size < MAX_KEYS) break
    if (k.startsWith('login:ip:')) memory.delete(k)
  }
}

/** Atomically counts one attempt and reports whether it is within `max` for the window. */
export async function consume(key: string, max: number, windowSeconds: number, now = Date.now()): Promise<LimitResult> {
  const remote = await upstash([
    ['INCR', `rl:${key}`],
    ['EXPIRE', `rl:${key}`, windowSeconds, 'NX'],
    ['TTL', `rl:${key}`],
  ])
  if (remote) {
    const count = Number(remote[0] ?? 0)
    const ttl = Number(remote[2] ?? windowSeconds)
    return { allowed: count <= max, retryAfterSeconds: count <= max ? 0 : Math.max(ttl, 1) }
  }
  // No await between read and write: this block is atomic within the instance.
  let b = memory.get(key)
  if (b && b.resetAt <= now) {
    memory.delete(key)
    b = undefined
  }
  if (!b) {
    makeRoom(now)
    b = { count: 0, resetAt: now + windowSeconds * 1000 }
    memory.set(key, b)
  }
  b.count += 1
  return { allowed: b.count <= max, retryAfterSeconds: b.count <= max ? 0 : Math.ceil((b.resetAt - now) / 1000) }
}

export async function resetLimit(key: string): Promise<void> {
  if (await upstash([['DEL', `rl:${key}`]])) return
  memory.delete(key)
}

export function __resetMemoryLimiter() {
  memory.clear()
}

export function __memorySize() {
  return memory.size
}
