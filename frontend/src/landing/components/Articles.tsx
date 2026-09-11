import { cn } from 'cn'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { ALL_TAGS, ARTICLES } from '../data/articles'
import { ArticleCard } from './ArticleCard'

export function Articles() {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const visible = activeTag ? ARTICLES.filter((a) => a.tags.includes(activeTag)) : ARTICLES

  return (
    <section id="verifications" className="scroll-mt-16 bg-teal-soft/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-widest text-gold-dark uppercase">Verifications</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-teal-deep sm:text-4xl">
              Rumours we have weighed
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              Every article shows the verdict, what the record says, and the document it comes from.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Newspaper className="size-4 text-gold-dark" />
            <span aria-live="polite">
              {visible.length} of {ARTICLES.length} verifications
            </span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          <FilterChip active={activeTag === null} onClick={() => setActiveTag(null)}>
            All topics
          </FilterChip>
          {ALL_TAGS.map((tag) => (
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
