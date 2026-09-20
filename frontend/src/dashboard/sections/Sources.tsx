import { cn } from 'cn'
import {
  BadgeCheck,
  CheckCircle2,
  CircleSlash,
  Clock,
  FileText,
  Globe,
  ImageUp,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Link2,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getReference, getSettings, getSources, refreshSource, type CoveredCountry, type Reference, type SourceOption } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Pager } from '../components/Pager'
import { DENSE_ROWS, ROWS, useRowsPerPage } from '../useRowsPerPage'
import { SourceMark } from '../components/SourceMark'
import {
  DOORS,
  SCOPE,
  VERIFICATION,
  type SourceView,
  cadenceLabel,
  shortAddress,
  matchesSource,
  type Door,
  type SourceRow,
} from '../sources'

/** One API row as the card reads it. */
function fromApi(s: SourceOption): SourceRow {
  return {
    id: s.slug,
    name: s.name,
    short: s.short,
    logoUrl: s.logoUrl,
    door: s.door,
    address: s.address,
    collection: s.collection,
    country: s.country,
    cadenceMinutes: s.cadenceMinutes,
    isActive: s.isActive,
    onDemand: Boolean(s.schema?.lookup),
    lastPolledAt: s.lastPolledAt,
    documents: s.documents,
    health: s.health === 'paused' ? 'never' : s.health,
    scope: s.scope,
    verification: s.verification,
    subject: s.subject,
    brand: s.brand,
    isDefault: s.slug === 'maat',
  }
}

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function Sources() {
  const [reference, setReference] = useState<Reference | null>(null)
  const [query, setQuery] = useState('')
  const [door, setDoor] = useState<Door | 'all'>('all')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<SourceView>(rememberedView)
  const [lens, setLens] = useState('')
  const [covered, setCovered] = useState<CoveredCountry[]>([])
  const [all, setAll] = useState<SourceRow[]>([])

  useEffect(() => {
    getReference()
      .then(setReference)
      .catch(() => setReference(null))
    getSettings()
      .then(({ countries }) => setCovered(countries))
      .catch(() => setCovered([]))
    // The register is the database's, not the page's. Every count and every
    // health badge here was computed from rows, so nothing on screen can claim
    // a source is healthy that nothing has contacted.
    getSources()
      .then(({ sources }) => setAll(sources.map(fromApi)))
      .catch(() => setAll([]))
  }, [])

  const countryName = useMemo(() => {
    const map = new Map<string, { name: string; flag: string }>()
    reference?.countries.forEach((c) => map.set(c.iso2, { name: c.name, flag: c.flag }))
    return map
  }, [reference])

  const scopeOf = (s: SourceRow) =>
    s.country === '' ? { label: 'Global', flag: '' } : { label: countryName.get(s.country)?.name ?? s.country, flag: countryName.get(s.country)?.flag ?? '' }

  const shown = useMemo(
    () =>
      all.filter(
        (s) =>
          (door === 'all' || s.door === door) &&
          (lens === '' || s.country === lens) &&
          matchesSource(s, query, scopeOf(s).label),
      ),
    // scopeOf closes over countryName, which is the only other input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, countryName, door, lens, query],
  )

  // Settings decides this, not the register. A country appears here because
  // somebody said Ma'at covers it, so the list matches what Ma'at claims
  // rather than what its feeds happen to have produced so far.
  const lenses = useMemo(
    () =>
      covered
        .filter((c) => c.isActive)
        .map((c) => ({ code: c.iso2, name: c.name, flag: c.flag })),
    [covered],
  )

  const maat = shown.find((s) => s.isDefault)
  const rest = shown.filter((s) => !s.isDefault)

  // A filter that shortens the list must not strand the reader past its end,
  // and switching view changes the page size, so it resets the page too.
  // Cards are tall and the list is one line a row, so they page at different
  // rates; both fall to a phone-sized handful on the smallest screen.
  const pageSize = useRowsPerPage(view === 'list' ? DENSE_ROWS : ROWS)
  const pages = Math.max(1, Math.ceil(rest.length / pageSize))
  const current = Math.min(page, pages - 1)
  const [seen, setSeen] = useState(`${query}|${door}|${lens}|${view}`)
  if (seen !== `${query}|${door}|${lens}|${view}`) {
    setSeen(`${query}|${door}|${lens}|${view}`)
    setPage(0)
  }
  const start = current * pageSize
  const visible = rest.slice(start, start + pageSize)
  const counts = useMemo(() => {
    // Built from the door list rather than written out, so adding a door
    // cannot leave one counting NaN, which is what a hand-written literal did.
    const by = Object.fromEntries((Object.keys(DOORS) as Door[]).map((k) => [k, 0])) as Record<Door, number>
    all.forEach((s) => (by[s.door] += 1))
    return by
  }, [all])

  return (
    <div className="space-y-6">
      <Principle />

      <div className="flex flex-wrap items-center gap-3">
        <DoorFilter door={door} onDoor={setDoor} counts={counts} total={all.length} />
        <ViewToggle
          view={view}
          onView={(next) => {
            setView(next)
            rememberView(next)
          }}
        />
        <div className="relative flex h-11 w-full items-center rounded-full border border-line bg-white shadow-sm transition focus-within:border-gold hover:border-teal/40 sm:w-[26rem]">
          <CountryLens value={lens} onChange={setLens} options={lenses} />
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search aria-hidden="true" className="absolute left-3.5 size-4 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lens ? `Search within ${lenses.find((l) => l.code === lens)?.name ?? lens}` : 'Search name, address or subject'}
              aria-label="Search sources"
              className="h-full w-full min-w-0 rounded-r-full bg-transparent pr-9 pl-10 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear the search"
                className="absolute right-3 text-ink-muted transition hover:text-teal-deep"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      {maat && <DefaultSource source={maat} />}

      {visible.length > 0 && view === 'cards' && (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {visible.map((s) => (
            <SourceCard key={s.id} source={s} scope={scopeOf(s)} />
          ))}
        </div>
      )}
      {visible.length > 0 && view === 'list' && <SourceList sources={visible} scopeOf={scopeOf} />}

      <Pager
        current={current}
        onPage={setPage}
        pages={pages}
        showing={{ from: start + 1, to: start + visible.length }}
        total={rest.length}
        unit="sources"
      />

      {shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-muted">
          No source matches that. Try the body’s name, its country, or the door it comes in by.
        </p>
      )}
    </div>
  )
}

