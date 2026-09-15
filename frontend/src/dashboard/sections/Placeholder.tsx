import { ArrowUpRight } from 'lucide-react'
import type { NavItem } from '../nav'

/** Honest empty state for the sections this sample does not build out. */
export function Placeholder({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <section className="flex min-h-[26rem] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-teal-soft text-teal">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-teal-deep">{item.label}</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        This section is part of the dashboard's shape but has no screen yet. Overview shows the
        patterns the rest will be built from: stat tiles, a chart card with a table twin, and one
        shared date filter.
      </p>
      <a
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-gold-dark transition hover:bg-gold/90"
      >
        Back to overview
        <ArrowUpRight className="size-4" />
      </a>
    </section>
  )
}
