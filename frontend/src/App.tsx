import { LandingPage } from '@/landing/LandingPage'
import { MaatWidget } from '@/widget'

/** Append `?open` to the URL to load with the chat panel already open. */
export default function App() {
  const defaultOpen = new URLSearchParams(window.location.search).has('open')

  return (
    <>
      <LandingPage />
      <MaatWidget defaultOpen={defaultOpen} />
    </>
  )
}
