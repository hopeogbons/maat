import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Article } from './articles'

interface Payload {
  articles: Article[]
  /** Only the topics in use, so a filter chip never returns an empty grid. */
  tags: string[]
}

export interface Verifications extends Payload {
  loading: boolean
  /** True once the request has come back and there is nothing to show. */
  empty: boolean
}

/**
 * The published verifications, from the backend.
 *
 * A failed request is treated as none rather than surfaced: the landing page
 * is the public face of the site, and a visitor who arrives while the API is
 * restarting should see the page without its verification grid, not an error
 * where the grid should be.
 */
export function useArticles(): Verifications {
  const [payload, setPayload] = useState<Payload>({ articles: [], tags: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    apiFetch<Payload>('/api/articles/')
      .then((data) => {
        if (live) setPayload({ articles: data.articles ?? [], tags: data.tags ?? [] })
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [])

  return { ...payload, loading, empty: !loading && payload.articles.length === 0 }
}
