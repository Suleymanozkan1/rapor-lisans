'use client'

import { useActionState } from 'react'
import { saveSettingsAction, type ActionState } from '@/app/admin/actions'
import type { Settings } from '@/lib/types'
import type { MediaItem } from '@/lib/media'
import { Csrf } from '@/components/admin/Csrf'
import { FormStatus } from '@/components/admin/FormStatus'

type Props = { csrf: string; settings: Settings; sha: string | null; media: MediaItem[] }

function Text({ id, label, value, max, type = 'text', help, required }: { id: string; label: string; value: string; max: number; type?: string; help?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} defaultValue={value} maxLength={max} required={required} aria-describedby={help ? `${id}-help` : undefined} />
      {help ? (
        <p id={`${id}-help`} className="field__help">
          {help}
        </p>
      ) : null}
    </div>
  )
}

function ImagePick({ id, label, media, value }: { id: string; label: string; media: MediaItem[]; value?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} defaultValue={value ?? ''}>
        <option value="">Yok</option>
        {media.map((m) => (
          <option key={m.src} value={m.src}>
            {m.alt} ({m.src.split('/').pop()})
          </option>
        ))}
      </select>
    </div>
  )
}

export function SettingsForm({ csrf, settings: s, sha, media }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, {})
  return (
    <form action={action} className="admin-form">
      <Csrf token={csrf} />
      <input type="hidden" name="sha" value={sha ?? ''} />
      <FormStatus state={state} />

      <fieldset id="site" className="admin-fieldset">
        <legend>Site</legend>
        <Text id="siteName" label="Site adı" value={s.siteName} max={80} required />
        <Text id="tagline" label="Alt başlık" value={s.tagline} max={160} help="Site adının altında görünür." />
        <div className="field">
          <label htmlFor="description">Site açıklaması (SEO)</label>
          <textarea id="description" name="description" rows={2} maxLength={170} defaultValue={s.description} />
        </div>
        <ImagePick id="logoSrc" label="Logo" media={media} value={s.logo?.src} />
        <Text id="logoAlt" label="Logo alt metni" value={s.logo?.alt ?? ''} max={300} />
        <ImagePick id="defaultOgImage" label="Varsayılan paylaşım görseli" media={media} value={s.seo.defaultOgImage} />
      </fieldset>

      <fieldset id="yazar" className="admin-fieldset">
        <legend>Yazar ve hakkımda</legend>
        <Text id="authorName" label="Ad soyad" value={s.author.name} max={80} required />
        <Text id="jobTitle" label="Unvan" value={s.author.jobTitle} max={120} help="Örneğin belgenize yazılı unvan ve sınıf." />
        <div className="field">
          <label htmlFor="shortBio">Kısa biyografi (ana sayfa)</label>
          <textarea id="shortBio" name="shortBio" rows={3} maxLength={400} defaultValue={s.author.shortBio} />
        </div>
        <div className="field">
          <label htmlFor="bio">Hakkımda metni (Markdown)</label>
          <textarea id="bio" name="bio" rows={10} maxLength={8000} defaultValue={s.author.bio} className="admin-code" />
        </div>
        <ImagePick id="photoSrc" label="Portre fotoğrafı" media={media} value={s.author.photo?.src} />
        <Text id="photoAlt" label="Portre alt metni" value={s.author.photo?.alt ?? ''} max={300} />
      </fieldset>

      <fieldset id="iletisim" className="admin-fieldset">
        <legend>İletişim</legend>
        <Text id="email" label="E-posta" type="email" value={s.contact.email} max={200} />
        <Text id="phone" label="Telefon" value={s.contact.phone} max={40} />
        <Text id="location" label="Konum" value={s.contact.location} max={120} help="Örneğin yalnızca şehir." />
        <div className="field">
          <label htmlFor="contactNote">İletişim notu</label>
          <textarea id="contactNote" name="contactNote" rows={3} maxLength={1000} defaultValue={s.contact.note} />
        </div>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Sosyal bağlantılar</legend>
        <Text id="linkedin" label="LinkedIn" type="url" value={s.social.linkedin} max={300} />
        <Text id="x" label="X" type="url" value={s.social.x} max={300} />
        <Text id="instagram" label="Instagram" type="url" value={s.social.instagram} max={300} />
        <Text id="youtube" label="YouTube" type="url" value={s.social.youtube} max={300} />
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Gizlilik</legend>
        <Text id="privacyController" label="Veri sorumlusu" value={s.privacy.controller} max={200} help="Boşsa yazar adı kullanılır." />
      </fieldset>

      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Ayarları kaydet'}
      </button>
    </form>
  )
}
