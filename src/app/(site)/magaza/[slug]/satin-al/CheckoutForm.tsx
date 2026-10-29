'use client'

import { useActionState, useMemo, useState } from 'react'
import { LockSimple } from '@phosphor-icons/react'
import { checkoutAction, type CheckoutState } from './actions'
import { buildContract, type ContractInput } from '@/lib/legal'
import { CONSENTS, normalizePhone } from '@/lib/checkout'
import { keepValuesOnSubmit } from '@/components/admin/keepValues'

type Props = { slug: string; priceLabel: string; contract: Omit<ContractInput, 'buyer' | 'date'>; dateIso: string }

const FIELDS = [
  { id: 'name', label: 'Ad', autoComplete: 'given-name', type: 'text' },
  { id: 'surname', label: 'Soyad', autoComplete: 'family-name', type: 'text' },
  { id: 'email', label: 'E-posta', autoComplete: 'email', type: 'email', help: 'İndirme bağlantısı ve sözleşme bu adrese gönderilir.' },
  { id: 'phone', label: 'Cep telefonu', autoComplete: 'tel', type: 'tel', help: 'Ödeme sağlayıcısı için gereklidir.' },
  { id: 'city', label: 'İl', autoComplete: 'address-level1', type: 'text' },
] as const

export function CheckoutForm({ slug, priceLabel, contract, dateIso }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, {})
  const [buyer, setBuyer] = useState({ name: '', surname: '', email: '', phone: '', city: '', address: '' })
  const set = (k: keyof typeof buyer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setBuyer((b) => ({ ...b, [k]: e.target.value }))
  // Live preview of exactly the text the server will store for this order.
  const preview = useMemo(
    () => buildContract({ ...contract, buyer: { ...buyer, phone: normalizePhone(buyer.phone) ?? buyer.phone }, date: new Date(dateIso) }).text,
    [contract, buyer, dateIso],
  )
  const [preInfo, agreement] = preview.split('\n\n\nMESAFELİ SATIŞ SÖZLEŞMESİ\n')
  const err = (k: string) => state.fields?.[k]

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="checkout" noValidate>
      <input type="hidden" name="slug" value={slug} />
      {state.error ? (
        <div className="notice notice--danger" role="alert">
          <p>{state.error}</p>
        </div>
      ) : null}

      <fieldset className="checkout__section">
        <legend>Fatura bilgileri</legend>
        <div className="checkout__grid">
          {FIELDS.map((f) => (
            <div className="field" key={f.id}>
              <label htmlFor={f.id}>{f.label}</label>
              <input
                id={f.id}
                name={f.id}
                type={f.type}
                autoComplete={f.autoComplete}
                required
                value={buyer[f.id]}
                onChange={set(f.id)}
                aria-invalid={Boolean(err(f.id))}
                aria-describedby={err(f.id) || ('help' in f && f.help) ? `${f.id}-msg` : undefined}
              />
              {err(f.id) ? (
                <p id={`${f.id}-msg`} className="field__error">
                  {err(f.id)}
                </p>
              ) : 'help' in f && f.help ? (
                <p id={`${f.id}-msg`} className="field__help">
                  {f.help}
                </p>
              ) : null}
            </div>
          ))}
          <div className="field checkout__wide">
            <label htmlFor="address">Açık adres</label>
            <textarea id="address" name="address" rows={3} required autoComplete="street-address" value={buyer.address} onChange={set('address')} aria-invalid={Boolean(err('address'))} aria-describedby="address-msg" />
            <p id="address-msg" className={err('address') ? 'field__error' : 'field__help'}>
              {err('address') ?? 'Fatura için gereklidir.'}
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="checkout__section">
        <legend>Sözleşme ve onaylar</legend>
        <details className="checkout__doc" open>
          <summary>Ön bilgilendirme formu</summary>
          <pre tabIndex={0}>{preInfo}</pre>
        </details>
        <details className="checkout__doc">
          <summary>Mesafeli satış sözleşmesi</summary>
          <pre tabIndex={0}>{`MESAFELİ SATIŞ SÖZLEŞMESİ\n${agreement ?? ''}`}</pre>
        </details>
        {(Object.keys(CONSENTS) as (keyof typeof CONSENTS)[]).map((k) => (
          <label key={k} className={`choice checkout__consent${err(k) ? ' checkout__consent--error' : ''}`}>
            <input type="checkbox" name={k} required aria-invalid={Boolean(err(k))} /> {CONSENTS[k]}
          </label>
        ))}
        <p className="field__help">
          Kişisel verileriniz <a href="/gizlilik" target="_blank">aydınlatma metnine</a> uygun olarak işlenir.
        </p>
      </fieldset>

      {/* MSY m. 6/2: the essentials, shown together right before the payment obligation. */}
      <section className="checkout__pay" aria-labelledby="summary-title">
        <h2 id="summary-title">Sipariş özeti</h2>
        <dl className="checkout__summary">
          <div>
            <dt>Ürün</dt>
            <dd>
              {contract.product.title}
              {contract.product.format ? `, ${contract.product.format}` : ''} (indirilebilir dijital dosya)
            </dd>
          </div>
          <div>
            <dt>Toplam tutar</dt>
            <dd>
              <strong>{priceLabel}</strong> (KDV dahil, ek ücret yok)
            </dd>
          </div>
          <div>
            <dt>Ödeme</dt>
            <dd>Kredi veya banka kartı, tek çekim (iyzico güvenli ödeme sayfası)</dd>
          </div>
          <div>
            <dt>Teslimat</dt>
            <dd>Ödeme onaylanınca hemen: sipariş sayfasından indirme, bağlantı e-postayla</dd>
          </div>
          <div>
            <dt>Cayma hakkı</dt>
            <dd>Anında teslim edilen dijital içerik olduğundan cayma hakkı yoktur (Mesafeli Sözleşmeler Yönetmeliği m. 15/1-ğ).</dd>
          </div>
        </dl>
        <p className="checkout__obligation">“Onayla ve öde” düğmesine bastığınızda ödeme yükümlülüğü altına girersiniz. Ardından iyzico’nun güvenli ödeme sayfasına yönlendirilirsiniz.</p>
        <button className="button buy-box__button" type="submit" disabled={pending}>
          <LockSimple size={20} weight="bold" aria-hidden="true" />
          {pending ? 'Ödeme sayfası açılıyor…' : 'Onayla ve öde'}
        </button>
      </section>
    </form>
  )
}
