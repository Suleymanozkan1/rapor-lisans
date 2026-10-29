import { StoreUnavailableError } from './store'

/** Loads admin data, turning store failures into a message the page can show. */
export async function safeLoad<T>(fn: () => Promise<T>): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  try {
    return { data: await fn() }
  } catch (e) {
    if (e instanceof StoreUnavailableError) return { error: e.message }
    console.error(JSON.stringify({ type: 'admin_load_error', at: new Date().toISOString(), name: (e as Error)?.name, message: (e as Error)?.message }))
    return { error: 'İçerik okunamadı. Ayrıntılar sunucu kayıtlarında.' }
  }
}
