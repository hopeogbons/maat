import { useEffect, useRef } from 'react'

const BAR = 3
const GAP = 2
const MIN_BAR = 2
/** Readings kept, enough to fill any width the meter can be given. */
const HISTORY = 600

/**
 * The voice, moving, the way messaging apps draw a recording: a waveform of
 * loudness bars that scrolls in from the right and fills whatever width the
 * row gives it, so it stretches with the panel. Drawn on a canvas at screen
 * resolution, straight from the microphone's analyser, outside React's
 * render loop: sixty small frames a second cost nothing this way.
 */
export function LevelMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return
    const context = canvas.getContext('2d')
    if (!context) return

    const samples = new Uint8Array(analyser.fftSize)
    const history = new Float32Array(HISTORY)
    let head = 0
    let frame = 0
    // The bars take the row's accent colour, read once from the theme.
    const colour = getComputedStyle(canvas).color || 'currentColor'

    const draw = () => {
      frame = requestAnimationFrame(draw)

      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (let i = 0; i < samples.length; i++) {
        const centred = (samples[i] - 128) / 128
        sum += centred * centred
      }
      // RMS of speech at a normal distance sits low on a linear scale, so it
      // is lifted on a curve: quiet speech still moves, shouting tops out.
      const level = Math.min(1, Math.pow(Math.sqrt(sum / samples.length) * 4, 0.75))
      history[head] = level
      head = (head + 1) % HISTORY

      // Size the drawing buffer to the element every frame: the row changes
      // width when the panel is expanded, and a stale buffer would stretch.
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) return
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      context.fillStyle = colour

      const bars = Math.floor((width + GAP) / (BAR + GAP))
      const middle = height / 2
      for (let i = 0; i < bars; i++) {
        // Newest reading at the right edge, older ones marching left.
        const index = (head - 1 - i + HISTORY * 2) % HISTORY
        const value = i < HISTORY ? history[index] : 0
        const barHeight = Math.max(MIN_BAR, value * height)
        const x = width - (i + 1) * (BAR + GAP) + GAP
        context.beginPath()
        context.roundRect(x, middle - barHeight / 2, BAR, barHeight, BAR / 2)
        context.fill()
      }
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [analyser])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="maat:h-6 maat:min-w-0 maat:flex-1 maat:text-primary"
    />
  )
}
