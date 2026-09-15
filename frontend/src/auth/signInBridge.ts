const OPEN_EVENT = 'maat:signin'

/** Where to go once the person is through. Kept outside React so a guard can set it. */
let intended = '/dashboard'

export function intendedPath(): string {
  return intended
}

/** Ask whatever is listening to open the sign-in dialog. */
export function openSignIn(redirectTo = '/dashboard'): void {
  intended = redirectTo
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

export function onSignInRequest(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
