import { useEffect } from 'react'

import { usePlayer } from './PlayerContext'

/** Seek steps, in seconds: arrows nudge, J/L jump. */
const NUDGE = 5
const JUMP = 10

/**
 * Elements that own their own keys — a global listener must never steal from
 * these. `[role="slider"]` is the progress and volume controls and
 * `[role="radiogroup"]` the search-category and bitrate pickers; both implement
 * the arrow-key contract their role promises, and a radio group that seeked the
 * track instead of moving the selection would be the worst of both.
 */
const OWNS_KEYS =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"], [role="menu"], [role="menuitem"], [role="radiogroup"], [role="radio"]'

/** Space activates anything clickable, so it stays out of these too. */
const CLICKABLE = 'button, a[href], summary, [role="radio"], [role="tab"], [role="switch"], [role="option"]'

/**
 * Global transport shortcuts.
 *
 * Only the horizontal arrows are claimed: Up/Down stay with the scroller, since
 * `<main>` is the only thing that scrolls and keyboard users need it. Space is
 * claimed — it's the conventional play/pause — but only when focus isn't on
 * something it would otherwise activate.
 *
 * | Key                    | Action                        |
 * | ---------------------- | ----------------------------- |
 * | `Space` / `K`          | Play or pause                 |
 * | `←` / `→`              | Seek 5s back / forward        |
 * | `J` / `L`              | Seek 10s back / forward       |
 * | `Shift` + `←` / `→`    | Previous / next track         |
 * | `M`                    | Mute                          |
 *
 * Keyboards with dedicated media keys are handled too, for the platforms that
 * deliver them to the page instead of consuming them for MediaSession.
 */
export function usePlayerHotkeys() {
  const { currentTrack, toggle, next, previous, seekBy, toggleMute } = usePlayer()

  useEffect(() => {
    const onKeyDown = (event) => {
      // Media keys can't collide with typing, so they skip every guard below.
      switch (event.key) {
        case 'MediaPlayPause':
          toggle()
          return
        case 'MediaTrackNext':
          next()
          return
        case 'MediaTrackPrevious':
          previous()
          return
        default:
          break
      }

      // Shift is a modifier we use; the rest belong to the browser and the OS.
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!currentTrack) return

      const target = event.target
      if (target instanceof Element && target.closest(OWNS_KEYS)) return

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          if (event.repeat) return
          if (target instanceof Element && target.closest(CLICKABLE)) return
          event.preventDefault()
          toggle()
          return
        case 'ArrowRight':
          event.preventDefault()
          if (event.shiftKey) next()
          else seekBy(NUDGE)
          return
        case 'ArrowLeft':
          event.preventDefault()
          if (event.shiftKey) previous()
          else seekBy(-NUDGE)
          return
        case 'l':
        case 'L':
          event.preventDefault()
          seekBy(JUMP)
          return
        case 'j':
        case 'J':
          event.preventDefault()
          seekBy(-JUMP)
          return
        case 'm':
        case 'M':
          if (event.repeat) return
          event.preventDefault()
          toggleMute()
          return
        default:
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentTrack, toggle, next, previous, seekBy, toggleMute])
}
