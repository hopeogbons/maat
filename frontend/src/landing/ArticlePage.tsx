import { ArrowLeft, Clock, Landmark } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDate, useLanguage } from '@/i18n'
import { VerdictBadge } from './components/VerdictBadge'
import { VERDICT_BAR } from './components/verdictStyles'
import { SiteFooter } from './components/SiteFooter'
import { useArticles } from './data/useArticles'

/**
 * One verification, in full.
 *
 * The grid on the landing page clamps titles and summaries so the cards line
 * up; this is where the whole thing is read. It draws from the same request
 * as the grid, so arriving here from a card costs nothing.
 */
export function ArticlePage() {
  const { slug } = useParams()
  const { t, code } = useLanguage()
  const { articles, loading } = useArticles()
  const article = articles.find((a) => a.slug === slug)

  useEffect(() => {
    if (article) document.title = `${article.title} · ${t.meta.title}`
  }, [article, t])

  if (loading) {
    return <Shell><p className="text-ink-muted">{t.articles.intro}</p></Shell>
  }

  if (!article) {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-teal-deep">{t.articles.missing}</h1>
        <p className="mt-3 text-ink-muted">{t.articles.none}</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <span aria-hidden="true" className={`mb-6 block h-1.5 w-24 rounded-full ${VERDICT_BAR[article.verdict]}`} />
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={article.verdict} />
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
          <Clock className="size-3.5" />
          {t.articles.minutes(article.readMinutes)}
        </span>
        <span className="text-xs text-ink-muted">
          {t.articles.checked(formatDate(article.published, code, 'short'))}
        </span>
      </div>

      <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-teal-deep sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">{article.summary}</p>

      {article.source && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-soft px-4 py-2 text-sm text-teal">
          <Landmark className="size-4 shrink-0 text-gold-dark" />
          {article.source.issuer}
          {article.source.date && <> · {formatDate(article.source.date, code, 'short')}</>}
        </p>
      )}

      {/* Paragraphs, not markdown: the body is written as plain prose and is
          rendered as text, so nothing a model writes can inject markup. */}
      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink">
        {article.body
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
      </div>

      {article.tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-1.5 border-t border-line pt-6">
          {article.tags.map((tag) => (
            <li key={tag}>
              {/* Back to the grid, filtered: a topic here and a topic there
                  are the same topic, which is the point of a fixed list. */}
              <Link
                to={`/?topic=${encodeURIComponent(tag)}#verifications`}
                className="inline-flex min-h-8 items-center rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal transition hover:bg-teal hover:text-white"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  return (
    <>
      <main className="mx-auto min-h-svh max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
        <Link
          to="/#verifications"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-teal-deep"
        >
          <ArrowLeft className="size-4" />
          {t.articles.title}
        </Link>
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  )
}
