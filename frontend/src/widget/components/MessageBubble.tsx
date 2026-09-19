import { cn } from 'cn'
import { AudioLines, CircleDashed, Download, FileText } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useLanguage } from '@/i18n'
import { formatBytes } from '../lib/format'
import type { Attachment, Message } from '../types'
import { Emblem } from './Emblem'
import { VerdictCard } from './VerdictCard'

/**
 * The little arrow that makes a box a speech bubble, pointing sideways at
 * whoever the bubble speaks to: the avatar beside it, or the launcher.
 *
 * Its base must land on the straight part of the bubble's edge. A bubble's
 * corners are deeply rounded, and where the edge has begun to curve it falls
 * away from the base, leaving a notch. Hence the short base and the height
 * `--maat-tail-y` sets, which widget.css keeps clear of the corners.
 */
export function Tail({
  side,
  fill,
  ring,
  y,
}: {
  side: 'left' | 'right'
  /** CSS colour for the arrow. Defaults to the card (left) or primary (right). */
  fill?: string
  /** CSS colour for the one-pixel outline, matching the bubble's ring. */
  ring?: string
  /** Height of the arrow's centre above the bubble's bottom (default 1.75rem). */
  y?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      className={cn('maat-tail', side === 'left' ? 'maat-tail--left' : 'maat-tail--right')}
      style={{ '--maat-tail-y': y } as CSSProperties}
    >
      {/* The outline, under the arrow: a 2px stroke of which the fill hides the
          inner half, leaving 1px outside to match the bubble's ring. It stops
          where its outer edge reaches the ring's, so the two meet as one line
          rather than one overshooting the other. */}
      {ring && (
        <path
          d="M9.61 1.3 L1 8 L9.61 14.7"
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ stroke: ring }}
        />
      )}
      {/* The arrow, plus a 2px strip continuing inside the bubble, which covers
          the bubble's ring behind the base. The strip stops level with the base:
          any further and it would rub out the ring beyond the join too. */}
      <path
        d="M10 1 L1 8 L10 15 L12 15 L12 1 Z"
        style={{ fill: fill ?? (side === 'left' ? 'var(--card)' : 'var(--primary)') }}
      />
    </svg>
  )
}

/**
 * The colour of a chat bubble's ring, for its tail's outline to match: the
 * ring's 10% of the foreground, already mixed into the background the message
 * list paints, rather than a translucent colour of its own. Opaque matters.
 * The tail's outline has to overlap the bubble's ring where the two meet, and
 * two translucent lines over each other make a dark knot at the corner.
 */
export const BUBBLE_RING =
  'color-mix(in oklab, var(--foreground) 10%, color-mix(in oklab, var(--muted) 50%, var(--background)))'

/**
 * Bare URLs in a reply, rendered as links.
 *
 * Ma'at writes plain sentences, not markup, and a link it mentions should be
 * followable rather than something to copy out by hand. Split on whitespace
 * rather than parsed: anything cleverer invites an injected anchor, and every
 * word here came from a model that read a stranger's message.
 */
export function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((piece, i) => {
        const bare = piece.replace(/[.,;:!?)\]]+$/, '')
        const trail = piece.slice(bare.length)
        if (!/^https?:\/\//i.test(bare)) return <span key={i}>{piece}</span>
        return (
          <span key={i}>
            <a
              href={bare}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="maat:font-medium maat:underline maat:underline-offset-2"
            >
              {bare.replace(/^https?:\/\//i, '')}
            </a>
            {trail}
          </span>
        )
      })}
    </>
  )
}

