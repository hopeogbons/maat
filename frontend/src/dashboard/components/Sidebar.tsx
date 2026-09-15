import { cn } from 'cn'
import { Feather, LogOut, UserRound, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { refreshSession, signOut, useSession } from '@/auth'
import { useLanguage } from '@/i18n'
import { NAV, isCurrent } from '../nav'

/** HO from "Hope Ogbons"; the first two letters when there is only one word. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Quiet cream rail: the mark, who is signed in, five words, a way out. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const person = session.status === 'signedIn' ? session.person : null

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close the menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-teal-deep/50 lg:hidden"
        />
      )}
      <aside
        className={cn(
          'scrollbar-hairline fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col overflow-y-auto overscroll-contain bg-teal-deep text-white [--scrollbar-thumb:var(--color-teal)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-8 pt-9">
          <Link
            to="/dashboard"
            onClick={onClose}
            aria-label="Ma’at, go to the dashboard"
            className="flex flex-1 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-teal-deep"
            >
              <Feather className="size-4" strokeWidth={2.5} />
            </span>
            <span className="text-[1.15rem] font-bold tracking-tight text-white">Ma’at</span>
          </Link>
          <button
            type="button"
            aria-label="Close the menu"
            onClick={onClose}
            className="-mr-2 inline-flex size-8 items-center justify-center rounded-lg text-white/70 hover:text-white lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-8 pt-12 text-center">
          <Link
            to="/profile"
            onClick={onClose}
            title="Your profile"
            className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            {person?.avatarUrl ? (
              <img
                src={person.avatarUrl}
                alt=""
                className="mx-auto size-[4.5rem] rounded-full object-cover ring-4 ring-white/10 transition group-hover:ring-gold/40"
              />
            ) : (
              <span
                aria-hidden="true"
                className="mx-auto flex size-[4.5rem] items-center justify-center rounded-full bg-gold text-xl font-bold text-teal-deep ring-4 ring-white/10 transition group-hover:ring-gold/40"
              >
                {person?.name ? initials(person.name) : <UserRound className="size-7" />}
              </span>
            )}
            {/* The name once they have set one, their username until then: an
                email address is not a name and does not belong on the rail. */}
            <p
              title={person?.name || person?.username}
              className="mt-5 truncate font-serif text-[1.35rem] leading-tight font-bold tracking-tight text-white transition group-hover:text-gold"
            >
              {person?.name || person?.username}
            </p>
            <p className="mt-2 truncate text-[13px] text-white/60">{person?.title}</p>
          </Link>
        </div>

        <nav aria-label="Dashboard" className="flex-1 px-6 pt-[6.5rem] pb-10">
          <ul>
            {NAV.map(({ path, label, badge }) => (
              <li key={label}>
                <NavLink
                  to={path}
                  end
                  onClick={onClose}
                  className={() =>
                    cn(
                      'flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] transition',
                      isCurrent({ path, label, icon: Feather }, pathname)
                        ? 'font-bold text-gold'
                        : 'text-white/70 hover:text-white',
                    )
                  }
                >
                  {label}
                  {badge && (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-teal-deep">
                      {badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => {
            // Leave first: clearing the session unmounts this page behind us.
            navigate('/')
            // If the server refuses, do not pretend: re-read who is signed in.
            signOut().catch(() => refreshSession())
          }}
          className="mx-6 mb-10 flex items-center justify-center gap-2.5 rounded-xl py-2 text-[15px] font-bold text-white transition hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-gold text-teal-deep">
            <LogOut className="size-3.5" strokeWidth={2.5} />
          </span>
          {t.auth.signOut}
        </button>
      </aside>
    </>
  )
}
