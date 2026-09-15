import { cn } from 'cn'
import { ArrowLeft, Check, CircleAlert, Feather, Globe, Info, Save, TestTube2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSettings, type CoveredCountry } from '@/lib/api'
import {
  CADENCES,
  DOORS,
  addSource,
  blankSource,
  findSource,
  monogram,
  updateSource,
  validateSource,
  type Door,
  type SourceRow,
} from '../sources'

/**
 * Add or edit one source.
 *
 * The shape follows what the connector platforms settled on: identify the
 * thing, then pick how it connects, then configure only that one door. Not
 * tabs. Tabs say "these are alternatives you may switch between and fill in",
 * and a source has exactly one door; showing three sets of fields invites
 * somebody to fill two and wonder which took effect.
 *
 * Two further borrowings. Airbyte's handbook: every field carries a
 * description saying what it is for, defaults are set wherever a sensible one
 * exists, and anything advanced stays folded away. Fivetran's: the commit is
 * "Save and test", because a connection you have not tested is a connection
 * you do not have.
 */
export function SourceForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = mode === 'edit' ? findSource(id) : undefined

  const [draft, setDraft] = useState<SourceRow>(() => existing ?? blankSource())
  const [touched, setTouched] = useState(false)
  const [covered, setCovered] = useState<CoveredCountry[]>([])

  // The countries on offer are the ones Settings lists, on or off. A source
  // for a country still being prepared is exactly what "off" is for.
  useEffect(() => {
    getSettings()
      .then(({ countries }) => setCovered(countries))
      .catch(() => setCovered([]))
  }, [])

  const errors = useMemo(() => validateSource(draft), [draft])
  const ok = Object.keys(errors).length === 0
  const set = <K extends keyof SourceRow>(key: K, value: SourceRow[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  if (mode === 'edit' && !existing) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-muted">
        No source with that address. It may have been removed.
      </p>
    )
  }

  const save = () => {
    setTouched(true)
    if (!ok) return
    const short = draft.short.trim() || monogram(draft.name)
    if (mode === 'edit' && existing) updateSource(existing.id, { ...draft, short })
    else addSource({ ...draft, short })
    navigate('/sources')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => navigate('/sources')}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-teal-deep"
      >
        <ArrowLeft className="size-4" />
        Back to sources
      </button>

      {/* 1. Who it is. The name is what a citation says, so it comes first. */}
      <Panel step={1} title="The body" note="What a citation will name, and the mark shown beside it.">
        <Field
          label="Name"
          hint="The publishing body as it should appear in a citation. Write it as they write it."
          error={touched ? errors.name : undefined}
        >
          <input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="World Health Organization"
            className={input(touched && !!errors.name)}
          />
        </Field>

        <Field
          label="What it publishes"
          hint="One line. It appears on the card, so the register reads as more than a list of addresses."
          error={touched ? errors.collection : undefined}
        >
          <input
            value={draft.collection}
            onChange={(e) => set('collection', e.target.value)}
            placeholder="Press releases and situation reports"
            className={input(touched && !!errors.collection)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Scope" hint="A body whose word applies anywhere is global. Otherwise name the country.">
            <select
              value={draft.country}
              onChange={(e) => set('country', e.target.value)}
              className={input(false)}
            >
              <option value="">Global</option>
              {covered.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.flag} {c.name}
                  {c.isActive ? '' : ' (off)'}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Logo"
            hint="An https address for the body's own mark. Left empty, a monogram stands in."
            error={touched ? errors.logoUrl : undefined}
          >
            <div className="flex items-center gap-3">
              <Mark draft={draft} />
              <input
                value={draft.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
                placeholder="https://example.org/logo.svg"
                className={input(touched && !!errors.logoUrl)}
              />
            </div>
          </Field>
        </div>
      </Panel>

      {/* 2. Which door. One choice, made visibly, before any door's fields. */}
      <Panel step={2} title="How it connects" note="Pick one. The server prefers an API, then a feed, then pages, and checks the site for the better door first.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(DOORS) as Door[]).map((key) => {
            const { label, icon: Icon, blurb } = DOORS[key]
            const picked = draft.door === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('door', key)}
                aria-pressed={picked}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition',
                  picked
                    ? 'border-gold bg-gold-soft/60 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]'
                    : 'border-white/70 bg-white/80 hover:border-teal/35',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-teal-deep">
                  <Icon className={cn('size-4', picked ? 'text-gold-dark' : 'text-teal')} />
                  {label}
                  {picked && <Check className="ml-auto size-4 text-gold-dark" />}
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">{blurb}</span>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* 3. Only the chosen door's fields. */}
      <Panel
        step={3}
        title={draft.door === 'upload' ? 'Nothing to connect' : 'The connection'}
        note={
          draft.door === 'upload'
            ? 'Upload sources have no address and are never polled.'
            : 'Checked on a schedule. Be a considerate guest.'
        }
      >
        {draft.door === 'upload' ? (
          <p className="flex items-start gap-2.5 rounded-xl bg-white/70 px-4 py-3 text-sm text-ink ring-1 ring-white/60">
            <Info className="mt-0.5 size-4 shrink-0 text-teal" />
            <span>
              This source exists so uploaded files can be attributed to it and cited by its name. Add
              the files on the Documents page and shelve them under this body.
            </span>
          </p>
        ) : (
          <>
            <Field
              label={draft.door === 'feed' ? 'Feed address' : draft.door === 'pages' ? 'News page address' : 'Base endpoint'}
              hint={
                draft.door === 'feed'
                  ? 'The RSS or Atom feed the body publishes, not the page it sits on. It usually ends .xml.'
                  : draft.door === 'pages'
                    ? 'The page where the body lists its news or press releases. Ma’at follows the article links from here, within the site’s robots rules, and keeps whole articles only.'
                    : 'The documented base URL. Each API is answered by an adapter written for it, so this is a starting point rather than the whole story.'
              }
              error={touched ? errors.address : undefined}
            >
              <input
                value={draft.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder={
                  draft.door === 'feed'
                    ? 'https://www.afro.who.int/rss/featured-news.xml'
                    : draft.door === 'pages'
                      ? 'https://nema.gov.ng/news/'
                      : 'https://api.worldbank.org/v2'
                }
                className={input(touched && !!errors.address)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="How often to check" hint="Slower is kinder. Most bodies publish a few times a week.">
                <select
                  value={draft.cadenceMinutes}
                  onChange={(e) => set('cadenceMinutes', Number(e.target.value))}
                  className={input(false)}
                >
                  {CADENCES.map((c) => (
                    <option key={c.minutes} value={c.minutes}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Active" hint="Pause a source to stop polling without losing what it has already given.">
                <label className="inline-flex h-11 items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                    className="size-4 accent-[var(--color-teal)]"
                  />
                  Poll this source
                </label>
              </Field>
            </div>

            <Verify draft={draft} valid={!errors.address} />
          </>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold text-gold-dark shadow-sm transition hover:bg-gold/90"
        >
          <Save className="size-4" />
          {mode === 'edit' ? 'Save changes' : 'Add source'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/sources')}
          className="inline-flex h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-medium text-ink-muted transition hover:text-teal-deep"
        >
          Cancel
        </button>
        {touched && !ok && (
          <p className="flex items-center gap-1.5 text-sm text-unverified">
            <CircleAlert className="size-4" />
            Some fields still need attention.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * The address check.
 *
 * It reads the address and says what it can see, and it is careful to say no
 * more than that. Actually fetching the feed has to happen on the server: the
 * browser is blocked from reading another origin's response, so a green tick
 * drawn here would mean nothing at all. Claiming a connection works when
 * nobody has opened it is the one failure this form must not have.
 */
function Verify({ draft, valid }: { draft: SourceRow; valid: boolean }) {
  const [checked, setChecked] = useState(false)
  const notes = useMemo(() => {
    if (!valid || !draft.address) return []
    const out: { tone: 'ok' | 'warn'; text: string }[] = []
    try {
      const url = new URL(draft.address)
      out.push({ tone: 'ok', text: `Address parses. Host is ${url.host}, over https.` })
      if (draft.door === 'feed' && !/\.(xml|rss|atom)$|\/(rss|feed|atom)\b/i.test(url.pathname)) {
        out.push({
          tone: 'warn',
          text: 'The path does not look like a feed. Check this is the feed itself and not the page linking to it.',
        })
      }
      if (draft.door === 'api' && url.pathname.length > 1) {
        out.push({ tone: 'warn', text: 'Path included. Give the base endpoint and let the adapter add the rest.' })
      }
      if (draft.door === 'pages' && url.pathname.length <= 1) {
        out.push({
          tone: 'warn',
          text: 'This is the home page. The news or press-release listing usually reads more cleanly, and the server checks the site for a feed or API first either way.',
        })
      }
    } catch {
      return []
    }
    return out
  }, [draft.address, draft.door, valid])

  return (
    <div className="mt-5 rounded-xl border border-white/70 bg-white/70 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!valid || !draft.address}
          onClick={() => setChecked(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-teal/30 bg-white px-4 text-sm font-medium text-teal-deep transition hover:border-teal/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <TestTube2 className="size-4" />
          Check the address
        </button>
        <p className="text-xs text-ink-muted">
          Opening the {draft.door === 'feed' ? 'feed' : draft.door === 'pages' ? 'page' : 'endpoint'} happens on the
          server, once ingestion runs. This reads the address only.
        </p>
      </div>

      {checked && notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notes.map((n, i) => (
            <li key={i} className={cn('flex items-start gap-2 text-xs', n.tone === 'ok' ? 'text-verified' : 'text-unverified')}>
              {n.tone === 'ok' ? (
                <Check className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              )}
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Panel({
  children,
  note,
  step,
  title,
}: {
  children: ReactNode
  note: string
  step: number
  title: string
}) {
  return (
    // The frosted panel the drop area and the source cards use: a cool tint, a
    // warm pool under the middle, a lit top edge. White on white left these
    // reading as nothing at all, so the form had no sections, only spacing.
    <section className="panel-glow relative isolate overflow-hidden rounded-2xl border border-teal/20 bg-teal-soft/45 p-5 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-75" />
      </div>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-teal ring-1 ring-teal/15">
          {step}
        </span>
        <div>
          <h2 className="font-serif text-lg font-bold tracking-tight text-teal-deep">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{note}</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode
  error?: string
  hint: string
  label: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-teal-deep">{label}</span>
      <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      <span className="mt-2 block">{children}</span>
      {error && (
        <span className="mt-1.5 flex items-start gap-1.5 text-xs text-unverified">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </span>
      )}
    </label>
  )
}

const input = (bad: boolean) =>
  cn(
    'h-11 w-full rounded-xl border bg-white px-4 text-sm text-ink transition placeholder:text-ink-muted focus:outline-none',
    bad ? 'border-unverified focus:border-unverified' : 'border-line hover:border-teal/40 focus:border-gold',
  )

/** What the card will show: the logo if one loads, the monogram if not. */
function Mark({ draft }: { draft: SourceRow }) {
  const [failed, setFailed] = useState(false)
  const [tried, setTried] = useState(draft.logoUrl)

  // Editing the address is a fresh attempt, so the last failure is forgotten
  // during render rather than in an effect, which would paint the monogram for
  // one frame before the new logo got its chance.
  if (tried !== draft.logoUrl) {
    setTried(draft.logoUrl)
    setFailed(false)
  }

  if (draft.logoUrl && !failed) {
    return (
      <img
        src={draft.logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className="size-11 shrink-0 rounded-xl bg-white object-contain ring-1 ring-line"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-teal ring-1 ring-teal/15"
    >
      {draft.short.trim() || (draft.name ? monogram(draft.name) : <Globe className="size-4" />)}
    </span>
  )
}

/** Unused but kept close: the emblem the default source draws instead of a logo. */
export const DefaultMark = Feather
