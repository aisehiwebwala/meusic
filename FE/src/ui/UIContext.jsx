import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const UIContext = createContext(null)

/**
 * Chrome-level UI state: the queue drawer and the now-playing sheet — the two
 * surfaces that open over the page and so can't own their own state.
 *
 * Navigation isn't here: the mobile tab bar is always visible, so there is
 * nothing to open or close.
 */
export function UIProvider({ children }) {
  const [queueOpen, setQueueOpen] = useState(false)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)

  const toggleQueue = useCallback(() => setQueueOpen((open) => !open), [])
  const closeQueue = useCallback(() => setQueueOpen(false), [])
  const openNowPlaying = useCallback(() => setNowPlayingOpen(true), [])
  const closeNowPlaying = useCallback(() => setNowPlayingOpen(false), [])

  const value = useMemo(
    () => ({
      queueOpen,
      toggleQueue,
      closeQueue,
      nowPlayingOpen,
      openNowPlaying,
      closeNowPlaying,
    }),
    [queueOpen, toggleQueue, closeQueue, nowPlayingOpen, openNowPlaying, closeNowPlaying],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used inside a <UIProvider>')
  return context
}
