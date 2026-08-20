/** Arrow keys that move a radio group's selection, and by how much. */
const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Keyboard handling for the app's button-based radio groups — the search
 * category picker and the bitrate picker.
 *
 * `role="radio"` promises that arrows move the selection, so the groups have to
 * honour it: `usePlayerHotkeys` stands down inside anything with that role, and a
 * group where the arrows silently seeked the track instead would be the worst of
 * both worlds. Selection follows focus, which is the pattern the role expects,
 * and the walk wraps around while skipping options that are unavailable.
 *
 * Attach to the group container: `onKeyDown={(e) => handleRadioGroupKeys(e, …)}`.
 *
 * @param {KeyboardEvent} event
 * @param {string[]} values                     Option values in DOM order.
 * @param {(value: string) => void} onSelect    Chooses a value.
 * @param {(value: string) => boolean} [isDisabled]
 */
export function handleRadioGroupKeys(event, values, onSelect, isDisabled = () => false) {
  const radios = Array.from(event.currentTarget.querySelectorAll('[role="radio"]'))
  const from = radios.indexOf(document.activeElement)
  if (from === -1) return

  // Home/End start the walk just outside the group, so the same loop lands on
  // the first or last option that isn't disabled.
  let cursor
  let direction
  if (STEP[event.key]) {
    cursor = from
    direction = STEP[event.key]
  } else if (event.key === 'Home') {
    cursor = -1
    direction = 1
  } else if (event.key === 'End') {
    cursor = radios.length
    direction = -1
  } else {
    return
  }

  for (let hops = 0; hops < radios.length; hops += 1) {
    cursor = (cursor + direction + radios.length) % radios.length
    if (isDisabled(values[cursor])) continue
    event.preventDefault()
    radios[cursor].focus()
    onSelect(values[cursor])
    return
  }
}
