import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { RangeKey } from './data'
import { findItem } from './nav'
import { PageHeading } from './components/PageHeading'
import { Sidebar } from './components/Sidebar'
import { Overview } from './sections/Overview'
import { Placeholder } from './sections/Placeholder'
import { ProfileSection } from './sections/ProfileSection'
import { SourceForm } from './sections/SourceForm'
import { SettingsSection } from './sections/SettingsSection'
import { Sources } from './sections/Sources'
import { Documents } from './sections/Documents'
import { Rumours } from './sections/Rumours'
import { Conversations } from './sections/Conversations'

/** Pages that are in the menu and routed, but have no screen built yet. */
const BOOTSTRAPPED = new Set<string>()

export function DashboardPage() {
  const { pathname } = useLocation()
  const item = findItem(pathname)
  const [range, setRange] = useState<RangeKey>('7d')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.title = `${item.label} · Ma’at`
  }, [item.label])

  const heading = <PageHeading title={item.label} onMenu={() => setMenuOpen(true)} />

  return (
    // The page itself never scrolls: it is exactly one viewport tall, so the
    // rail stays put and only the content column moves under it.
    <div className="flex h-svh overflow-hidden bg-teal-deep">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1">
        <main className="scrollbar-hairline min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-8 sm:px-8 md:px-10 lg:px-12 lg:py-[4.25rem] 2xl:px-[4.5rem]">
          {item.path === '/dashboard' ? (
            <Overview range={range} onRangeChange={setRange} heading={heading} />
          ) : (
            <>
              <div className="mb-10">{heading}</div>
              {item.path === '/rumours' && <Rumours range={range} />}
              {item.path === '/documents' && <Documents />}
              {item.path === '/conversations' && <Conversations />}
              {item.path === '/settings' && <SettingsSection />}
              {item.path === '/sources' && pathname === '/sources' && <Sources />}
              {pathname === '/sources/new' && <SourceForm mode="new" />}
              {/^\/sources\/[^/]+\/edit$/.test(pathname) && <SourceForm mode="edit" />}
              {item.path === '/profile' && <ProfileSection />}
              {BOOTSTRAPPED.has(item.path) && <Placeholder item={item} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
