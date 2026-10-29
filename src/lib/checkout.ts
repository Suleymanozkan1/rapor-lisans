import { z } from 'zod'

/** Turkish mobile or landline in any common spelling -> "+90XXXXXXXXXX" (iyzico wants +90). */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s()./-]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('0090')) d = d.slice(2)
  if (d.startsWith('90') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return /^[2-5]\d{9}$/.test(d) ? `+90${d}` : null
}

const personName = z
  .string()
  .trim()
  .min(2, 'En az 2 harf')
  .max(60)
  .regex(/^[\p{L}][\p{L} .'-]*$/u, 'Yalnızca harf kullanın')

export const buyerSchema = z.object({
  name: personName,
  surname: personName,
  email: z.email('Geçerli bir e-posta adresi girin').trim().max(100),
  phone: z
    .string()
    .transform((v, ctx) => {
      const p = normalizePhone(v)
      if (!p) ctx.addIssue({ code: 'custom', message: 'Türkiye telefon numarası girin (örn. 0555 111 22 33)' })
      return p ?? ''
    }),
  city: z.string().trim().min(2, 'İl girin').max(40),
  address: z.string().trim().min(10, 'Fatura için açık adres girin').max(300),
})

export type BuyerFields = z.infer<typeof buyerSchema>

export const CONSENTS = {
  preInfo: 'Ön bilgilendirme formunu okudum ve onaylıyorum.',
  contract: 'Mesafeli satış sözleşmesini okudum ve kabul ediyorum.',
  digital: 'Dijital içeriğin onayımla hemen teslim edilmesini istiyorum. Teslimattan sonra cayma hakkımı kullanamayacağımı biliyorum.',
} as const
