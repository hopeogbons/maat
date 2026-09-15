import {
  FileText,
  Landmark,
  MessagesSquare,
  ScrollText,
  Settings,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  /** The full path. Each page stands on its own; none is filed under another. */
  path: string
  label: string
  icon: LucideIcon
  badge?: string
}

export const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: SlidersHorizontal, badge: '3' },
  { path: '/rumours', label: 'Rumours', icon: ScrollText },
  { path: '/conversations', label: 'Conversations', icon: MessagesSquare },
  { path: '/sources', label: 'Sources', icon: Landmark },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
]

/** Reached from the avatar in the rail, so it is deliberately not in the menu. */
export const PROFILE: NavItem = { path: '/profile', label: 'Your profile', icon: UserRound }

/** Every signed-in path, for the router to mount. */
export const PAGES: NavItem[] = [...NAV, PROFILE]

/** Pages reached from inside another, which keep that page's menu entry lit. */
const CHILDREN: { match: RegExp; parent: string; label: string }[] = [
  { match: /^\/sources\/new$/, parent: '/sources', label: 'Add a source' },
  { match: /^\/sources\/[^/]+\/edit$/, parent: '/sources', label: 'Edit source' },
]

export const findItem = (pathname: string | undefined): NavItem => {
  const exact = PAGES.find((i) => i.path === pathname)
  if (exact) return exact
  const child = CHILDREN.find((c) => c.match.test(pathname ?? ''))
  if (child) {
    const parent = PAGES.find((i) => i.path === child.parent) ?? NAV[0]
    return { ...parent, label: child.label }
  }
  return NAV[0]
}

/** True where the rail should light `item` for the path being shown. */
export const isCurrent = (item: NavItem, pathname: string): boolean =>
  item.path === pathname || CHILDREN.some((c) => c.match.test(pathname) && c.parent === item.path)
