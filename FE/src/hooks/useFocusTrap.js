import { useEffect, useRef } from 'react'

/**
 * Anything a Tab can land on. `[tabindex]` covers the custom sliders, which are
 * `role="slider"` divs with `tabIndex={0}`, and `tabindex="-1"` is excluded
 * everywhere — the bitrate radios inside the now-playing sheet use a roving
 * tabindex, so most of them are buttons the keyboard is meant to skip.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'select:not([disabled])',
  'input:not([disabled])',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(', ')

/**
 * Keeps the keyboard inside a full-screen overlay while it is open, and hands
 * focus back to whatever opened it on close.
 *
 * Both overlays in this app (the now-playing sheet and the narrow-screen queue
 * drawer) cover the page rather than living inside it, so without a trap Tab
 * walks invisible content behind them — and the button that opened the overlay
 * keeps focus, which strands a keyboard user outside the thing they just opened.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {boolean} active  Trap only while the overlay is actually showing.
 */
export function useFocusTrap(ref, active) {
  const returnToRef = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!active || !container) return undefined

    returnToRef.current = document.activeElement

    // Rendered, not merely present: the sheet hides chrome at some breakpoints.
    const stops = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter((node) => node.getClientRects().length > 0)

    stops()[0]?.focus()

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return
      const items = stops()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const index = items.indexOf(document.activeElement)
      const last = items.length - 1
      // Wrap at either end, and pull focus in when it has escaped entirely
      // (index === -1) — which is what happens on the first Tab after opening.
      if (event.shiftKey ? index <= 0 : index === -1 || index === last) {
        event.preventDefault()
        items[event.shiftKey ? last : 0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const back = returnToRef.current
      if (back instanceof HTMLElement && document.contains(back)) back.focus()
    }
  }, [ref, active])
}
