const MESSAGES: Record<string, { kind: 'ok' | 'warn' | 'danger'; text: string }> = {
  kaydedildi: { kind: 'ok', text: 'Kaydedildi.' },
  yayinlandi: { kind: 'ok', text: 'Yazı yayına alındı. Site bir sonraki dağıtımla güncellenir.' },
  kaldirildi: { kind: 'ok', text: 'Yazı yayından kaldırıldı ve taslağa döndü.' },
  silindi: { kind: 'ok', text: 'Yazı silindi.' },
  'kategori-eklendi': { kind: 'ok', text: 'Kategori eklendi.' },
  'kategori-guncellendi': { kind: 'ok', text: 'Kategori güncellendi.' },
  'kategori-silindi': { kind: 'ok', text: 'Kategori silindi.' },
  'etiket-adlandirildi': { kind: 'ok', text: 'Etiket tüm yazılarda yeniden adlandırıldı.' },
  'etiket-kaldirildi': { kind: 'ok', text: 'Etiket tüm yazılardan kaldırıldı.' },
  'ayarlar-kaydedildi': { kind: 'ok', text: 'Ayarlar kaydedildi. Değişiklikler bir sonraki dağıtımla sitede görünür.' },
  'gorsel-yuklendi': { kind: 'ok', text: 'Görsel yüklendi. Sitede bir sonraki dağıtımdan sonra görünür.' },
  'gorsel-silindi': { kind: 'ok', text: 'Görsel silindi.' },
  cakisma: { kind: 'danger', text: 'İşlem yapılamadı: içerik başka bir oturumda değişmiş veya depoya ulaşılamadı. Sayfayı yenileyin.' },
}

/** Shows a fixed message for a known ?durum= value; unknown values are ignored (no reflected text). */
export function StatusBanner({ code }: { code?: string | string[] }) {
  const m = typeof code === 'string' ? MESSAGES[code] : undefined
  if (!m) return null
  return (
    <div className={`notice notice--${m.kind}`} role={m.kind === 'danger' ? 'alert' : 'status'}>
      <p>{m.text}</p>
    </div>
  )
}
