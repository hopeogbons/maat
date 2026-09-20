import { cn } from 'cn'
import { ChevronDown, Languages, MessageSquare, Repeat2, Search, ShieldAlert, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  getConversations,
  getTranscript,
  type ConversationThread,
  type ConversationsPage,
  type Transcript,
} from '@/lib/api'
import { LANGUAGES } from '@/i18n'
import { Pager } from '../components/Pager'
import { useRowsPerPage } from '../useRowsPerPage'
import { VerdictPill } from '../components/VerdictPill'

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const VERDICTS = ['verified', 'unverified', 'insufficient'] as const

/**
 * Who has been asking, and what they asked.
 *
 * Grouped by browser, not by conversation: the widget starts a fresh
 * conversation whenever a session cookie turns over, so somebody who came
 * back on Tuesday would otherwise look like a stranger. A thread is one
 * browser; the visits inside it are its conversations.
 *
 * Nobody here has a name, and nothing on this page can give them one. A
 * visitor is six characters of a cookie.
 */
export function Conversations() {
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [data, setData] = useState<{ key: string; payload: ConversationsPage } | null>(null)

  // Searching reads every turn of every conversation, so the request waits for
  // a pause in typing. Debounced from the event rather than from an effect on
  // `query`: the keystroke is what should start the clock, and an effect that
  // sets state on every render of a changing value is a render loop waiting to
  // happen.
  const timer = useRef(0)
  const search = (next: string) => {
    setQuery(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setTerm(next.trim())
      setPage(0)
    }, 300)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // What is on screen is whatever was last fetched, labelled with the page and
  // search it answers. Staleness is then derived rather than tracked: no
  // separate loading flag to set, and no window where a new request is in
  // flight but the old rows still look current.
  // Six threads on a phone, twenty on a desktop. The server pages, so the
  // size goes with the request rather than being applied to what came back.
  const rows = useRowsPerPage()
  const key = `${page}|${term}|${rows}`
  useEffect(() => {
    let live = true
    getConversations(page, term, rows)
      .then((payload) => live && setData({ key: `${page}|${term}|${rows}`, payload }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [page, term, rows])

  const payload = data?.payload ?? null
  const loading = data === null || data.key !== key
  const threads = payload?.threads ?? []
  const returning = payload?.returning ?? 0

  if (data === null) return <p className="text-sm text-ink-muted">Reading the record…</p>

  const searching = term.length > 0

  return (
    <div className="space-y-6">
      <SearchBox value={query} onChange={search} />

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <MessageSquare className="mx-auto size-8 text-ink-muted/50" />
          <p className="mt-3 font-semibold text-teal-deep">
            {searching ? 'Nothing matches that' : 'Nobody has asked anything yet'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {searching
              ? 'Search looks at what was said, what Ma’at understood, the claim, the verdict and the language.'
              : 'Every question put to the widget appears here, grouped by the browser that asked it.'}
          </p>
        </div>
      ) : (
        <Threads data={payload} threads={threads} returning={returning} loading={loading} onPage={setPage} />
      )}
    </div>
  )
}

/**
 * One box, searched on the server.
 *
 * It has to be the server: a thread is built by grouping conversations, and
 * a page of twenty browsers is all the browser ever holds, so filtering here
 * would only ever search what happens to be on screen.
 */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex h-11 w-full items-center rounded-full border border-line bg-white shadow-sm transition focus-within:border-gold hover:border-teal/40 sm:w-[30rem]">
      <Search aria-hidden="true" className="absolute left-3.5 size-4 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search questions, claims, verdicts"
        aria-label="Search conversations"
        className="h-full w-full min-w-0 rounded-full bg-transparent pr-9 pl-10 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear the search"
          className="absolute right-3 text-ink-muted transition hover:text-teal-deep"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  )
}

function Threads({
  data,
  threads,
  returning,
  loading,
  onPage,
}: {
  data: ConversationsPage | null
  threads: ConversationThread[]
  returning: number
  loading: boolean
  onPage: (page: number) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Browsers" value={data?.total ?? 0} hint="Each one a distinct visitor cookie." />
        <Stat
          label="Came back"
          value={returning}
          hint="Browsers with more than one visit."
          icon={Repeat2}
        />
        <Stat
          label="Questions"
          value={threads.reduce((n, t) => n + t.questions, 0)}
          hint="Claims weighed across every thread."
        />
      </div>

      <ul className={cn('space-y-3 transition-opacity', loading && 'opacity-50')}>
        {threads.map((thread) => (
          <Thread key={thread.visitor + thread.firstSeen} thread={thread} />
        ))}
      </ul>

      {data && (
        <Pager
          current={data.page}
          onPage={onPage}
          pages={data.pages}
          showing={{
            from: data.page * data.pageSize + 1,
            to: data.page * data.pageSize + threads.length,
          }}
          total={data.total}
          unit="browsers"
        />
      )}
    </div>
  )
}

