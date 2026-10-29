import type { OrderStatus } from './repo'

export const STATUS_LABEL: Record<OrderStatus, string> = { pending: 'Bekliyor', paid: 'Ödendi', failed: 'Başarısız', refunded: 'İade edildi' }
