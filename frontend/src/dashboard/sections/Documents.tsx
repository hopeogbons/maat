import { cn } from 'cn'
import { useRowsPerPage } from '../useRowsPerPage'
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileSignature,
  FileStack,
  FileText,
  FileType2,
  Files,
  Globe,
  Landmark,
  Library,
  Loader2,
  Newspaper,
  NotebookText,
  Paperclip,
  ScrollText,
  Search,
  Share2,
  Stamp,
  UploadCloud,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import {
  getDocumentSources,
  getDocuments,
  getReference,
  getSettings,
  uploadDocument,
  type CoveredCountry,
  type Reference,
  type SourceOption,
} from '@/lib/api'
import { SourceMark } from '../components/SourceMark'
import { monogram } from '../sources'
import {
  ACCEPTED_EXTENSIONS,
  DOCUMENTS,
  GLOBAL,
  fileKind,
  formatBytes,
  isAcceptedFile,
  matches,
  shelves,
  type DocumentRow,
} from '../documents'

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** A file the folder has taken but the server has not been handed yet. */
interface Queued {
  id: string
  name: string
  bytes: number
  country: string
}

export function Documents() {
  const [reference, setReference] = useState<Reference | null>(null)
  const [covered, setCovered] = useState<CoveredCountry[]>([])
  const [target, setTarget] = useState(GLOBAL)
  const [queued, setQueued] = useState<Queued[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [shareOnUpload, setShareOnUpload] = useState(false)
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<SourceOption[]>([])
  const [publisher, setPublisher] = useState('')
  const [stored, setStored] = useState<DocumentRow[] | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const [landed, setLanded] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getReference()
      .then(setReference)
      .catch(() => setReference(null))
    // Settings decides which countries a document can be shelved under. A
    // country on the list but switched off can still receive documents, since
    // that is how it is prepared; the shelf shows them once it is switched on.
    getSettings()
      .then(({ countries }) => setCovered(countries))
      .catch(() => setCovered([]))
    getDocumentSources()
      .then(({ sources: list }) => {
        setSources(list)
        setPublisher((current) => current || list[0]?.id || '')
      })
      .catch(() => setSources([]))
    reload()
  }, [])

  // The shelf shows what the server holds. The sample set stands in only when
  // the server cannot be reached, so an empty shelf means an empty corpus
  // rather than a failed request nobody noticed.
  function reload() {
    getDocuments()
      .then(({ documents }) =>
        setStored(
          documents.map((d) => ({
            id: d.id,
            title: d.title,
            filename: d.filename,
            source: d.source,
            sourceShort: d.sourceShort,
            sourceLogo: d.sourceLogo,
            sourceBrand: d.sourceBrand,
            country: d.country,
            publishedAt: d.publishedAt || new Date().toISOString().slice(0, 10),
            version: d.version,
            chunks: d.chunks,
            bytes: d.bytes,
            status: d.status,
            isPublic: d.isPublic,
          })),
        ),
      )
      .catch(() => setStored(null))
  }

  const countryName = useMemo(() => {
    const map = new Map<string, { name: string; flag: string }>()
    reference?.countries.forEach((c) => map.set(c.iso2, { name: c.name, flag: c.flag }))
    return map
  }, [reference])

  const shelf = stored ?? DOCUMENTS
  const order = useMemo(() => reference?.countries.map((c) => c.iso2) ?? [], [reference])
  // Searching filters before grouping, so a shelf left with nothing drops out
  // rather than sitting there as an empty heading.
  const groups = useMemo(
    () =>
      shelves(
        shelf.filter((d) => matches(d, query, d.country === GLOBAL ? 'Global' : (countryName.get(d.country)?.name ?? d.country))),
        order,
      ).filter((s) => s.documents.length > 0),
    [countryName, order, query, shelf],
  )
  const found = useMemo(() => groups.reduce((n, s) => n + s.documents.length, 0), [groups])

  const take = useCallback(
    async (files: File[]) => {
      const good = files.filter((f) => isAcceptedFile(f.name))
      setRejected(files.filter((f) => !isAcceptedFile(f.name)).map((f) => f.name))
      if (good.length === 0) return

      const batch = good.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}`, name: f.name, bytes: f.size, country: target }))
      setQueued((prev) => [...prev, ...batch])

      // One at a time. The server reads and embeds each file before answering,
      // so firing them together only queues the same work behind one lock
      // while making every failure harder to attribute.
      for (const [index, file] of good.entries()) {
        try {
          await uploadDocument(file, { source: publisher, country: target, isPublic: shareOnUpload })
        } catch (error) {
          setFailed((prev) => [...prev, `${file.name}: ${(error as Error).message}`])
        } finally {
          setQueued((prev) => prev.filter((q) => q.id !== batch[index].id))
        }
      }
      reload()
      setLanded(target)
    },
    [publisher, shareOnUpload, target],
  )

  return (
    <div className="space-y-6">
      <UploadFolder
        countries={covered}
        dragging={dragging}
        onBrowse={() => input.current?.click()}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          take(Array.from(e.dataTransfer.files))
        }}
        onPublisher={setPublisher}
        onShareOnUpload={setShareOnUpload}
        onTarget={setTarget}
        publisher={publisher}
        sources={sources}
        shareOnUpload={shareOnUpload}
        target={target}
      />

      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        hidden
        onChange={(e) => {
          take(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      {rejected.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-gold-soft px-4 py-3 text-sm text-gold-dark">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Ma’at reads published documents, not data files, so{' '}
            {rejected.length === 1 ? 'this was' : 'these were'} left out: {rejected.join(', ')}. A
            spreadsheet or a data feed belongs at the API door, set up on the Sources page.
          </span>
        </p>
      )}

      {failed.length > 0 && (
        <div className="rounded-xl bg-unverified-soft px-4 py-3 text-sm text-unverified">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {failed.length === 1 ? 'This one was not stored' : 'These were not stored'}, so nothing on the
              shelf changed:
            </span>
          </p>
          <ul className="mt-1.5 ml-6 list-disc space-y-1">
            {failed.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {queued.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold tracking-tight text-teal-deep">Waiting to be read · {queued.length}</h2>
          <ul className="mt-3 divide-y divide-line">
            {queued.map((q) => (
              <li key={q.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Loader2 className="size-4 shrink-0 animate-spin text-teal motion-reduce:animate-none" />
                <span className="min-w-0 flex-1 truncate text-ink">{q.name}</span>
                <span className="shrink-0 text-xs text-ink-muted">{formatBytes(q.bytes)}</span>
                <span className="shrink-0 text-xs font-medium text-teal">
                  {q.country === GLOBAL ? 'Global' : (countryName.get(q.country)?.name ?? q.country)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-serif text-lg font-bold tracking-tight text-teal-deep">
          {query ? `${found} ${found === 1 ? 'document' : 'documents'} found` : 'Shelves'}
        </h2>
        <label className="relative w-full sm:w-72">
          <Search aria-hidden="true" className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, file or issuing body"
            aria-label="Search documents"
            className="h-11 w-full rounded-full border border-line bg-white pr-10 pl-11 text-sm text-ink shadow-sm transition placeholder:text-ink-muted hover:border-teal/40 focus:border-gold focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear the search"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-muted transition hover:text-teal-deep"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-muted">
          Nothing matches “{query}”. Try the issuing body, or part of the file name.
        </p>
      )}

      {groups.map((shelf) => (
        <Shelf
          key={shelf.country || 'global'}
          country={shelf.country}
          openBecause={landed === shelf.country}
          query={query}
          label={shelf.country === GLOBAL ? 'Global' : (countryName.get(shelf.country)?.name ?? shelf.country)}
          flag={shelf.country === GLOBAL ? '' : (countryName.get(shelf.country)?.flag ?? '')}
          note={
            shelf.country === GLOBAL
              ? 'Answers a question asked from anywhere.'
              : `Answers only questions about ${countryName.get(shelf.country)?.name ?? shelf.country}.`
          }
          documents={shelf.documents}
          bytes={shelf.bytes}
        />
      ))}
    </div>
  )
}

/**
 * Faded document icons drifting across the drop area.
 *
 * Set thickly enough to read as a texture rather than as a handful of stray
 * marks, but held off the middle: the text column runs from roughly a third to
 * two thirds of the width, and nothing is ever read through an icon. The few
 * placed centrally sit at the very top and bottom, clear of the words.
 *
 * Gazettes, notices, circulars and signed statements, since those are the only
 * things the folder now takes.
 */
const STREWN = [
  // Left flank.
  { icon: FileText, x: '3%', y: '14%', size: 56, rot: '-14deg', anim: 'animate-float', delay: '0s' },
  { icon: ScrollText, x: '11%', y: '58%', size: 46, rot: '10deg', anim: 'animate-drift', delay: '1.4s' },
  { icon: Paperclip, x: '2%', y: '40%', size: 34, rot: '18deg', anim: 'animate-float-slow', delay: '2.1s' },
  { icon: Newspaper, x: '16%', y: '20%', size: 40, rot: '8deg', anim: 'animate-drift', delay: '3.4s' },
  { icon: Stamp, x: '7%', y: '80%', size: 36, rot: '-10deg', anim: 'animate-float-slow', delay: '0.9s' },
  { icon: FileCheck2, x: '20%', y: '76%', size: 32, rot: '14deg', anim: 'animate-float', delay: '2.8s' },
  { icon: Library, x: '24%', y: '38%', size: 30, rot: '-6deg', anim: 'animate-drift', delay: '4.1s' },
  { icon: NotebookText, x: '14%', y: '92%', size: 28, rot: '20deg', anim: 'animate-float-slow', delay: '1.7s' },
  { icon: ClipboardList, x: '27%', y: '8%', size: 30, rot: '-18deg', anim: 'animate-float', delay: '3.9s' },

  // Right flank.
  { icon: FileType2, x: '86%', y: '10%', size: 50, rot: '12deg', anim: 'animate-float-slow', delay: '0.7s' },
  { icon: FileSignature, x: '93%', y: '48%', size: 42, rot: '-8deg', anim: 'animate-drift', delay: '1.9s' },
  { icon: Files, x: '79%', y: '72%', size: 56, rot: '6deg', anim: 'animate-float', delay: '0.3s' },
  { icon: FileStack, x: '70%', y: '28%', size: 36, rot: '-20deg', anim: 'animate-drift', delay: '2.6s' },
  { icon: Landmark, x: '96%', y: '80%', size: 34, rot: '4deg', anim: 'animate-float-slow', delay: '3.2s' },
  { icon: BookOpen, x: '74%', y: '88%', size: 32, rot: '-12deg', anim: 'animate-float', delay: '1.2s' },
  { icon: ScrollText, x: '88%', y: '30%', size: 28, rot: '22deg', anim: 'animate-float-slow', delay: '4.4s' },
  { icon: FileText, x: '67%', y: '62%', size: 30, rot: '9deg', anim: 'animate-drift', delay: '0.5s' },
  { icon: Newspaper, x: '82%', y: '58%', size: 26, rot: '-16deg', anim: 'animate-float', delay: '3.7s' },

  // Clear of the words, top and bottom.
  { icon: Stamp, x: '46%', y: '2%', size: 26, rot: '-8deg', anim: 'animate-drift', delay: '2.3s' },
  { icon: FileCheck2, x: '55%', y: '93%', size: 28, rot: '12deg', anim: 'animate-float-slow', delay: '1.1s' },
  { icon: Paperclip, x: '38%', y: '95%', size: 24, rot: '-22deg', anim: 'animate-float', delay: '4.8s' },
]

/** The one place documents come in by hand: drop a file, or browse for it. */
function UploadFolder({
  countries,
  dragging,
  onBrowse,
  onDragLeave,
  onDragOver,
  onDrop,
  onPublisher,
  onShareOnUpload,
  onTarget,
  publisher,
  shareOnUpload,
  sources,
  target,
}: {
  countries: CoveredCountry[]
  dragging: boolean
  onBrowse: () => void
  onPublisher: (id: string) => void
  onShareOnUpload: (value: boolean) => void
  publisher: string
  shareOnUpload: boolean
  sources: SourceOption[]
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onTarget: (code: string) => void
  target: string
}) {
  return (
    <section
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        'panel-glow relative isolate overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition sm:px-10 sm:py-12',
        dragging ? 'border-gold bg-gold-soft' : 'border-teal/25 bg-teal-soft/45',
      )}
    >
      {/* The ground: a warm pool under the middle, so the panel is lit rather
          than flat, with the file icons strewn to either side of the text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-70" />
        {STREWN.map(({ icon: Icon, x, y, size, rot, anim, delay }, i) => (
          <Icon
            key={i}
            strokeWidth={1.25}
            className={cn('absolute hidden text-teal/15 motion-reduce:animate-none sm:block', anim)}
            style={{ left: x, top: y, width: size, height: size, animationDelay: delay, '--rot': rot } as CSSProperties}
          />
        ))}
      </div>

      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-teal shadow-sm ring-1 ring-teal/10">
        <UploadCloud className="size-7" />
      </span>
      <h2 className="mt-4 font-serif text-xl font-bold tracking-tight text-teal-deep">Upload documents</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">
        Drop files here, or browse. Ma’at reads each one, splits it into passages and cites it by its
        publishing body.
      </p>

      {/* The shelf the next uploads land on. Global is the default because a
          document with no country answers questions asked from anywhere. */}
      {/* Two questions, then the act, then what it will take. Laid out as a
          form rather than as a row of controls: "Published by" and "Shelve
          under" are fields with answers, and a select floating beside a button
          reads as a toolbar nobody knows the order of. */}
      <div className="mx-auto mt-7 max-w-xl text-left">
        <div className="grid gap-4 sm:grid-cols-2">
          <Picker
            label="Published by"
            hint="Named in every citation."
            value={publisher}
            onChange={onPublisher}
            options={
              sources.length === 0
                ? [{ value: '', label: 'No sources yet' }]
                : sources.map((s) => ({ value: s.id, label: s.name }))
            }
          />
          <Picker
            label="Shelve under"
            hint="Global answers from anywhere."
            value={target}
            onChange={onTarget}
            options={[
              { value: GLOBAL, label: 'Global' },
              ...countries.map((c) => ({ value: c.iso2, label: `${c.flag} ${c.name}${c.isActive ? '' : ' (off)'}` })),
            ]}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={onBrowse}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold whitespace-nowrap text-gold-dark shadow-sm transition hover:bg-gold/90"
          >
            <Paperclip className="size-4" />
            Browse files
          </button>

          <label className="flex flex-1 items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={shareOnUpload}
              onChange={(e) => onShareOnUpload(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-teal)]"
            />
            <span>
              Let visitors download these
              <span className="block text-xs text-ink-muted">
                Ma’at offers a copy when its answer rests on one. Off unless you say so.
              </span>
            </span>
          </label>
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-1.5">
          {ACCEPTED_EXTENSIONS.map((extension) => (
            <li
              key={extension}
              className="rounded-md bg-white/70 px-2 py-1 text-[11px] font-bold tracking-wide text-teal ring-1 ring-teal/15"
            >
              {extension.slice(1).toUpperCase()}
            </li>
          ))}
        </ul>
      </div>

    </section>
  )
}

/** A labelled select. The native arrow cannot be moved off the edge, so it is
 *  suppressed and redrawn inside the control's own padding. */
function Picker({
  hint,
  label,
  onChange,
  options,
  value,
}: {
  hint: string
  label: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  value: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</span>
      <span className="relative mt-1.5 block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none truncate rounded-xl border border-line bg-white pr-10 pl-4 text-sm font-medium text-teal-deep shadow-sm transition hover:border-teal/40 focus:border-gold focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
        />
      </span>
      <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
    </label>
  )
}

/** One country's documents, or the global ones. Collapsible, open by default. */
/**
 * Shelves start closed. The heading already says what the reader needs to
 * choose one (country, how many documents, how much), and twenty rows a shelf
 * across several countries would push everything but the first shelf below
 * the fold. Opening one is remembered in this browser, so a reader who works
 * on Nigeria finds Nigeria open tomorrow. A search opens every shelf that has
 * a match, since hidden results are no results, and a shelf that has just
 * received an upload opens to show it landed.
 */
function Shelf({
  bytes,
  country,
  documents,
  flag,
  label,
  note,
  openBecause,
  query,
}: {
  bytes: number
  country: string
  documents: DocumentRow[]
  flag: string
  label: string
  note: string
  openBecause: boolean
  query: string
}) {
  const [open, setOpen] = useState(() => openBecause || rememberedOpen(country))
  const [page, setPage] = useState(0)
  const [searched, setSearched] = useState(query)
  const [landed, setLanded] = useState(openBecause)

  // A new search starts at the first page and shows its matches. Adjusted
  // during render rather than in an effect: an effect would paint the old
  // page first and then correct it, which shows as a flicker.
  if (searched !== query) {
    setSearched(query)
    setPage(0)
    if (query) setOpen(true)
  }
  if (openBecause !== landed) {
    setLanded(openBecause)
    if (openBecause) setOpen(true)
  }

  const toggle = () => {
    setOpen((v) => {
      rememberOpen(country, !v)
      return !v
    })
  }

  // Each shelf pages on its own, so the ladder is the one every other list in
  // the dashboard uses rather than a number chosen for this table.
  const pageSize = useRowsPerPage()
  const pages = Math.max(1, Math.ceil(documents.length / pageSize))
  // Belt and braces for any other way the list can shorten under the reader:
  // a page that no longer exists renders as an empty table, not as no results.
  const current = Math.min(page, pages - 1)
  const start = current * pageSize
  const visible = documents.slice(start, start + pageSize)

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* The title strip carries the same bevel the customer support fly-out
          gives its heading: a wash across the top, a shade at the foot, and a
          soft shadow seating it on the rows below. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="bevel-strip relative z-10 flex w-full items-center gap-3 bg-sand px-5 py-3.5 text-left transition hover:bg-cream"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {flag || <Globe className="size-5 text-teal" />}
        </span>
        <span className="min-w-0">
          <span className="block font-bold tracking-tight text-teal-deep">{label}</span>
          <span className="block text-xs text-ink-muted">{note}</span>
        </span>
        <span className="ml-auto shrink-0 text-xs text-ink-muted">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} · {formatBytes(bytes)}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs tracking-wide text-ink-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-5 pt-4 pb-2.5 font-medium">Document</th>
                <th className="min-w-[15rem] px-5 pt-4 pb-2.5 font-medium">Issuing body</th>
                <th className="px-5 pt-4 pb-2.5 font-medium">Published</th>
                <th className="px-5 pt-4 pb-2.5 font-medium">Passages</th>
                <th className="px-5 pt-4 pb-2.5 font-medium">Size</th>
                <th className="px-5 pt-4 pb-2.5 font-medium">Shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((doc) => (
                <tr key={doc.id} className="align-top transition hover:bg-sand/60">
                  <td className="px-5 py-3">
                    <span className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{doc.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                          <span className="rounded bg-teal-soft px-1.5 py-0.5 font-bold text-teal">
                            {fileKind(doc.filename)}
                          </span>
                          <span className="truncate">{doc.filename}</span>
                          {doc.version > 1 && <span>v{doc.version}</span>}
                          <Status status={doc.status} />
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {/* The publisher's own mark, the same one the register shows, so a
                        document is recognised by who issued it before its title is read. */}
                    <span className="flex items-center gap-2.5">
                      <SourceMark
                        size="sm"
                        source={{
                          name: doc.source,
                          short: doc.sourceShort || monogram(doc.source),
                          logoUrl: doc.sourceLogo || '',
                          brand: doc.sourceBrand || 'var(--color-teal)',
                          isDefault: doc.source === 'Ma’at',
                        }}
                      />
                      <span className="min-w-0 leading-snug">{doc.source}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-muted">
                    {day.format(new Date(doc.publishedAt))}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{doc.chunks.toLocaleString('en-GB')}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-muted">{formatBytes(doc.bytes)}</td>
                  <td className="px-5 py-3">
                    <ShareToggle doc={doc} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && pages > 1 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 text-xs text-ink-muted">
          <span>
            Showing {start + 1}–{start + visible.length} of {documents.length}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <PageButton label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="size-4" />
            </PageButton>
            <span className="px-2 font-medium text-ink">
              {current + 1} / {pages}
            </span>
            <PageButton label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        </div>
      )}
    </section>
  )
}

function PageButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-full border border-line text-teal-deep transition hover:border-teal/40 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

/**
 * Whether Ma'at may pass this copy on when a visitor asks for it.
 *
 * It sits on the document's own row because that is where the decision is: a
 * ministry's gazette may be freely shareable while its internal circular from
 * the same source is not, so the choice cannot live on the source.
 */
const SHELF_KEY = 'maat.documents.open.'

function rememberedOpen(country: string): boolean {
  try {
    return localStorage.getItem(SHELF_KEY + (country || 'global')) === '1'
  } catch {
    return false
  }
}

function rememberOpen(country: string, open: boolean) {
  try {
    localStorage.setItem(SHELF_KEY + (country || 'global'), open ? '1' : '0')
  } catch {
    // A private window forgets; the shelf still opens for this visit.
  }
}

function ShareToggle({ doc }: { doc: DocumentRow }) {
  const [shared, setShared] = useState(doc.isPublic)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shared}
      aria-label={`Let visitors download ${doc.title}`}
      onClick={() => setShared((v) => !v)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1 transition',
        shared
          ? 'bg-verified-soft text-verified ring-verified/30'
          : 'bg-white text-ink-muted ring-line hover:text-teal-deep',
      )}
    >
      <Share2 className="size-3" />
      {shared ? 'Shared' : 'Private'}
    </button>
  )
}

/** Only says anything when there is something to say: ready is the silent case. */
function Status({ status }: { status: DocumentRow['status'] }) {
  if (status === 'ready') return null
  if (status === 'ingesting') return <span className="font-medium text-teal">Being read</span>
  return <span className="font-medium text-unverified">Could not be read</span>
}
