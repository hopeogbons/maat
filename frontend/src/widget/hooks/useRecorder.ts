import { useCallback, useEffect, useRef, useState } from 'react'

/** The longest voice note the widget will take, in seconds. */
export const MAX_NOTE_SECONDS = 60

/**
 * Containers in the order we would rather have them. Chrome and Firefox
 * record Opus in WebM; Safari records AAC in MP4. Each is one the server's
 * transcriber accepts as is, so nothing is converted on either side.
 */
const CONTAINERS: { mime: string; ext: string }[] = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
]

function pickContainer() {
  if (typeof MediaRecorder === 'undefined') return null
  return CONTAINERS.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null
}

export type RecorderState = 'idle' | 'recording' | 'preview'
export type RecorderError = 'unsupported' | 'denied' | null

/**
 * The microphone, as three states: idle, recording, and a preview of what
 * was recorded, which the visitor can play back and then send or throw away.
 * Nothing leaves the browser until they choose to send it.
 */
export function useRecorder() {
  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickContainer() !== null
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<RecorderError>(supported ? null : 'unsupported')
  const [take, setTake] = useState<{ file: File; url: string } | null>(null)
  /** The microphone's analyser while recording, for a meter to draw from; null otherwise. */
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | null>(null)
  // The source node is kept here on purpose. A node that is not wired to the
  // speakers and not referenced anywhere is garbage-collected, and the
  // analyser then reads silence: the meter went flat after a few seconds.
  const meter = useRef<{ context: AudioContext; source: MediaStreamAudioSourceNode; analyser: AnalyserNode } | null>(
    null,
  )

  const releaseTake = useCallback(() => {
    setTake((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  const stopTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }

  const stopMeter = () => {
    const active = meter.current
    if (!active) return
    active.source.disconnect()
    void active.context.close().catch(() => {})
    meter.current = null
    setAnalyser(null)
  }

  /** Wire the stream to an analyser the meter can read the voice from. */
  const startMeter = (stream: MediaStream) => {
    const Context = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return
    let context: AudioContext
    try {
      context = new Context()
    } catch {
      return
    }
    const node = context.createAnalyser()
    node.fftSize = 1024
    node.smoothingTimeConstant = 0.6
    const source = context.createMediaStreamSource(stream)
    source.connect(node)
    void context.resume().catch(() => {})
    meter.current = { context, source, analyser: node }
    setAnalyser(node)
  }

  const stop = useCallback(() => {
    const active = recorder.current
    if (!active || active.state === 'inactive') return
    active.stop()
  }, [])

  const start = useCallback(async () => {
    const container = pickContainer()
    if (!container || !navigator.mediaDevices?.getUserMedia) {
      setError('unsupported')
      return
    }
    releaseTake()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('denied')
      return
    }
    setError(null)
    chunks.current = []
    const active = new MediaRecorder(stream, { mimeType: container.mime })
    recorder.current = active
    active.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data)
    }
    active.onstop = () => {
      stopTimer()
      stopMeter()
      for (const track of stream.getTracks()) track.stop()
      recorder.current = null
      const blob = new Blob(chunks.current, { type: container.mime.split(';')[0] })
      chunks.current = []
      if (blob.size === 0) {
        setState('idle')
        return
      }
      const file = new File([blob], `voice-note.${container.ext}`, { type: blob.type })
      setTake({ file, url: URL.createObjectURL(file) })
      setState('preview')
    }
    active.start(250)
    const startedAt = Date.now()
    setSeconds(0)
    setState('recording')
    startMeter(stream)
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_NOTE_SECONDS) stop()
    }, 250)
  }, [releaseTake, stop])

  /** Throw the take away and go back to the start. */
  const discard = useCallback(() => {
    releaseTake()
    setSeconds(0)
    setState('idle')
  }, [releaseTake])

  /**
   * Hand the take over, and forget it here. The caller owns the file from
   * now on and makes its own object URL for the bubble.
   */
  const accept = useCallback((): File | null => {
    const current = take
    if (!current) return null
    URL.revokeObjectURL(current.url)
    setTake(null)
    setSeconds(0)
    setState('idle')
    return current.file
  }, [take])

  // Let go of the microphone and the take if the widget closes mid-way.
  useEffect(() => {
    return () => {
      stopTimer()
      stopMeter()
      const active = recorder.current
      if (active && active.state !== 'inactive') {
        active.onstop = null
        active.stop()
        for (const track of active.stream.getTracks()) track.stop()
      }
      setTake((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return null
      })
    }
  }, [])

  return { supported, state, seconds, analyser, error, take, start, stop, discard, accept }
}
