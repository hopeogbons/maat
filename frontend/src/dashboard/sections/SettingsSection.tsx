import { cn } from 'cn'
import { ChevronDown, CircleAlert, Plus, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  coverCountry,
  dropCountry,
  getReference,
  getSettings,
  saveSettings,
  setCountryActive,
  type AppSettings,
  type CoveredCountry,
  type Reference,
  connectTelegram,
  disconnectTelegram,
  getTelegram,
  type TelegramStatus,
} from '@/lib/api'

/**
 * The rules Ma'at runs by, and the countries it will answer for.
 *
 * Coverage is here rather than on the Sources page because it is a decision
 * about what Ma'at claims to know, not a consequence of which feeds happen to
 * exist. Every country list in the dashboard reads from this one, so a country
 * that is not covered here cannot be chosen anywhere, and nobody can narrow a
 * search to a country Ma'at has nothing to answer with.
 */
export function SettingsSection() {
  const [numbers, setNumbers] = useState<AppSettings | null>(null)
  const [countries, setCountries] = useState<CoveredCountry[]>([])
  const [reference, setReference] = useState<Reference | null>(null)
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings()
      .then(({ settings, countries: list }) => {
        setNumbers(settings)
        setCountries(list)
      })
      .catch((e: Error) => setError(e.message))
    getReference()
      .then(setReference)
      .catch(() => setReference(null))
  }, [])

  const uncovered = useMemo(() => {
    const have = new Set(countries.map((c) => c.iso2))
    return (reference?.countries ?? []).filter((c) => !have.has(c.iso2))
  }, [countries, reference])

  const on = countries.filter((c) => c.isActive).length

  const run = (work: Promise<{ settings: AppSettings; countries: CoveredCountry[] }>) => {
    setError('')
    work
      .then(({ settings, countries: list }) => {
        setNumbers(settings)
        setCountries(list)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 1800)
      })
      .catch((e: Error) => setError(e.message))
  }

  if (!numbers) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-muted">
        {error || 'Loading the settings…'}
      </p>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-unverified-soft px-4 py-3 text-sm text-unverified">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Panel
        title="Countries"
        note="Which countries Ma’at has sources for. Every country list in the dashboard is drawn from this one."
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <Count value={on} label={on === 1 ? 'country active' : 'countries active'} />
          <Count value={countries.length - on} label="switched off" muted />
          <Count value={1} label="global, always on" muted />
        </div>

        <ul className="mt-5 space-y-2.5">
          {countries.map((c) => (
            <li
              key={c.iso2}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {c.flag}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-teal-deep">{c.name}</span>
                <span className="block text-xs text-ink-muted">{c.iso2}</span>
              </span>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.isActive}
                  aria-label={`${c.isActive ? 'Switch off' : 'Switch on'} ${c.name}`}
                  onClick={() => run(setCountryActive(c.iso2, !c.isActive))}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition',
                    c.isActive ? 'bg-verified' : 'bg-line',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all',
                      c.isActive ? 'left-[1.375rem]' : 'left-0.5',
                    )}
                  />
                </button>
                <span className={cn('w-16 text-xs font-medium', c.isActive ? 'text-verified' : 'text-ink-muted')}>
                  {c.isActive ? 'Active' : 'Off'}
                </span>
                <button
                  type="button"
                  onClick={() => run(dropCountry(c.iso2))}
                  aria-label={`Stop covering ${c.name}`}
                  className="ml-1 inline-flex size-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-unverified-soft hover:text-unverified"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}

          {countries.length === 0 && (
            <li className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
  No country added yet. Ma’at answers globally only.
            </li>
          )}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="relative inline-flex">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="Country to add"
              className="h-11 w-60 appearance-none truncate rounded-xl border border-line bg-white pr-10 pl-4 text-sm text-ink transition hover:border-teal/40 focus:border-gold focus:outline-none"
            >
              <option value="">Choose a country…</option>
              {uncovered.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
            />
          </span>
          <button
            type="button"
            disabled={!adding}
            onClick={() => {
              run(coverCountry(adding))
              setAdding('')
            }}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-gold-dark shadow-sm transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
            Add country
          </button>
          <p className="text-xs text-ink-muted">
Added switched off. Turn it on once its sources are working.
          </p>
        </div>
      </Panel>

      <TelegramPanel />

      <Panel title="Verdict thresholds" note="What Ma’at must be sure of before it answers, and what it takes to publish a rumour.">
        <Number
          label="Confidence gate"
          hint="Below this, Ma’at says the record does not settle it and offers to look further. It sits on the judgement that a passage supports or contradicts the claim, never on how similar the text looked."
          value={numbers.confidence_gate}
          onSave={(v) => run(saveSettings({ confidence_gate: v }))}
          suffix="%"
        />
        <Number
          label="Reporters before publishing"
          hint="How many different people must raise the same rumour before it gets a public page. Counted per browser, not per mention."
          value={numbers.mentions_before_publish}
          onSave={(v) => run(saveSettings({ mentions_before_publish: v }))}
        />
        <Number
          label="Follow-up questions"
          hint="The most Ma’at will ask before answering. The interview must not become an interrogation."
          value={numbers.max_followup_questions}
          onSave={(v) => run(saveSettings({ max_followup_questions: v }))}
        />
      </Panel>

      <Panel title="Rate limits and retention" note="What a public, unauthenticated widget may cost, and how long a visitor’s own words are kept.">
        <Number
          label="Questions per visitor"
          hint="Per hour. Met with an honest “try again shortly”, never a blank failure."
          value={numbers.questions_per_visitor_per_hour}
          onSave={(v) => run(saveSettings({ questions_per_visitor_per_hour: v }))}
          suffix="/hour"
        />
        <Number
          label="Daily question cap"
          hint="Across everyone. The backstop an attacker cannot rotate around by changing address."
          value={numbers.daily_question_cap}
          onSave={(v) => run(saveSettings({ daily_question_cap: v }))}
        />
        <Number
          label="Raw text retention"
          hint="Days the visitor’s own words are kept for abuse handling. After that only the neutral paraphrase remains."
          value={numbers.raw_text_retention_days}
          onSave={(v) => run(saveSettings({ raw_text_retention_days: v }))}
          suffix=" days"
        />
      </Panel>

      {saved && (
        <p className="fixed right-6 bottom-6 z-30 rounded-full bg-teal-deep px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          Saved
        </p>
      )}
    </div>
  )
}

