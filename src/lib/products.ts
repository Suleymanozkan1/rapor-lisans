import type { Product } from './types'

/** Listing order: the manual `order` field first, then newest first. */
export function sortProducts<T extends Pick<Product, 'order' | 'createdAt'>>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || b.createdAt.localeCompare(a.createdAt))
}

const whole = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "₺149", "₺89,90"; undefined when the price is only on Shopier. */
export function formatPrice(price: number | undefined): string | undefined {
  if (price === undefined) return undefined
  return Number.isInteger(price) ? whole.format(price) : cents.format(price)
}

/** Admin input "149", "149,90" or "149.90" in lira. Empty: price only on Shopier (undefined). Invalid: null. */
export function parsePrice(raw: string): number | undefined | null {
  const v = raw.trim()
  if (!v) return undefined
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(v)) return null
  return Math.round(Number(v.replace(',', '.')) * 100) / 100
}
