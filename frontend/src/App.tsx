import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth, SignInGate } from '@/auth'
import { ArticlePage } from '@/landing/ArticlePage'
import { LandingPage } from '@/landing/LandingPage'
import { MaatWidget } from '@/widget'

// The dashboard pulls in the charting library, so it loads only when visited.
const DashboardPage = lazy(() =>
  import('@/dashboard').then((m) => ({ default: m.DashboardPage })),
)

/** Append `?open` to the URL to load with the chat panel already open. */
function Site() {
  const defaultOpen = new URLSearchParams(window.location.search).has('open')
  return (
    <>
      <LandingPage />
      <MaatWidget defaultOpen={defaultOpen} />
    </>
  )
}

function DashboardFallback() {
  return (
    <div className="grid min-h-svh place-items-center bg-sand text-sm text-ink-muted">
      Loading the dashboard…
    </div>
  )
}

/** Signed-in only, and the code only downloads once past the guard. */
function Dashboard() {
  return (
    <RequireAuth>
      <Suspense fallback={<DashboardFallback />}>
        <DashboardPage />
      </Suspense>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Site />} />
        {/* One verification, read in full. The widget rides along: somebody
            who has just read a verdict is exactly who has the next question. */}
        <Route
          path="/verifications/:slug"
          element={
            <>
              <ArticlePage />
              <MaatWidget />
            </>
          }
        />
        {/* Each signed-in page stands on its own path; none is filed under
            another. They share one component, which reads the path to know
            which page it is. */}
        {['/dashboard', '/rumours', '/conversations', '/sources', '/documents', '/settings', '/profile', '/sources/new', '/sources/:id/edit'].map(
          (path) => (
            <Route key={path} path={path} element={<Dashboard />} />
          ),
        )}
        <Route path="*" element={<Site />} />
      </Routes>
      <SignInGate />
    </BrowserRouter>
  )
}