/**
 * The country lens, inside the search control rather than beside it.
 *
 * Narrowing to a country and typing words are the same act: "find me this,
 * there". Split into two controls they read as unrelated filters, and the
 * country one gets missed. Global is the default because most of the register
 * is global, and it is the only setting that hides nothing.
 */
function CountryLens({
  onChange,
  options,
  value,
}: {
  onChange: (code: string) => void
  options: { code: string; name: string; flag: string }[]
  value: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.code === value)

  // Click anywhere else, or press Escape, and it closes. Without both, a menu
  // opened by accident has to be dismissed by choosing something.
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `Showing ${current.name}. Change country` : 'Showing everywhere. Narrow to a country'}
        className="flex h-11 items-center gap-1.5 rounded-l-full pr-2.5 pl-4 text-sm font-medium text-teal-deep transition hover:bg-sand"
      >
        {current ? (
          <>
            <span aria-hidden="true" className="text-base leading-none">
              {current.flag}
            </span>
            <span className="max-w-[7rem] truncate">{current.name}</span>
          </>
        ) : (
          <>
            <Globe aria-hidden="true" className="size-4 text-teal" />
            <span>Global</span>
          </>
        )}
        <ChevronDown aria-hidden="true" className={cn('size-3.5 text-ink-muted transition', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_18px_40px_-16px_oklch(0.29_0.055_210/0.4)]"
        >
          <Option picked={value === ''} onPick={() => { onChange(''); setOpen(false) }}>
            <Globe aria-hidden="true" className="size-4 text-teal" />
            Global
            <span className="ml-auto text-xs text-ink-muted">everywhere</span>
          </Option>
          {options.map((o) => (
            <Option key={o.code} picked={value === o.code} onPick={() => { onChange(o.code); setOpen(false) }}>
              <span aria-hidden="true" className="text-base leading-none">
                {o.flag}
              </span>
              {o.name}
            </Option>
          ))}
        </ul>
      )}
    </div>
  )
}

