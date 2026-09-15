import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { TopSource } from '@/lib/api'
import { SourceMark } from './SourceMark'

/**
 * The bodies holding most of what Ma'at can cite, with each one's share of
 * it. Counted by the server over the documents currently shown, so the list
 * moves as the corpus does and says nothing about a country switched off.
 */
export function TopSources({ sources, countryName }: { sources: TopSource[]; countryName: (iso2: string) => string }) {
  return (
    <section>
      <h2 className="font-serif text-[1.65rem] font-bold tracking-tight text-teal-deep">Top sources</h2>
      {sources.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-muted">Nothing has been ingested yet. The first poll fills this in.</p>
      ) : (
        <ul className="mt-7 space-y-4">
          {sources.map((s) => (
            <li key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4">
              <SourceMark source={s} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold text-teal-deep" title={s.name}>
                  {s.name}
                </span>
                <span className="block truncate text-[12px] text-ink-soft">
                  {s.country ? countryName(s.country) : 'Global'} · {s.documents.toLocaleString('en-GB')}{' '}
                  {s.documents === 1 ? 'document' : 'documents'}
                </span>
              </span>
              <span className="w-12 text-right text-[14px] font-bold text-ink tabular-nums">{s.share}%</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/sources"
        className="mt-5 -ml-1 inline-flex min-h-10 items-center gap-1 px-1 text-[13px] font-semibold text-teal transition hover:text-teal-deep"
      >
        View more
        <ChevronRight className="size-4" />
      </Link>
    </section>
  )
}
