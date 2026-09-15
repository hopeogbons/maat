import { KeyRound, Loader2, LockKeyhole, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { lockScroll } from './scrollLock'
import { useLanguage } from '@/i18n'
import { ApiError } from '@/lib/api'
import { signIn, type Person } from './session'

interface SignInDialogProps {
  open: boolean
  onClose: () => void
  onSignedIn?: (person: Person) => void
  /** Shown above the form, e.g. when a protected page sent them here. */
  note?: string
}

/**
 * The one way into the dashboard: a small modal, never a page of its own.
 * The panel is mounted only while open, so nothing typed survives a close.
 */
export function SignInDialog({ open, onClose, onSignedIn, note }: SignInDialogProps) {
  if (!open) return null
  return <SignInPanel onClose={onClose} onSignedIn={onSignedIn} note={note} />
}

function SignInPanel({ onClose, onSignedIn, note }: Omit<SignInDialogProps, 'open'>) {
  const { t } = useLanguage()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // onClose is usually an inline arrow, so read it through a ref and let the
  // effect run once per open rather than on every parent render.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  // Focus the first field on open, hold focus inside, and give it back on close.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    firstField.current?.focus()
    const releaseScroll = lockScroll()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close.current()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href]',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      releaseScroll()
      returnTo?.focus?.()
    }
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!username.trim() || !password) {
      setError(t.auth.required)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const person = await signIn(username.trim(), password)
      setPassword('')
      onSignedIn?.(person)
    } catch (cause) {
      // The server answers in English; show the reader their own language.
      const status = cause instanceof ApiError ? cause.status : 0
      setError(status === 429 ? t.auth.throttled : t.auth.failed)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-teal-deep/70 backdrop-blur-sm"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[24rem] rounded-2xl bg-white p-7 shadow-[0_40px_80px_-30px_rgba(0,50,57,0.7)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-sand hover:text-teal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <X className="size-4" />
        </button>

        <span
          aria-hidden="true"
          className="inline-flex size-11 items-center justify-center rounded-full bg-teal-soft text-teal"
        >
          <LockKeyhole className="size-5" />
        </span>
        <h2 id={titleId} className="mt-4 text-2xl font-extrabold tracking-tight text-teal-deep">
          {t.auth.title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{note ?? t.auth.lead}</p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-unverified-soft px-3 py-2 text-sm font-medium text-gold-dark"
          >
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          <label className="block">
            <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">
              {t.auth.username}
            </span>
            <input
              ref={firstField}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-sand px-3 text-[0.95rem] text-ink outline-none transition focus:border-gold focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">
              {t.auth.password}
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-sand px-3 text-[0.95rem] text-ink outline-none transition focus:border-gold focus:bg-white"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold text-[0.95rem] font-bold text-gold-dark transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t.auth.working}
              </>
            ) : (
              <>
                <KeyRound className="size-4" />
                {t.auth.submit}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