function Panel({ children, note, title }: { children: React.ReactNode; note: string; title: string }) {
  return (
    <section className="panel-glow relative isolate overflow-hidden rounded-2xl border border-teal/20 bg-teal-soft/45 p-5 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-75" />
      </div>
      <h2 className="font-serif text-lg font-bold tracking-tight text-teal-deep">{title}</h2>
      <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">{note}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Count({ label, muted, value }: { label: string; muted?: boolean; value: number }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={cn('font-serif text-3xl font-bold tracking-tight', muted ? 'text-ink-muted' : 'text-teal-deep')}>
        {value}
      </span>
      <span className="text-sm text-ink-muted">{label}</span>
    </span>
  )
}

/**
 * One number, saved when it is committed rather than on every keystroke.
 *
 * Saving per keystroke would send "1", "12", then "125" for a cap of 125, and
 * the server would briefly hold a limit nobody chose.
 */
function Number({
  hint,
  label,
  onSave,
  suffix,
  value,
}: {
  hint: string
  label: string
  onSave: (value: number) => void
  suffix?: string
  value: number
}) {
  const [draft, setDraft] = useState(String(value))
  const [known, setKnown] = useState(value)
  if (known !== value) {
    setKnown(value)
    setDraft(String(value))
  }

  const commit = () => {
    const next = globalThis.Number(draft)
    if (!globalThis.Number.isFinite(next) || next === value) {
      setDraft(String(value))
      return
    }
    onSave(Math.round(next))
  }

  return (
    <label className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-teal/15 py-3.5 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-teal-deep">{label}</span>
        <span className="mt-0.5 block max-w-xl text-xs leading-relaxed text-ink-muted">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-11 w-28 rounded-xl border border-line bg-white px-3 text-right text-sm font-medium text-ink transition hover:border-teal/40 focus:border-gold focus:outline-none"
        />
        {suffix && <span className="text-sm text-ink-muted">{suffix}</span>}
      </span>
    </label>
  )
}



/**
 * The Telegram bot. One paste of the token BotFather gives, and the bot
 * answers on the phone the way the widget does on the page. The token is
 * verified with Telegram before it is kept, and never shown again after.
 */
function TelegramPanel() {
  const [bot, setBot] = useState<TelegramStatus | null>(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTelegram()
      .then(setBot)
      .catch((e: Error) => setError(e.message))
  }, [])

  const settle = (work: Promise<TelegramStatus>) => {
    setBusy(true)
    setError('')
    work
      .then((next) => {
        setBot(next)
        setToken('')
      })
      .catch((e: Error & { body?: { detail?: string } }) => setError(e.body?.detail ?? e.message))
      .finally(() => setBusy(false))
  }

  const when = (iso: string) => (iso ? new Date(iso).toLocaleString() : '')

  return (
    <Panel
      title="Telegram"
      note="Make a bot with BotFather, paste its token here, and people can text or send Ma’at voice notes from their phone. The API must be reachable over HTTPS for Telegram to deliver messages."
    >
      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-unverified-soft px-4 py-3 text-sm text-unverified">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {bot?.connected ? (
        <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-ink-muted">Bot</dt>
            <dd className="font-semibold text-ink">
              <a href={`https://t.me/${bot.username}`} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                @{bot.username}
              </a>
            </dd>
            <dt className="text-ink-muted">Webhook</dt>
            <dd className="truncate font-mono text-xs text-ink">{bot.webhookUrl}</dd>
            <dt className="text-ink-muted">Connected</dt>
            <dd className="text-ink">{when(bot.connectedAt)}</dd>
            <dt className="text-ink-muted">Messages</dt>
            <dd className="text-ink">
              {bot.messages}
              {bot.lastUpdateAt ? ` · last ${when(bot.lastUpdateAt)}` : ''}
            </dd>
          </dl>
          {bot.lastError && <p className="text-xs text-unverified">{bot.lastError}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => settle(disconnectTelegram())}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-unverified/40 hover:text-unverified disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-4" />
            Disconnect
          </button>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (token.trim() || bot?.hasEnvToken) settle(connectTelegram(token.trim()))
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={bot?.hasEnvToken ? 'Token already on the server; connect, or paste another' : 'Bot token from BotFather, e.g. 123456789:ABC…'}
            aria-label="Telegram bot token"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 font-mono text-sm text-ink transition hover:border-teal/40 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || (!token.trim() && !bot?.hasEnvToken)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-gold-dark shadow-sm transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-4" />
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      )}
    </Panel>
  )
}
