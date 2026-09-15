import { Feather } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n'
import { SignInDialog } from './SignInDialog'
import { useSession } from './session'

/**
 * Guards the dashboard. While the session is being read, nothing of the page
 * renders; without one, the sign-in dialog opens over a plain Ma’at ground.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (session.status === 'signedIn') return <>{children}</>

  return (
    <div className="grid min-h-svh place-items-center bg-[linear-gradient(160deg,var(--color-teal-deep),var(--color-teal))]">
      <span
        aria-hidden="true"
        className="inline-flex size-16 items-center justify-center rounded-full bg-gold text-gold-dark"
      >
        <Feather className="size-8" strokeWidth={2.25} />
      </span>
      {session.status === 'anonymous' && (
        <SignInDialog open onClose={() => navigate('/')} note={t.auth.needed} />
      )}
    </div>
  )
}
