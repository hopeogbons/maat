import { cn } from 'cn'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/i18n'
import { useArticles } from '../data/useArticles'
import { ArticleCard } from './ArticleCard'

export function Articles() {
  const { t } = useLanguage()
  const [activeTag, setActiveTag] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('topic'),
  )
  const { articles, tags, loading, empty } = useArticles()
  const visible = activeTag ? articles.filter((a) => a.tags.includes(activeTag)) : articles

  // Nothing published yet is a real state, not a failure: a fresh install has
  // weighed nothing. The section keeps its heading and says so, rather than
  // collapsing and leaving the page with a gap where a section was.
  if (loading || empty) return <Empty heading={t} quiet={loading} />

  return (
    <section id="verifications" className="scroll-mt-16 bg-teal-soft/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-widest text-gold-dark uppercase">{t.articles.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-teal-deep sm:text-4xl">
              {t.articles.title}
            </h2>
            <p className="mt-3 text-lg text-ink-muted">{t.articles.intro}</p>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Newspaper className="size-4 text-gold-dark" />
            <span aria-live="polite">{t.articles.count(visible.length, articles.length)}</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={t.articles.filterLabel}>
          <FilterChip active={activeTag === null} onClick={() => setActiveTag(null)}>
            {t.articles.allTopics}
          </FilterChip>
          {tags.map((tag) => (
            <FilterChip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </FilterChip>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((article) => (
            <ArticleCard key={article.slug} article={article} onTagClick={setActiveTag} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        active
          ? 'border-teal bg-teal text-white shadow-sm'
          : 'border-line bg-white text-ink-muted hover:border-gold hover:text-teal-deep',
      )}
    >
      {children}
    </button>
  )
}

/**
 * The section before anything has been published, and while the first request
 * is in flight. Same shell, same heading: only the grid is missing, so the
 * page does not jump when the articles arrive.
 */
function Empty({ heading, quiet }: { heading: ReturnType<typeof useLanguage>['t']; quiet: boolean }) {
  return (
    <section id="verifications" className="scroll-mt-16 bg-teal-soft/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <p className="text-xs font-bold tracking-widest text-gold-dark uppercase">{heading.articles.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-teal-deep sm:text-4xl">
          {heading.articles.title}
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted" aria-live="polite">
          {quiet ? heading.articles.intro : heading.articles.none}
        </p>
      </div>
    </section>
  )
}