function Option({
  children,
  onPick,
  picked,
}: {
  children: React.ReactNode
  onPick: () => void
  picked: boolean
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={picked}
        onClick={onPick}
        className={cn(
          'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition',
          picked ? 'bg-teal-soft font-medium text-teal-deep' : 'text-ink hover:bg-sand',
        )}
      >
        {children}
      </button>
    </li>
  )
}

/**
 * The four doors, their order, and the rules the pages door runs under.
 * Stated once, at the top.
 *
 * On a phone it states itself once and then gets out of the way: the rules
 * matter when you are adding a source, and somebody who opened this page to
 * find one should not scroll two screens of policy to reach the register.
 * From the small breakpoint up there is room for both, so it is simply open.
 */
function Principle() {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-2xl bg-teal-deep px-6 py-5 text-white sm:px-7">
      <div className="flex flex-wrap items-start gap-4">
        <h2 className="mr-auto flex items-center gap-2 font-serif text-lg font-bold tracking-tight">
          <ShieldCheck className="size-5 shrink-0 text-gold" />
          How Ma’at reads a source
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Hide how Ma’at reads a source' : 'Show how Ma’at reads a source'}
            className="text-white/60 transition hover:text-gold sm:hidden"
          >
            <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
          </button>
        </h2>
        {/* The act of adding a source belongs beside the rules it must obey,
            not beside the search, which only ever looks at what is already here. */}
        <Link
          to="/sources/new"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold whitespace-nowrap text-gold-dark shadow-sm transition hover:bg-gold/90"
        >
          <Plus className="size-4" />
          Add a source
        </Link>
      </div>
      <p className={cn('mt-1.5 max-w-3xl text-sm text-white/70 sm:block', open ? 'block' : 'hidden')}>
        A body is connected by the best way in it offers, in this order: a public API, then a feed
        it maintains, then its own public pages. Pages are read only for official and
        public-interest bodies that publish neither, and only as a good citizen reads a notice
        board: the site’s robots rules first, one page at a time, identified as Ma’at, whole
        articles only, and never from behind a login or a paywall. No private outlet is read this
        way. Files added by hand remain the fourth door.
      </p>
      <div className={cn('mt-4 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4', open ? 'grid' : 'hidden')}>
        {(Object.keys(DOORS) as Door[]).map((key) => {
          const { label, icon: Icon, blurb } = DOORS[key]
          return (
            <div key={key} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Icon className="size-4 text-gold" />
                {label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">{blurb}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DoorFilter({
  counts,
  door,
  onDoor,
  total,
}: {
  counts: Record<Door, number>
  door: Door | 'all'
  onDoor: (d: Door | 'all') => void
  total: number
}) {
  const options: { key: Door | 'all'; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: total },
    ...(Object.keys(DOORS) as Door[]).map((k) => ({ key: k, label: DOORS[k].label, n: counts[k] })),
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map(({ key, label, n }) => (
        <button
          key={key}
          type="button"
          onClick={() => onDoor(key)}
          aria-pressed={door === key}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition',
            door === key
              ? 'bg-teal-deep text-white'
              : 'border border-line bg-white text-ink-muted hover:border-teal/40 hover:text-teal-deep',
          )}
        >
          {label}
          <span className={cn('text-xs', door === key ? 'text-white/60' : 'text-ink-muted')}>{n}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Ma'at's own entry. Set apart because it is the default and cannot be removed,
 * and because its mark is the one that follows the product everywhere else.
 */
function DefaultSource({ source }: { source: SourceRow }) {
  const { icon: DoorIcon, label } = DOORS[source.door]
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-teal-deep px-6 py-6 text-white sm:px-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 -z-10 size-64 rounded-full bg-[radial-gradient(circle,var(--color-gold)/0.22,transparent_65%)]"
      />
      <div className="flex flex-wrap items-start gap-5">
        <SourceMark source={source} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-xl font-bold tracking-tight">{source.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">
              <BadgeCheck className="size-3.5" />
              Default source
            </span>
          </p>
          <p className="mt-1 max-w-2xl text-sm text-white/70">
            Ma’at publishes too, and its notices are weighed like anyone else’s. Its mark is taken
            from here, which is why every citation, avatar and by-line shows the same feather.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <DoorIcon className="size-3.5 text-gold" />
              {label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Globe className="size-3.5 text-gold" />
              Global
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <FileText className="size-3.5 text-gold" />
              {source.documents} documents
            </span>
          </div>
        </div>

        <Link
          to={`/sources/${source.id}/edit`}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium whitespace-nowrap ring-1 ring-white/15 transition hover:bg-white/15"
        >
          <ImageUp className="size-4" />
          Replace logo
        </Link>
      </div>
    </section>
  )
}

/** One external body. The card's middle changes with the door it comes in by. */
function SourceCard({ source, scope }: { source: SourceRow; scope: { label: string; flag: string } }) {
  const spec = DOORS[source.door]
  const DoorIcon = spec.icon

  return (
    <article
      className={cn(
        // The frosted panel from the Documents drop area: a cool tint, a warm
        // pool under the middle and a lit top edge, so a card reads as its own
        // surface rather than dissolving into the page behind it.
        'panel-glow hover:panel-glow-lift relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-teal-soft/45 p-5 transition',
        source.isActive ? 'border-teal/20' : 'border-dashed border-teal/25',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-75" />
      </div>

      <div className="flex items-start gap-4">
        <SourceMark source={source} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold tracking-tight text-teal-deep">{source.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">{scope.flag || <Globe className="size-3.5" />}</span>
              {scope.label}
            </span>
            <span aria-hidden="true">·</span>
            <span title={SCOPE[source.scope].note}>{SCOPE[source.scope].label}</span>
            <span aria-hidden="true">·</span>
            <span>{source.subject}</span>
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1',
            spec.tone,
          )}
        >
          <DoorIcon className="size-3.5" />
          {spec.label}
        </span>
      </div>

      {/* The adaptive part. A feed and an API are addresses that can be opened
          and checked; an upload has no address at all, and saying so plainly
          beats an empty field somebody will read as a fault. */}
      <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white/60">
        <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          {source.door === 'upload' ? 'Added by hand' : source.door === 'feed' ? 'Feed' : 'Endpoint'}
        </p>
        {source.door === 'upload' ? (
          <p className="mt-1 text-sm text-ink">
            No feed, no public API. Files are uploaded on the Documents page.
          </p>
        ) : (
          <p className="mt-1 flex items-start gap-1.5 text-sm break-all text-teal">
            <Link2 className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-all" title={source.address}>{shortAddress(source.address)}</span>
          </p>
        )}
        <p className="mt-1.5 text-xs text-ink-muted">{source.collection}</p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <Fact label="Cadence" value={cadenceLabel(source.cadenceMinutes)} />
        <Fact
          label={source.door === 'upload' ? 'Last upload' : 'Last checked'}
          value={source.lastPolledAt ? when.format(new Date(source.lastPolledAt)) : 'Never'}
        />
        <Fact label="Documents" value={source.documents.toLocaleString('en-GB')} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-teal/15 pt-3">
        <span
          title={VERIFICATION[source.verification].note}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1',
            VERIFICATION[source.verification].tone,
          )}
        >
          {VERIFICATION[source.verification].label}
        </span>
        <Health health={source.health} isActive={source.isActive} onDemand={source.onDemand} />
        <span className="ml-auto inline-flex items-center gap-3">
          <Refresh source={source} />
          <Link
            to={`/sources/${source.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-teal-deep"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </span>
      </div>
    </article>
  )
}

/**
 * Cards or rows. Cards say everything about a source; the list says only what
 * changes between polls, so fifty fit where ten cards did. The choice is kept
 * in this browser: it is a way of reading, not a fact about the register.
 */
function ViewToggle({ view, onView }: { view: SourceView; onView: (view: SourceView) => void }) {
  const options: { key: SourceView; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'cards', label: 'Cards', icon: LayoutGrid },
    { key: 'list', label: 'List', icon: List },
  ]
  return (
    <div role="radiogroup" aria-label="How to show sources" className="ml-auto inline-flex h-11 items-center rounded-full border border-line bg-white p-1 shadow-sm">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={view === key}
          onClick={() => onView(key)}
          title={label}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition',
            view === key ? 'bg-teal-deep text-white shadow-sm' : 'text-ink-muted hover:text-teal-deep',
          )}
        >
          <Icon className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

const VIEW_KEY = 'maat.sources.view'

function rememberedView(): SourceView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}

function rememberView(view: SourceView) {
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    // A private window forgets; the page still works.
  }
}

/**
 * The register as rows. One line a source: mark, name and where it speaks
 * for, the door, health, how many documents and when it was last checked.
 * Everything else is one click away on the edit page.
 */
function SourceList({
  sources,
  scopeOf,
}: {
  sources: SourceRow[]
  scopeOf: (s: SourceRow) => { label: string; flag: string }
}) {
  return (
    <div className="panel-glow relative isolate overflow-hidden rounded-2xl border border-teal/20 bg-teal-soft/45">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-60" />
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead>
          <tr className="text-[11px] tracking-wide text-ink-muted uppercase">
            <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Door</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Health</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Documents</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Last checked</th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => {
            const spec = DOORS[source.door]
            const DoorIcon = spec.icon
            const scope = scopeOf(source)
            return (
              <tr
                key={source.id}
                className={cn('border-t border-teal/15 transition hover:bg-white/50', !source.isActive && 'text-ink-muted')}
              >
                <td className="px-4 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <SourceMark source={source} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-teal-deep" title={source.name}>
                        {source.name}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        <span aria-hidden="true">{scope.flag ? `${scope.flag} ` : ''}</span>
                        {scope.label}
                        <span aria-hidden="true"> · </span>
                        {source.subject}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1', spec.tone)}>
                    <DoorIcon className="size-3" />
                    {spec.label}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Health health={source.health} isActive={source.isActive} onDemand={source.onDemand} />
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-ink">
                  {source.documents.toLocaleString('en-GB')}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-ink-muted">
                  {source.lastPolledAt ? when.format(new Date(source.lastPolledAt)) : 'Never'}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-3">
                    <Refresh source={source} compact />
                    <Link
                      to={`/sources/${source.id}/edit`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition hover:text-teal-deep"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Link>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

/**
 * Pull from this source now, whatever its cadence says.
 *
 * A source is configured and then waits hours to prove itself, which is no
 * use to somebody who has just added one or is showing the product working.
 * The button says what the pull actually did, and leaves the message up: a
 * result that vanishes is a result nobody read.
 *
 * Uploads have no address to pull from, so they get no button rather than a
 * button that always fails.
 */
function Refresh({ source, compact = false }: { source: SourceRow; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')

  if (source.door === 'upload') return null

  const pull = async () => {
    setBusy(true)
    setSaid('')
    try {
      const { run } = await refreshSource(source.id)
      setSaid(
        run.status === 'failed'
          ? run.error || 'The pull failed.'
          : `${run.added} new, ${run.seen} seen`,
      )
    } catch (error) {
      setSaid(error instanceof Error ? error.message : 'The pull failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={pull}
        disabled={busy}
        title="Pull from this source now, without waiting for its cadence"
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition hover:text-teal-deep disabled:opacity-60"
      >
        <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />
        {busy ? 'Pulling…' : 'Refresh'}
      </button>
      {said && !compact && (
        <span className="text-[11px] text-ink-muted" aria-live="polite">
          {said}
        </span>
      )}
    </span>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  )
}

function Health({ health, isActive, onDemand }: { health: SourceRow['health']; isActive: boolean; onDemand?: boolean }) {
  if (isActive && onDemand) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal" title="Asked when a claim needs a figure. Not polled, so there is nothing to be healthy about between times.">
        <Plug className="size-3.5" />
        Asked on demand
      </span>
    )
  }
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CircleSlash className="size-3.5" />
        Paused
      </span>
    )
  }
  if (health === 'failing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-unverified">
        <TriangleAlert className="size-3.5" />
        Last check failed
      </span>
    )
  }
  if (health === 'never') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Clock className="size-3.5" />
        Not yet checked
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-verified">
      <CheckCircle2 className="size-3.5" />
      Healthy
    </span>
  )
}

/**
 * A source's mark. Ma'at's is drawn rather than fetched, so it is always there
 * and always right; everyone else's is whatever logo has been pointed at, with
 * a monogram standing in until one is, or if the fetch fails. A broken image
 * icon in a row of institutional logos looks like a fault in the source.
 */
