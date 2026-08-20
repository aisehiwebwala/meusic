import { useEffect, useRef, useState } from 'react'

/** Namespace for everything this app writes to localStorage. */
export const STORAGE_PREFIX = 'cadence:'

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * `useState` mirrored into localStorage. Used for the things a listener expects
 * to survive a reload: audio quality, volume, and the queue itself.
 */
export function usePersistentState(key, fallback, { validate } = {}) {
  const [value, setValue] = useState(() => {
    const stored = read(key, fallback)
    if (validate && !validate(stored)) return fallback
    return stored
  })

  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + keyRef.current, JSON.stringify(value))
    } catch {
      // Private-browsing or quota errors are not worth interrupting playback for.
    }
  }, [value])

  return [value, setValue]
}
