import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Gives a chart the exact pixel width of its box and remounts it when that box
 * settles at a new size. ApexCharts keeps its old plot geometry when the window
 * shrinks, which would otherwise leave a half-drawn chart on a phone rotation.
 * The measurement is debounced so a slow window drag does not remount per pixel.
 */
export function Fit({ children }: { children: (width: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      window.clearTimeout(timer)
      // First measurement paints at once; later ones wait for the drag to stop.
      timer = window.setTimeout(() => setWidth((current) => (current === next ? current : next)), 120)
      if (width === 0) setWidth(next)
    })
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className="w-full min-w-0">
      {width > 0 && <Fragment key={width}>{children(width)}</Fragment>}
    </div>
  )
}
