import { Hash, TrendingUp } from 'lucide-react'
import { TRENDING_TAGS } from '../data/articles'

/** A slow ribbon of trending topics. Duplicated once so the loop is seamless. */
export function TagMarquee() {
  const track = [...TRENDING_TAGS, ...TRENDING_TAGS]
  return (
    <div className="border-y border-line bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 sm:px-10">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide text-teal uppercase">
          <TrendingUp className="size-4 text-gold" />
          Trending
        </span>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <ul className="flex w-max gap-2 animate-marquee motion-reduce:animate-none">
            {track.map((tag, i) => (
              <li key={`${tag}-${i}`} aria-hidden={i >= TRENDING_TAGS.length}>
                <a
                  href="#verifications"
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium whitespace-nowrap text-ink-muted transition hover:border-gold hover:text-teal-deep"
                >
                  <Hash className="size-3 text-gold" />
                  {tag}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
