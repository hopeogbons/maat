import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDashboard, getReference, type DashboardStats, type Reference } from '@/lib/api'
import { RANGES, type RangeKey } from '../data'
import { percent } from '../theme'
import { ChannelPanel } from '../components/ChannelPanel'
import { PromoCard } from '../components/PromoCard'
import { RangeSelect } from '../components/RangeSelect'
import { StatInline } from '../components/StatInline'
import { TopSources } from '../components/TopSources'
import { ActivityLine } from '../components/charts/ActivityLine'

/** Nothing counted yet: the shape the page has before the first request answers, and when it fails. */
const EMPTY: DashboardStats = {
  days: 7,
  weighed: 0,
  weighedBefore: 0,
  cited: 0,
  citedBefore: 0,
  documents: 0,
  documentsBefore: 0,
  verdicts: [0, 0, 0],
  published: 0,
  activity: [],
  topSources: [],
}

/**
 * The front page, from the record. Every figure is counted by the server for
 * the chosen range and the range before it; the arrows compare the two. A
 * young corpus shows small numbers, which is the truthful thing to show.
 */
export function Overview({
  range,
  onRangeChange,
  heading,
}: {
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  heading: ReactNode
}) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY)
  const [reference, setReference] = useState<Reference | null>(null)
  const days = RANGES.find((r) => r.key === range)?.days ?? 7

  useEffect(() => {
    let live = true
    getDashboard(days)
      .then((s) => live && setStats(s))
      .catch(() => live && setStats(EMPTY))
    return () => {
      live = false
    }
  }, [days])
  useEffect(() => {
    getReference()
      .then(setReference)
      .catch(() => setReference(null))
  }, [])

  const countryName = useMemo(() => {
    const map = new Map<string, string>()
    reference?.countries.forEach((c) => map.set(c.iso2, c.name))
    return (iso2: string) => map.get(iso2) ?? iso2
  }, [reference])

  const citedShare = stats.weighed ? (stats.cited / stats.weighed) * 100 : 0
  const citedShareBefore = stats.weighedBefore ? (stats.citedBefore / stats.weighedBefore) * 100 : 0

  return (
    <div className="space-y-14">
      <div className="grid min-w-0 items-start gap-x-14 gap-y-8 xl:grid-cols-[1fr_24rem]">
        <div>
          {heading}
          <div className="mt-9 grid grid-cols-3 gap-x-4 gap-y-6 sm:mt-11 sm:flex sm:flex-wrap sm:items-end sm:gap-x-10">
            <StatInline label="Weighed" value={stats.weighed.toLocaleString('en-GB')} up={stats.weighed >= stats.weighedBefore} />
            <StatInline label="Cited" value={percent(citedShare, 0)} up={citedShare >= citedShareBefore} />
            <StatInline
              label="Documents in"
              value={stats.documents.toLocaleString('en-GB')}
              up={stats.documents >= stats.documentsBefore}
            />
          </div>
        </div>
        <PromoCard counts={stats.verdicts} published={stats.published} />
      </div>

      <div className="grid min-w-0 items-start gap-x-14 gap-y-10 xl:grid-cols-[1fr_24rem]">
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-[1.65rem] font-bold tracking-tight text-teal-deep">Activity</h2>
            <div className="flex items-center gap-4">
              <p className="hidden text-xs text-ink-soft sm:block">Rumours raised, by day</p>
              <RangeSelect value={range} onChange={onRangeChange} />
            </div>
          </div>
          <div className="mt-4 min-w-0 sm:-ml-2">
            <ActivityLine
              dates={stats.activity.map((r) => r.date)}
              values={stats.activity.map((r) => r.verified + r.unverified + r.insufficient)}
            />
          </div>
        </section>

        <TopSources sources={stats.topSources} countryName={countryName} />
      </div>

      <ChannelPanel />
    </div>
  )
}
