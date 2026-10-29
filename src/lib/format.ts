const TZ = 'Europe/Istanbul'

export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(iso))
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
}

/** yyyy-mm-dd in Istanbul time, for <input type="date"> and <time dateTime>. */
export function isoDay(iso: string | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
}
