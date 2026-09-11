import { cn } from 'cn'
import { ArrowUpRight, Clock, Landmark } from 'lucide-react'
import { formatDate, useLanguage } from '@/i18n'
import type { Article } from '../data/articles'
import { VerdictBadge } from './VerdictBadge'
import { VERDICT_BAR } from './verdictStyles'

export function ArticleCard({ article, onTagClick }: { article: Article; onTagClick: (tag: string) => void }) {
  const { t, code } = useLanguage()
  const href = `/verifications/${article.slug}`
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <span aria-hidden="true" className={cn('h-1.5 w-full', VERDICT_BAR[article.verdict])} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <VerdictBadge verdict={article.verdict} />
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <Clock className="size-3.5" />
            {t.articles.minutes(article.readMinutes)}
          </span>
        </div>

        <h3 className="mt-4 text-xl leading-snug font-bold text-teal-deep">
          <a href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </a>
        </h3>
        <p className="mt-3 leading-relaxed text-ink-muted">{article.summary}</p>

        <ul className="relative z-10 mt-4 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onTagClick(tag)}
                className="rounded-full bg-teal-soft px-2.5 py-1 text-xs font-medium text-teal transition hover:bg-teal hover:text-white"
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4 text-xs text-ink-muted">
          <div className="min-w-0">
            {article.source ? (
              <p className="inline-flex items-center gap-1.5">
                <Landmark className="size-3.5 shrink-0 text-gold-dark" />
                <span className="truncate">
                  {article.source.issuer} · {formatDate(article.source.date, code, 'short')}
                </span>
              </p>
            ) : (
              <p className="italic">{t.articles.noSource}</p>
            )}
            <p className="mt-1">{t.articles.checked(formatDate(article.published, code, 'short'))}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-teal transition group-hover:text-gold-dark">
            {t.articles.read}
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  )
}
