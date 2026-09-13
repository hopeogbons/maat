import { useEffect, useRef, useState } from 'react'

/**
 * The rendered width of a chart's own box. Bar thickness is capped in pixels,
 * and Apex only takes a percentage of the slot, so the cap needs a measurement.
 */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

/**
 * The percentage of each slot a bar may fill so it never renders thicker than
 * `maxPx`. Falls back to `preferred` until the box has been measured.
 */
export function cappedBarWidth(plotWidth: number, slots: number, maxPx = 24, preferred = 58) {
  if (!plotWidth || !slots) return `${preferred}%`
  const slot = plotWidth / slots
  return `${Math.max(8, Math.min(preferred, Math.round((maxPx / slot) * 100)))}%`
}
