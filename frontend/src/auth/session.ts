import { useSyncExternalStore } from 'react'
import { getSession, signIn as postSignIn, signOut as postSignOut, type Session } from '@/lib/api'

export interface Person {
  username: string
  /** Empty until they fill in a profile; the interface falls back to username. */
  name: string
  /** Their job title, or the role they hold when they have not set one. */
  title: string
  avatarUrl: string
  isStaff: boolean
  isSuperuser: boolean
}

export type SessionState =
  | { status: 'unknown' }
  | { status: 'anonymous' }
  | { status: 'signedIn'; person: Person }

const ANONYMOUS: SessionState = { status: 'anonymous' }

let state: SessionState = { status: 'unknown' }
let inFlight: Promise<SessionState> | null = null
const listeners = new Set<() => void>()

function set(next: SessionState) {
  state = next
  for (const listener of listeners) listener()
}

function toState(session: Session): SessionState {
  if (!session.authenticated) return ANONYMOUS
  return {
    status: 'signedIn',
    person: {
      username: session.username ?? '',
      name: session.name ?? '',
      title: session.title ?? '',
      avatarUrl: session.avatarUrl ?? '',
      isStaff: Boolean(session.isStaff),
      isSuperuser: Boolean(session.isSuperuser),
    },
  }
}

/** Ask the backend once who is signed in. Later calls reuse the same request. */
export function loadSession(): Promise<SessionState> {
  inFlight ??= getSession()
    .then((session) => {
      set(toState(session))
      return state
    })
    .catch(() => {
      // A backend that cannot be reached is treated as signed out, not as an error
      // screen: the public site must still work.
      set(ANONYMOUS)
      return state
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

export async function signIn(username: string, password: string): Promise<Person> {
  const session = await postSignIn(username, password)
  const next = toState(session)
  set(next)
  if (next.status !== 'signedIn') throw new Error('Sign in did not open a session.')
  return next.person
}

export async function signOut(): Promise<void> {
  await postSignOut()
  set(ANONYMOUS)
}

/** Fold a fresh payload from the profile page into the stored session. */
export function updateSession(session: Session): void {
  set(toState(session))
}

/** Throw away what we think and ask the backend again. */
export function refreshSession(): Promise<SessionState> {
  inFlight = null
  return loadSession()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot(): SessionState {
  return state
}

/** The current session. Triggers the first lookup on first use. */
export function useSession(): SessionState {
  const current = useSyncExternalStore(subscribe, snapshot, () => state)
  if (current.status === 'unknown') void loadSession()
  return current
}
