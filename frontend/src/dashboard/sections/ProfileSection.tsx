import { Check, Loader2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateSession, useSession } from '@/auth'
import {
  getProfile,
  getReference,
  saveProfile,
  type ProfileFields,
  type Reference,
} from '@/lib/api'

const EMPTY: ProfileFields = {
  first_name: '',
  last_name: '',
  job_title: '',
  phone: '',
  avatar_url: '',
  country: null,
  timezone: null,
}

const FIELD =
  'mt-1.5 h-11 w-full rounded-xl border border-line bg-sand px-3 text-[0.95rem] text-ink outline-none transition focus:border-gold focus:bg-white'

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">{children}</span>
}

/** Where a person edits what the rest of the site calls them. */
export function ProfileSection() {
  const session = useSession()
  const [fields, setFields] = useState<ProfileFields>(EMPTY)
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState<Reference | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'saved'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([getProfile(), getReference().catch(() => null)])
      .then(([payload, catalogue]) => {
        if (!live) return
        setFields({ ...EMPTY, ...payload.profile })
        setEmail(payload.email)
        setReference(catalogue)
        setState('ready')
      })
      .catch(() => {
        if (live) {
          setError('Your details could not be loaded. Reload the page to try again.')
          setState('ready')
        }
      })
    return () => {
      live = false
    }
  }, [])

  function set<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    setState((current) => (current === 'saved' ? 'ready' : current))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setState('saving')
    setError(null)
    try {
      const payload = await saveProfile(fields)
      setFields({ ...EMPTY, ...payload.profile })
      // The rail shows the name and title, so it updates with this.
      updateSession(payload)
      setState('saved')
    } catch {
      setError('Your details could not be saved. Try again in a moment.')
      setState('ready')
    }
  }

  const person = session.status === 'signedIn' ? session.person : null
  const shown = [fields.first_name, fields.last_name].filter(Boolean).join(' ')

  if (state === 'loading') {
    return <p className="text-sm text-ink-muted">Loading your details…</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-5">
        <span
          aria-hidden="true"
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-gold text-xl font-bold text-teal-deep"
        >
          {shown ? shown.slice(0, 1).toUpperCase() : <UserRound className="size-7" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-teal-deep">
            {shown || person?.username}
          </p>
          <p className="truncate text-sm text-ink-muted">{email}</p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-unverified-soft px-3 py-2 text-sm font-medium text-gold-dark"
        >
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <Label>First name</Label>
            <input
              className={FIELD}
              value={fields.first_name}
              maxLength={120}
              onChange={(e) => set('first_name', e.target.value)}
            />
          </label>
          <label className="block">
            <Label>Last name</Label>
            <input
              className={FIELD}
              value={fields.last_name}
              maxLength={120}
              onChange={(e) => set('last_name', e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <Label>Job title</Label>
          <input
            className={FIELD}
            value={fields.job_title}
            maxLength={120}
            placeholder={person?.title}
            onChange={(e) => set('job_title', e.target.value)}
          />
          <span className="mt-1.5 block text-xs text-ink-soft">
            Shown under your name in the side rail. Left empty, it shows the role you hold.
          </span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <Label>Phone</Label>
            <input
              className={FIELD}
              value={fields.phone}
              maxLength={32}
              inputMode="tel"
              onChange={(e) => set('phone', e.target.value)}
            />
          </label>
          <label className="block">
            <Label>Country</Label>
            <select
              className={FIELD}
              value={fields.country ?? ''}
              onChange={(e) => set('country', e.target.value || null)}
            >
              <option value="">Not set</option>
              {reference?.countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <Label>Time zone</Label>
          <select
            className={FIELD}
            value={fields.timezone ?? ''}
            onChange={(e) => set('timezone', e.target.value || null)}
          >
            <option value="">Not set</option>
            {reference?.timezones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Label>Avatar image URL</Label>
          <input
            className={FIELD}
            value={fields.avatar_url}
            type="url"
            placeholder="https://"
            onChange={(e) => set('avatar_url', e.target.value)}
          />
        </label>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={state === 'saving'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-6 text-[0.95rem] font-bold text-gold-dark transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-70"
          >
            {state === 'saving' && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>
          {state === 'saved' && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-verified">
              <Check className="size-4" />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
