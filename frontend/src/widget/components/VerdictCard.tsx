import { cn } from 'cn'
import { CircleAlert, CircleDashed, ExternalLink, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader } from '../ui/card'
import { formatDate } from '../lib/format'
import { VERDICT_LABEL, type Source, type Verdict, type VerifyResult } from '../types'

const STYLES: Record<Verdict, { icon: LucideIcon; badge: string; bar: string }> = {
  verified: {
    icon: ShieldCheck,
    badge: 'maat:border-verified/30 maat:bg-verified-soft maat:text-verified',
    bar: 'maat:bg-verified',
  },
  unverified: {
    icon: CircleAlert,
    badge: 'maat:border-unverified/30 maat:bg-unverified-soft maat:text-unverified',
    bar: 'maat:bg-unverified',
  },
  insufficient: {
    icon: CircleDashed,
    badge: 'maat:border-insufficient/30 maat:bg-insufficient-soft maat:text-insufficient',
    bar: 'maat:bg-insufficient',
  },
}

export function VerdictCard({ result }: { result: VerifyResult }) {
  const { icon: Icon, badge, bar } = STYLES[result.verdict]

  return (
    <Card size="sm" className="maat:relative maat:w-full maat:gap-2.5 maat:rounded-2xl maat:rounded-bl-md maat:pl-1">
      <span aria-hidden="true" className={cn('maat:absolute maat:inset-y-0 maat:left-0 maat:w-1', bar)} />
      <CardHeader className="maat:px-3.5">
        <Badge variant="outline" className={cn('maat:h-6 maat:px-2.5', badge)}>
          <Icon />
          {VERDICT_LABEL[result.verdict]}
        </Badge>
      </CardHeader>
      <CardContent className="maat:flex maat:flex-col maat:gap-2.5 maat:px-3.5">
        <p className="maat:leading-relaxed">{result.answer}</p>
        {result.source ? <SourceBlock source={result.source} /> : <Abstention />}
      </CardContent>
    </Card>
  )
}

function SourceBlock({ source }: { source: Source }) {
  return (
    <div className="maat:rounded-lg maat:bg-muted maat:p-2.5">
      <p className="maat:text-[11px] maat:font-medium maat:tracking-wide maat:text-muted-foreground maat:uppercase">Cited source</p>
      <p className="maat:mt-0.5 maat:font-medium maat:text-foreground">{source.title}</p>
      <p className="maat:text-xs maat:text-muted-foreground">
        {source.issuer} · <time dateTime={source.date}>{formatDate(source.date)}</time>
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="maat:mt-2 maat:inline-flex maat:items-center maat:gap-1 maat:text-xs maat:font-medium maat:text-primary maat:underline-offset-2 maat:hover:underline"
      >
        Open original document
        <ExternalLink className="maat:size-3.5" />
      </a>
    </div>
  )
}

/** Abstention state: no verified source, so no verdict is asserted. */
function Abstention() {
  return (
    <div className="maat:rounded-lg maat:border maat:border-dashed maat:border-insufficient/40 maat:p-2.5 maat:text-xs maat:text-muted-foreground">
      <p className="maat:font-medium maat:text-foreground">No verified source found</p>
      <p className="maat:mt-0.5">
        Maat only gives a verdict it can cite. Add who said it, where and when, or share a link to where
        you saw it, and try again.
      </p>
    </div>
  )
}
