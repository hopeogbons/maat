import { useEffect, useState } from 'react'
import { ApiError, apiUrl, getHealth, type Health } from './lib/api'
import './App.css'

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string }

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `Backend responded with HTTP ${error.status}`
  }
  if (error instanceof TypeError) {
    return 'Could not reach the backend (network error or CORS blocked the request)'
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

function fetchHealthState(): Promise<State> {
  return getHealth()
    .then((health): State => ({ kind: 'ok', health }))
    .catch((error: unknown): State => ({ kind: 'error', message: describeError(error) }))
}

export default function App() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    void fetchHealthState().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const retry = () => {
    setState({ kind: 'loading' })
    void fetchHealthState().then(setState)
  }

  return (
    <main className="page">
      <h1>maat</h1>
      <p className="muted">React frontend talking to the Django API.</p>

      <section className={`card card--${state.kind}`}>
        <header className="card__header">
          <span className="dot" aria-hidden="true" />
          <strong>
            {state.kind === 'loading' && 'Checking backend…'}
            {state.kind === 'ok' && 'Backend connected'}
            {state.kind === 'error' && 'Backend unreachable'}
          </strong>
        </header>

        {state.kind === 'ok' && (
          <dl className="facts">
            <dt>Service</dt>
            <dd>{state.health.service}</dd>
            <dt>Status</dt>
            <dd>{state.health.status}</dd>
            <dt>Database</dt>
            <dd>{state.health.database}</dd>
            <dt>Server time</dt>
            <dd>{new Date(state.health.time).toLocaleString()}</dd>
          </dl>
        )}

        {state.kind === 'error' && <p className="error">{state.message}</p>}

        <p className="muted small">
          Endpoint: <code>{apiUrl('/api/health/')}</code>
        </p>

        <button type="button" onClick={retry} disabled={state.kind === 'loading'}>
          Check again
        </button>
      </section>
    </main>
  )
}
