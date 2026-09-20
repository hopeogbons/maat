import { useEffect, useState } from 'react'

/**
 * How many rows a page shows, by how much room the screen has.
 *
 * A page size is a reading decision, not a data decision. Twenty threads on a
 * desktop is a glance; twenty on a phone is a thumb-ache, and the reader
 * scrolls past the pager without ever learning there was one. So the count
 * falls with the viewport, and the pager does the work the scroll was doing.
 *
 * Driven by matchMedia rather than a resize listener: the browser already
 * knows when a breakpoint is crossed and says so once, instead of firing on
 * every pixel of a drag.
 */

/** Tailwind's breakpoints, in the order they widen. */
const BREAKPOINTS = [
  ['xl', '(min-width: 1280px)'],
  ['lg', '(min-width: 1024px)'],
  ['md', '(min-width: 768px)'],
  ['sm', '(min-width: 640px)'],
] as const

export type Ladder = { base: number; sm: number; md: number; lg: number; xl: number }

/**
 * Cards and tall rows: a source card, a conversation thread, a document row.
 * Six on a phone, twenty on a desktop, and the steps between chosen so each
 * one is about a screenful rather than a fraction of one.
 */
export const ROWS: Ladder = { base: 6, sm: 8, md: 12, lg: 16, xl: 20 }

/**
 * The compact table view, where a row is one line rather than a card. It can
 * afford more of everything, but it still must not hand a phone fifty rows.
 */
export const DENSE_ROWS: Ladder = { base: 8, sm: 12, md: 20, lg: 35, xl: 50 }

function measure(ladder: Ladder): number {
  // Server-rendered or in a test environment: take the widest, because a page
  // that has not measured yet should not flash six rows and then twenty.
  if (typeof window === 'undefined' || !window.matchMedia) return ladder.xl
  for (const [key, query] of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return ladder[key]
  }
  return ladder.base
}

export function useRowsPerPage(ladder: Ladder = ROWS): number {
  const [rows, setRows] = useState(() => measure(ladder))

  useEffect(() => {
    if (!window.matchMedia) return
    const lists = BREAKPOINTS.map(([, query]) => window.matchMedia(query))
    const recheck = () => setRows(measure(ladder))
    lists.forEach((list) => list.addEventListener('change', recheck))
    recheck()
    return () => lists.forEach((list) => list.removeEventListener('change', recheck))
  }, [ladder])

  return rows
}
