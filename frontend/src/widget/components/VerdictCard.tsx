import { cn } from 'cn'
import { CircleAlert, CircleDashed, ExternalLink, ShieldCheck, type LucideIcon } from 'lucide-react'
import { formatDate, useLanguage, type Verdict } from '@/i18n'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader } from '../ui/card'
import type { Source, VerdictReply } from '../types'
import { BUBBLE_RING, Tail } from './MessageBubble'
import { SourceMark } from './SourceMark'

const STYLES: Record<Verdict, { icon: LucideIcon; badge: string; bar: string; tail: string }> = {
  verified: {
    icon: ShieldCheck,
    badge: 'maat:border-verified/30 maat:bg-verified-soft maat:text-verified',
    bar: 'maat:bg-verified',
    tail: 'var(--verified)',
  },
  unverified: {
    icon: CircleAlert,
    badge: 'maat:border-unverified/30 maat:bg-unverified-soft maat:text-unverified',
    bar: 'maat:bg-unverified',
    tail: 'var(--unverified)',
  },
  insufficient: {
    icon: CircleDashed,
    badge: 'maat:border-insufficient/30 maat:bg-insufficient-soft maat:text-insufficient',
    bar: 'maat:bg-insufficient',
    tail: 'var(--insufficient)',
  },
}

export function VerdictCard({ result }: { result: VerdictReply }) {
  const { t } = useLanguage()
  const { icon: Icon, badge, bar, tail } = STYLES[result.verdict]

  return (
    // The tail is a sibling of the card, not a child: a card clips what
    // overflows it, which would cut the arrow off outside its edge.
    <div className="maat:relative maat:isolate">
      <Card size="sm" className="maat:relative maat:w-full maat:gap-2.5 maat:rounded-2xl maat:pl-1">
        <span aria-hidden="true" className={cn('maat:absolute maat:inset-y-0 maat:left-0 maat:w-1', bar)} />
        <CardHeader className="maat:px-3.5">
          <Badge variant="outline" className={cn('maat:h-6 maat:px-2.5', badge)}>
            <Icon />
            {t.verdict[result.verdict]}
          </Badge>
        </CardHeader>
        <CardContent className="maat:flex maat:flex-col maat:gap-2.5 maat:px-3.5">
          <p className="maat:leading-relaxed">{result.answer}</p>
          {result.sources.length > 0 ? (
            result.sources.map((source, i) => <SourceBlock key={`${source.issuer}-${i}`} source={source} />)
          ) : (
            <Abstention />
          )}
        </CardContent>
      </Card>
      <Tail side="left" fill={tail} ring={BUBBLE_RING} />
    </div>
  )
}

function SourceBlock({ source }: { source: Source }) {
  const { t, code } = useLanguage()
  return (
    <div className="maat:rounded-lg maat:bg-muted maat:p-2.5">
      <p className="maat:text-[11px] maat:font-medium maat:tracking-wide maat:text-muted-foreground maat:uppercase">
        {source.judgement === 'settles_nothing' ? t.widget.closestRecord : t.widget.citedSource}
      </p>
      <div className="maat:mt-1.5 maat:flex maat:items-center maat:gap-2.5">
        <SourceMark source={source.source ?? { name: source.issuer, short: '', logoUrl: '', brand: '' }} />
        <div className="maat:min-w-0">
          <p className="maat:truncate maat:font-semibold maat:text-foreground">{source.issuer}</p>
          {source.date && (
            <time dateTime={source.date} className="maat:block maat:text-xs maat:text-muted-foreground">
              {formatDate(source.date, code)}
            </time>
          )}
        </div>
      </div>
      <p className="maat:mt-2 maat:text-[13px] maat:font-medium maat:leading-snug maat:text-foreground/90">{source.title}</p>
      {source.quote && <Quote quote={source.quote} highlight={source.highlight ?? null} />}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="maat:mt-2 maat:inline-flex maat:items-center maat:gap-1 maat:text-xs maat:font-medium maat:text-primary maat:underline-offset-2 maat:hover:underline"
        >
          {t.widget.openOriginal}
          <ExternalLink className="maat:size-3.5" />
        </a>
      )}
    </div>
  )
}

/** The passage, with the sentence the judgement rests on marked inside it. */
function Quote({ quote, highlight }: { quote: string; highlight: [number, number] | null }) {
  const [start, end] = highlight ?? [-1, -1]
  const marked = start >= 0 && end > start && end <= quote.length
  return (
    <blockquote className="maat:mt-2 maat:border-l-2 maat:border-gold/60 maat:pl-2.5 maat:text-xs maat:leading-relaxed maat:text-foreground/85">
      {marked ? (
        <>
          {quote.slice(0, start)}
          <mark className="maat:rounded-sm maat:bg-gold/25 maat:px-0.5 maat:text-foreground">{quote.slice(start, end)}</mark>
          {quote.slice(end)}
        </>
      ) : (
        quote
      )}
    </blockquote>
  )
}

/** Abstention state: no verified source, so no verdict is asserted. */
function Abstention() {
  const { t } = useLanguage()
  return (
    <div className="maat:rounded-lg maat:border maat:border-dashed maat:border-insufficient/40 maat:p-2.5 maat:text-xs maat:text-muted-foreground">
      <p className="maat:font-medium maat:text-foreground">{t.widget.abstentionTitle}</p>
      <p className="maat:mt-0.5">{t.widget.abstentionText}</p>
    </div>
  )
}
