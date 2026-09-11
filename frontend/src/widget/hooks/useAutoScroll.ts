import { useLayoutEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/**
 * Keeps a scrolling container pinned to its newest content. Pass a value that
 * changes whenever content is appended (e.g. message count + pending flag).
 */
export function useAutoScroll<T extends HTMLElement>(signal: string | number) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [signal])

  return ref
}
