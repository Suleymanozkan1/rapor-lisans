import 'server-only'

/**
 * Minimal SQL interface shared by the production driver (Neon serverless,
 * Postgres over HTTP) and PGlite (Postgres compiled to WebAssembly) used for
 * local development and the e2e suite. Every statement is a single,
 * parameterised query; atomic state changes are single UPDATE ... WHERE
 * statements, so no multi-statement transactions are needed.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>
}

export type OrderDbKind = 'postgres' | 'pglite' | 'none'

export function orderDbKind(): OrderDbKind {
  if (process.env.DATABASE_URL) return 'postgres'
  // PGlite keeps data in a local folder: never on Vercel, and in a production
  // build only for the e2e suite's disposable copy.
  if (process.env.ORDER_DB === 'pglite' && !process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production' || process.env.E2E_LOCAL_STORE === '1') return 'pglite'
  }
  return 'none'
}

export class OrderDbUnavailableError extends Error {
  constructor() {
    super('Sipariş veritabanı yapılandırılmamış (DATABASE_URL).')
  }
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY,
    order_no text UNIQUE NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    product_slug text NOT NULL,
    product_title text NOT NULL,
    file_pathname text NOT NULL,
    file_name text NOT NULL,
    amount_kurus integer NOT NULL CHECK (amount_kurus > 0),
    currency text NOT NULL DEFAULT 'TRY',
    buyer_name text NOT NULL,
    buyer_surname text NOT NULL,
    buyer_email text NOT NULL,
    buyer_phone text NOT NULL,
    buyer_city text NOT NULL,
    buyer_address text NOT NULL,
    buyer_ip text NOT NULL,
    contract_version text NOT NULL,
    contract_text text NOT NULL,
    consent_at timestamptz NOT NULL,
    provider_token text UNIQUE,
    payment_id text,
    failure_reason text,
    download_version integer NOT NULL DEFAULT 1,
    download_count integer NOT NULL DEFAULT 0,
    download_limit integer NOT NULL DEFAULT 5,
    download_expires_at timestamptz,
    email_sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id bigserial PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    at timestamptz NOT NULL DEFAULT now(),
    type text NOT NULL,
    detail jsonb NOT NULL DEFAULT '{}'::jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, at)`,
  // Proof of what was delivered (MSY m. 20/3) and the e-Arşiv invoice number.
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS file_sha256 text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_no text`,
]

export async function migrate(db: Db) {
  for (const statement of MIGRATIONS) await db.query(statement)
}

async function connect(kind: OrderDbKind): Promise<Db> {
  if (kind === 'postgres') {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL!)
    return { query: async (text, params = []) => (await sql.query(text, params)) as never }
  }
  if (kind === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite')
    const pg = new PGlite(process.env.ORDER_DB_DIR || undefined)
    return { query: async (text, params = []) => (await pg.query(text, params)).rows as never }
  }
  throw new OrderDbUnavailableError()
}

// Kept on globalThis: Next.js bundles routes separately, and module-level
// state is not shared between bundles. Two PGlite instances on one data
// folder would not see each other's writes.
const g = globalThis as typeof globalThis & { __orderDb?: Promise<Db> | null }

/** One connection (and one migration run) per server process. */
export function getDb(): Promise<Db> {
  const kind = orderDbKind()
  if (kind === 'none') return Promise.reject(new OrderDbUnavailableError())
  if (!g.__orderDb) {
    const p = connect(kind).then(async (db) => {
      await migrate(db)
      return db
    })
    g.__orderDb = p
    p.catch(() => {
      if (g.__orderDb === p) g.__orderDb = null
    })
  }
  return g.__orderDb
}
