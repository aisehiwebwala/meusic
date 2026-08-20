import { Link } from 'react-router-dom'

import { formatDurationLong } from '../api/normalize'
import { usePlayer } from '../player/PlayerContext'
import { QueueList } from '../player/QueueList'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/States'
import './QueuePage.css'

/**
 * Dedicated `/queue` view — the same reorderable list as the drawer, given room
 * to breathe. Useful on phones, where the drawer is an overlay, and shareable as
 * a normal route.
 */
export function QueuePage() {
  const {
    entries,
    currentIndex,
    currentTrack,
    isPlaying,
    toggle,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
    clearQueue,
    clearUpcoming,
  } = usePlayer()

  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
  const upcomingCount = currentIndex >= 0 ? Math.max(0, entries.length - currentIndex - 1) : entries.length

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="queue"
        title="Your queue is empty"
        text="Play a song, album or search result and it will show up here. Use “Add to queue” or “Play next” from any track’s menu to build it up."
        action={
          <div className="state__actions">
            <Link to="/" className="btn-accent">
              <Icon name="home" size={16} />
              Browse trending
            </Link>
            <Link to="/search" className="pill">
              <Icon name="search" size={14} />
              Search
            </Link>
          </div>
        }
      />
    )
  }

  return (
    <div className="queue-page">
      <header className="queue-page__head">
        <div className="queue-page__titles">
          <span className="queue-page__eyebrow">Play queue</span>
          <h1 className="queue-page__title">
            {entries.length} track{entries.length === 1 ? '' : 's'}
          </h1>
          <p className="queue-page__meta">
            {formatDurationLong(totalSeconds)}
            {upcomingCount > 0 && ` · ${upcomingCount} up next`}
          </p>
        </div>

        <div className="queue-page__actions">
          <button
            type="button"
            className="pill"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            data-active={shuffle ? 'true' : undefined}
          >
            <Icon name="shuffle" size={14} />
            Shuffle
          </button>
          <button
            type="button"
            className="pill"
            onClick={cycleRepeat}
            data-active={repeat !== 'off' ? 'true' : undefined}
          >
            <Icon name="repeat" size={14} />
            {repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat off'}
          </button>
          {upcomingCount > 0 && (
            <button type="button" className="pill" onClick={clearUpcoming}>
              <Icon name="close" size={14} />
              Clear upcoming
            </button>
          )}
          <button type="button" className="pill queue-page__danger" onClick={clearQueue}>
            <Icon name="trash" size={14} />
            Clear queue
          </button>
        </div>
      </header>

      {currentTrack && (
        <section className="queue-page__now">
          <div className="queue-page__now-art">
            <Artwork src={currentTrack.image} alt={currentTrack.title} size={500} kind="song" eager />
          </div>
          <div className="queue-page__now-text">
            <span className="queue-page__eyebrow">{isPlaying ? 'Now playing' : 'Paused'}</span>
            <h2 className="queue-page__now-title clamp-2">{currentTrack.title}</h2>
            <p className="queue-page__now-sub truncate">{currentTrack.artistLine}</p>
          </div>
          <button
            type="button"
            className="btn-accent queue-page__now-btn"
            onClick={toggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
        </section>
      )}

      <div className="queue-page__list">
        <p className="queue-page__hint">
          <Icon name="grip" size={14} />
          Drag a handle to reorder, or pick a track to jump straight to it.
        </p>
        <QueueList />
      </div>
    </div>
  )
}