/**
 * One figure, on the deep teal the Sources page uses for what it wants read
 * first, with the same gold pool behind it. The glow is a sibling rather than
 * a background image so it can spill past the text without tinting it.
 */
function Stat({
  label,
  value,
  hint,
  icon: Icon = UserRound,
}: {
  label: string
  value: number
  hint: string
  icon?: typeof UserRound
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-teal-deep px-3 py-4 text-white sm:px-5 sm:py-5">
      {/* The pool sits under the figure, not in a corner: the number is what
          the card is for, and the light should fall on it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-2 -z-10 size-40 rounded-full bg-[radial-gradient(circle,var(--color-gold)/0.3,transparent_68%)]"
      />
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-white/70 uppercase sm:text-[11px]">
        <Icon className="size-3.5 shrink-0 text-gold" />
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-gold sm:text-3xl">
        {value.toLocaleString('en-GB')}
      </p>
      {/* The sentence under a figure is for a reader with room to read it. On
          a phone the label above already says what the number counts. */}
      <p className="mt-1 hidden text-xs text-white/65 sm:block">{hint}</p>
    </div>
  )
}

function Thread({ thread }: { thread: ConversationThread }) {
  const [open, setOpen] = useState(false)
  const languages = thread.languages
    .map((code) => LANGUAGES.find((l) => l.code === code)?.englishName ?? code)
    .join(', ')

  return (
    <li
      className={cn(
        'panel-glow relative isolate overflow-hidden rounded-2xl border border-teal/20 bg-teal-soft/45 transition',
        !open && 'hover:panel-glow-lift',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80 font-bold text-teal ring-1 ring-white/70">
          {thread.visitor.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-teal-deep">Visitor {thread.visitor}</span>
            {thread.visits > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold-dark">
                <Repeat2 className="size-3" />
                {thread.visits} visits
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>{thread.questions} weighed</span>
            <span className="hidden sm:inline">· {thread.turns} messages</span>
            {languages && (
              <span className="hidden items-center gap-1 md:inline-flex">
                <span aria-hidden="true">·</span>
                <Languages className="size-3" />
                {languages}
              </span>
            )}
            <span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·{' '}
              </span>
              {when.format(new Date(thread.lastActive))}
            </span>
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {VERDICTS.filter((v) => thread.verdicts[v] > 0).map((v) => (
            <span key={v} className="inline-flex items-center gap-1">
              <VerdictPill verdict={v} />
              <span className="text-xs font-bold tabular-nums text-ink">{thread.verdicts[v]}</span>
            </span>
          ))}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-muted transition', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul className="border-t border-teal/15 bg-white/55 px-5 py-3">
          {thread.conversations.map((visit) => (
            <Visit key={visit.id} id={visit.id} startedAt={visit.startedAt} turns={visit.turns} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** One conversation inside a thread, with its transcript fetched on opening. */
function Visit({ id, startedAt, turns }: { id: string; startedAt: string; turns: number }) {
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [open, setOpen] = useState(false)

  const toggle = () => {
    setOpen(!open)
    if (!transcript) getTranscript(id).then(setTranscript).catch(() => undefined)
  }

  return (
    <li className="border-b border-line/60 py-2 last:border-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left text-sm"
      >
        <span className="font-medium text-teal-deep">{when.format(new Date(startedAt))}</span>
        <span className="text-xs text-ink-muted">{turns} messages</span>
        <ChevronDown
          className={cn('ml-auto size-3.5 text-ink-muted transition', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {transcript === null ? (
            <p className="text-xs text-ink-muted">Reading…</p>
          ) : (
            <>
              {transcript.turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                    turn.speaker === 'visitor'
                      ? 'bg-white text-ink ring-1 ring-line'
                      : 'ml-auto bg-teal-deep text-white',
                  )}
                >
                  <p className="whitespace-pre-wrap">{turn.said}</p>
                  <p
                    className={cn(
                      'mt-1 flex flex-wrap items-center gap-2 text-[11px]',
                      turn.speaker === 'visitor' ? 'text-ink-muted' : 'text-white/70',
                    )}
                  >
                    <span>{clock.format(new Date(turn.at))}</span>
                    {/* Retention is visible, not silent: staff should be able
                        to tell a restatement from what somebody actually typed. */}
                    {turn.expired && <span>· exact words no longer kept</span>}
                    {!turn.expired && turn.isParaphrase && <span>· as understood</span>}
                    {turn.isManipulation && (
                      <span className="inline-flex items-center gap-1 font-semibold text-unverified">
                        <ShieldAlert className="size-3" />
                        flagged
                      </span>
                    )}
                  </p>
                </div>
              ))}

              {transcript.claims.length > 0 && (
                <dl className="mt-3 space-y-1.5 rounded-xl bg-white p-3 ring-1 ring-line">
                  {transcript.claims.map((claim, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {claim.verdict && (
                        <VerdictPill verdict={claim.verdict as 'verified'} className="shrink-0" />
                      )}
                      <span className="min-w-0 text-ink">{claim.what || claim.rumour}</span>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </div>
      )}
    </li>
  )
}
