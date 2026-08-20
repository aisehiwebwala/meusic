import { useEffect, useRef } from 'react'

import { formatDuration } from '../api/normalize'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Icon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { EmptyState } from '../ui/States'
import { useUI } from '../ui/UIContext'
import { usePlayer } from './PlayerContext'
import { QueueList } from './QueueList'
import './QueuePanel.css'

/**
 * Slide-out play queue: a docked column on wide screens, an overlay sheet with a
 * scrim below 1100px. The reorderable list itself lives in {@link QueueList} and
 * is shared with the `/queue` page.
 */
export function QueuePanel() {
  const { queueOpen, closeQueue } = useUI()
  const {
    entries,
    currentIndex,
    currentTrack,
    clearQueue,
    clearUpcoming,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer()

  const listRef = useRef(null)
  const panelRef = useRef(null)

  /** Below 1100px this is an overlay over the page; above it, a docked column. */
  const isOverlay = useMediaQuery('(max-width: 1099px)')
  // Only the overlay needs trapping — the docked column is part of the page, and
  // its contents are already out of the tab order while it is collapsed.
  useFocusTrap(panelRef, queueOpen && isOverlay)

  const upcomingCount = currentIndex >= 0 ? Math.max(0, entries.length - currentIndex - 1) : 0
  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)

  // Reveal the playing track whenever the panel opens or the track changes.
  useEffect(() => {
    if (!queueOpen || currentIndex < 0) return
    const row = listRef.current?.querySelector('[data-current="true"]')
    row?.scrollIntoView({ block: 'nearest' })
  }, [queueOpen, currentIndex])

  // Escape closes the drawer.
  useEffect(() => {
    if (!queueOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') closeQueue()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [queueOpen, closeQueue])

  return (
    <>
      <div
        className="queue-scrim"
        data-open={queueOpen ? 'true' : undefined}
        onClick={closeQueue}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className="queue"
        data-open={queueOpen ? 'true' : undefined}
        /* A docked column is a region of the page; an overlay over a scrim is a
           dialog. The role follows the layout rather than claiming one shape. */
        role={isOverlay ? 'dialog' : undefined}
        aria-modal={isOverlay && queueOpen ? 'true' : undefined}
        aria-label="Play queue"
      >
        <header className="queue__head">
          <div className="queue__titles">
            <h2 className="queue__title">Queue</h2>
            <p className="queue__meta">
              {entries.length === 0
                ? 'Empty'
                : `${entries.length} track${entries.length === 1 ? '' : 's'} · ${formatDuration(totalSeconds)}`}
            </p>
          </div>
          <div className="queue__head-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Shuffle"
              title={shuffle ? 'Shuffle on' : 'Shuffle off'}
            >
              <Icon name="shuffle" size={17} />
            </button>
            <button
              type="button"
              className="icon-btn player__repeat"
              onClick={cycleRepeat}
              data-active={repeat !== 'off' ? 'true' : undefined}
              aria-label={`Repeat: ${repeat}`}
              title={`Repeat: ${repeat}`}
            >
              <Icon name="repeat" size={17} />
              {repeat === 'one' && <span className="player__repeat-badge">1</span>}
            </button>
            {entries.length > 0 && (
              <Menu
                label="Queue options"
                items={[
                  {
                    label: 'Clear upcoming',
                    icon: 'close',
                    // Nothing after the current track means nothing to clear —
                    // an item that silently does nothing is worse than a greyed one.
                    disabled: upcomingCount === 0,
                    onSelect: clearUpcoming,
                  },
                  { label: 'Clear queue', icon: 'trash', danger: true, onSelect: clearQueue },
                ]}
              />
            )}
            <button type="button" className="icon-btn" onClick={closeQueue} aria-label="Close queue">
              <Icon name="close" size={17} />
            </button>
          </div>
        </header>

        <div className="queue__body">
          {entries.length === 0 ? (
            <EmptyState
              icon="queue"
              title="Your queue is empty"
              text="Play something, or use “Add to queue” from any track, album or search result."
              compact
            />
          ) : (
            <QueueList listRef={listRef} />
          )}
        </div>

        {upcomingCount > 0 && currentTrack && (
          <footer className="queue__foot">
            <span>
              {upcomingCount} track{upcomingCount === 1 ? '' : 's'} up next
            </span>
            <button type="button" className="queue__foot-btn" onClick={clearUpcoming}>
              Clear upcoming
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