/** The documents a visitor accepted, each one a download. */
export function Attachments({ items }: { items?: Attachment[] }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="maat:mt-2.5 maat:space-y-2">
      {items.map((file) => (
        <li key={file.id}>
          <a
            href={file.url}
            download={file.filename}
            className="maat:flex maat:items-center maat:gap-2.5 maat:rounded-xl maat:bg-muted/60 maat:px-3 maat:py-2.5 maat:ring-1 maat:ring-foreground/10 maat:transition maat:hover:bg-muted"
          >
            <FileText className="maat:size-4 maat:shrink-0 maat:text-primary" />
            <span className="maat:min-w-0 maat:flex-1">
              <span className="maat:block maat:truncate maat:text-sm maat:font-medium">{file.title}</span>
              <span className="maat:block maat:truncate maat:text-xs maat:text-muted-foreground">
                {file.issuer}
                {file.bytes ? ` \u00b7 ${formatBytes(file.bytes)}` : ''}
              </span>
            </span>
            <Download className="maat:size-4 maat:shrink-0 maat:text-muted-foreground" />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** The same ring, translucent, for a bubble standing on an unknown background. */
export const FLOATING_RING = 'color-mix(in oklab, var(--foreground) 14%, transparent)'

/**
 * Replies that have already been played once, by their audio URL. Kept
 * outside any component on purpose: closing the panel unmounts every bubble,
 * and a bubble that plays itself on mount would play again on every reopen,
 * all of them at once. A reply plays by itself exactly once, when it arrives.
 */
const spokenOnce = new Set<string>()

/**
 * The reply read aloud. It plays on its own the moment it arrives: the
 * visitor sent a voice note, so the answer arriving as a voice is what they
 * asked for. Afterwards the controls are the only way to hear it again.
 */
export function SpokenReply({ url, className }: { url?: string; className?: string }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!url || spokenOnce.has(url)) return
    spokenOnce.add(url)
    ref.current?.play().catch(() => {
      // Playback can be refused without a fresh gesture; the controls remain.
    })
  }, [url])
  if (!url) return null
  return (
    <audio
      ref={ref}
      controls
      preload="auto"
      src={url}
      aria-label={t.widget.spokenReply}
      className={cn('maat:h-8 maat:w-full maat:min-w-56', className)}
    />
  )
}

/** Left-aligned bubble with the Ma’at mark, for plain assistant text. */
export function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="maat:relative maat:flex maat:pl-9">
      <Emblem size="xs" className="maat-avatar" />
      <div className="maat:relative maat:isolate maat:max-w-[90%] maat:rounded-2xl maat:bg-card maat:px-3.5 maat:py-2 maat:text-sm maat:text-card-foreground maat:ring-1 maat:ring-foreground/10">
        <Tail side="left" ring={BUBBLE_RING} />
        {children}
      </div>
    </div>
  )
}

export function MessageBubble({ message }: { message: Message }) {
  const { t } = useLanguage()

  if (message.role === 'user') {
    return (
      <div className="maat:flex maat:justify-end">
        <div className="maat:relative maat:isolate maat:max-w-[85%] maat:rounded-2xl maat:bg-primary maat:px-3.5 maat:py-2 maat:text-sm maat:text-primary-foreground">
          <Tail side="right" />
          {message.kind === 'text' ? (
            <p className="maat:whitespace-pre-wrap maat:break-words">{message.text}</p>
          ) : (
            <div>
              <div className="maat:flex maat:items-center maat:gap-2">
                <AudioLines className="maat:size-4 maat:shrink-0 maat:text-gold" />
                <div className="maat:min-w-0">
                  <p className="maat:font-medium">{t.widget.voiceNote}</p>
                  <p className="maat:truncate maat:text-xs maat:text-primary-foreground/70">
                    {message.file.name} · {formatBytes(message.file.size)}
                  </p>
                </div>
              </div>
              <audio controls preload="metadata" src={message.objectUrl} className="maat:mt-2 maat:h-8 maat:w-full maat:min-w-56" />
              {message.transcript && (
                <p className="maat:mt-2 maat:text-xs maat:text-primary-foreground/80">
                  <span className="maat:font-medium">{t.widget.heard}:</span> “{message.transcript}”
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (message.kind === 'text') {
    return (
      <AssistantBubble>
        <p className="maat:whitespace-pre-wrap maat:break-words maat:leading-relaxed">
          <Linkified text={message.unheard ? t.widget.notHeard : message.text} />
        </p>
        <SpokenReply url={message.audioUrl} className="maat:mt-2" />
        <Attachments items={message.attachments} />
      </AssistantBubble>
    )
  }

  if (message.kind === 'verdict') {
    return (
      <div className="maat:relative maat:flex maat:pl-9">
        <Emblem size="xs" className="maat-avatar" />
        <div className="maat:min-w-0 maat:flex-1">
          <SpokenReply url={message.audioUrl} className="maat:mb-2" />
          <VerdictCard result={message.result} />
        </div>
      </div>
    )
  }

  return (
    <AssistantBubble>
      <p className="maat:flex maat:items-start maat:gap-2 maat:text-muted-foreground">
        <CircleDashed className="maat:mt-0.5 maat:size-4 maat:shrink-0" />
        <span>{message.reason === 'network' ? t.widget.errorNetwork : t.widget.errorGeneric}</span>
      </p>
    </AssistantBubble>
  )
}
