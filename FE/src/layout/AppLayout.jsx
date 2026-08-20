import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { NowPlayingSheet } from '../player/NowPlayingSheet'
import { PlayerBar } from '../player/PlayerBar'
import { QueuePanel } from '../player/QueuePanel'
import { usePlayerHotkeys } from '../player/usePlayerHotkeys'
import { useUI } from '../ui/UIContext'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import './AppLayout.css'

/**
 * Application shell: a CSS grid that keeps the player docked and the queue as an
 * animated column on wide screens (an overlay sheet below 1100px).
 *
 * Only `<main>` scrolls, so the player and chrome never move — `body` is
 * `overflow: hidden`, which is also what keeps the page still behind the
 * full-screen now-playing sheet.
 */
export function AppLayout() {
  const { queueOpen } = useUI()
  const location = useLocation()
  const mainRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  usePlayerHotkeys()

  // Tells the sticky top bar when content has moved under it, so its divider
  // appears then and not before. The state only changes when the threshold is
  // crossed, so this costs one render per crossing rather than one per event.
  useEffect(() => {
    const scroller = mainRef.current
    if (!scroller) return undefined
    const onScroll = () => setScrolled(scroller.scrollTop > 4)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  // Restore scroll to the top on navigation — the shell's scroller is <main>,
  // which React Router's default scroll restoration doesn't manage.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname, location.search])

  // The dock is always mounted — the player bar renders an empty state rather
  // than disappearing — so the shell needs no "has a player" flag.
  return (
    <div className="shell" data-queue-open={queueOpen ? 'true' : undefined}>
      <Sidebar />

      <main className="shell__main" ref={mainRef} id="main" data-scrolled={scrolled ? 'true' : undefined}>
        <TopBar />
        <div className="shell__content">
          <Outlet />
        </div>
      </main>

      <QueuePanel />

      <div className="shell__dock">
        <PlayerBar />
        <MobileNav />
      </div>

      <NowPlayingSheet />
    </div>
  )
}
