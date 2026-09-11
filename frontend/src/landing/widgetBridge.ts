/** Name of the DOM event the chat widget listens for to open itself. */
export const OPEN_WIDGET_EVENT = 'maat:open'

/** Opens the Maat chat widget from anywhere on the page. */
export function openWidget(): void {
  window.dispatchEvent(new CustomEvent(OPEN_WIDGET_EVENT))
}
