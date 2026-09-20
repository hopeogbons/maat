/**
 * Cutting a cited passage down to what the reader actually needs.
 *
 * Ma'at is not republishing the document. It is showing enough of it that
 * somebody can see the sentence the verdict rests on, in context, and decide
 * whether to open the original. A whole page pasted into a chat bubble is
 * harder to judge than two lines, not easier, and it buries the next source
 * under a scroll.
 */

/** Characters of run-up before the marked sentence: a line or two. */
const LEAD_IN = 180

/** Characters after it, so the sentence does not end on a cliff. */
const RUN_ON = 90

/** A passage shorter than this is already an excerpt; leave it whole. */
const WHOLE = 320

export interface Excerpt {
  before: string
  marked: string
  after: string
  /** True when text was cut, so the view can show an ellipsis there. */
  openedEarlier: boolean
  continuesAfter: boolean
}

/**
 * The window around `highlight`, snapped outwards to sentence boundaries so
 * the excerpt starts and ends where the document does, not mid-word.
 */
export function excerpt(quote: string, highlight: [number, number] | null): Excerpt {
  const [start, end] = highlight ?? [-1, -1]
  const marked = start >= 0 && end > start && end <= quote.length

  if (!marked) {
    const cut = quote.length > WHOLE
    return {
      before: '',
      marked: '',
      after: cut ? trimToSentence(quote.slice(0, WHOLE)) : quote,
      openedEarlier: false,
      continuesAfter: cut,
    }
  }

  const from = boundaryBefore(quote, Math.max(0, start - LEAD_IN), start)
  const to = boundaryAfter(quote, Math.min(quote.length, end + RUN_ON), end)
  return {
    before: quote.slice(from, start),
    marked: quote.slice(start, end),
    after: quote.slice(end, to),
    openedEarlier: from > 0,
    continuesAfter: to < quote.length,
  }
}

/** The first sentence start at or after `from`, falling back to `from`. */
function boundaryBefore(text: string, from: number, limit: number): number {
  if (from === 0) return 0
  const window = text.slice(from, limit)
  const match = window.search(/[.!?]\s+|\n/)
  if (match === -1) return from
  const after = window.slice(match).search(/\S/)
  return from + match + (after === -1 ? 1 : after)
}

/** The first sentence end at or after `to`, without running past the text. */
function boundaryAfter(text: string, to: number, from: number): number {
  const window = text.slice(from, to)
  const match = window.search(/[.!?](\s|$)/)
  return match === -1 ? to : from + match + 1
}

/** Drop a dangling part-sentence from the end of a cut passage. */
function trimToSentence(text: string): string {
  const last = Math.max(text.lastIndexOf('. '), text.lastIndexOf('! '), text.lastIndexOf('? '))
  return last > text.length / 2 ? text.slice(0, last + 1) : text.trimEnd()
}
