import { MaatWidget } from '@/widget'

/**
 * Demo host page. It has its own (deliberately different) styling so it is
 * obvious that the widget is visually independent of wherever it is mounted.
 * Append `?open` to the URL to load with the panel already open.
 */
export default function App() {
  const defaultOpen = new URLSearchParams(window.location.search).has('open')

  return (
    <>
      <main className="host">
        <h1>A page that is not Maat</h1>
        <p>
          This host page uses a serif typeface, a warm paper background and shouty uppercase
          buttons. None of that reaches the widget in the bottom-right corner, and none of the
          widget's styles reach this page.
        </p>
        <p className="note">
          Open the widget, send any rumour, and you will get a card with a verdict, an answer and a
          cited source. The demo client rotates through the three verdict states.
        </p>
        <p>
          <button type="button">A host button</button>
        </p>
      </main>
      <MaatWidget defaultOpen={defaultOpen} />
    </>
  )
}
