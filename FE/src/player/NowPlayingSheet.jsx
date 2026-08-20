import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { formatDuration } from '../api/normalize'
import { useTrackMenu } from '../components/useTrackMenu'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { albumPath, artistPath } from '../routes'
import { Artwork } from '../ui/Artwork'
import { Icon, VolumeIcon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { useUI } from '../ui/UIContext'
import { usePlayer } from './PlayerContext'
import { QualitySelector } from './QualitySelector'
import { Slider } from './Slider'
import './NowPlayingSheet.css'

/**
 * Full-screen now-playing view. It is the primary transport on handsets (where
 * the docked bar is condensed) and an optional expanded view on desktop.
 */
export function NowPlayingSheet() {
  const { nowPlayingOpen, closeNowPlaying, toggleQueue } = useUI()
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffering,
    playbackError,
    volume,
    muted,
    shuffle,
    repeat,
    entries,
    currentIndex,
    hasPrevious,
    toggle,
    next,
    previous,
    seek,
    changeVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    seekingRef,
  } = usePlayer()

  const [scrubTime, setScrubTime] = useState(null)
  const sheetRef = useRef(null)
  const menuItems = useTrackMenu(currentTrack)
  const shown = scrubTime ?? currentTime

  // The sheet covers the page rather than sitting inside it, so the keyboard has
  // to be kept in — and handed back to the player bar on the way out.
  useFocusTrap(sheetRef, nowPlayingOpen && Boolean(currentTrack))

  // Escape closes the sheet. Nothing behind it needs locking: the shell keeps
  // scrolling inside <main>, which the sheet covers rather than sits inside.
  useEffect(() => {
    if (!nowPlayingOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') closeNowPlaying()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [nowPlayingOpen, closeNowPlaying])

  // Nothing to show once the queue empties out.
  useEffect(() => {
    if (nowPlayingOpen && !currentTrack) closeNowPlaying()
  }, [nowPlayingOpen, currentTrack, closeNowPlaying])

  if (!currentTrack) return null

  const upNext = entries[currentIndex + 1]

  return (
    <section
      ref={sheetRef}
      className="np"
      data-open={nowPlayingOpen ? 'true' : undefined}
      /* Modal in fact — it covers the viewport — so it says so, which is what
         scopes a screen reader to the sheet instead of the page behind it. */
      role="dialog"
      aria-modal={nowPlayingOpen ? 'true' : undefined}
      aria-label="Now playing"
      aria-hidden={nowPlayingOpen ? undefined : 'true'}
    >
      {/* Artwork bled behind the sheet, heavily blurred — the only place colour
          enters the UI, and it comes from the album art itself. */}
      <div className="np__backdrop" aria-hidden="true">
        <Artwork src={currentTrack.image} alt="" size={500} kind="song" />
      </div>

      <div className="np__inner">
        <header className="np__head">
          <button type="button" className="icon-btn" onClick={closeNowPlaying} aria-label="Close now playing">
            <Icon name="chevron-down" size={20} />
          </button>
          <div className="np__head-label">
            <span className="np__eyebrow">Now playing</span>
            {currentTrack.albumToken && (
              <Link to={albumPath(currentTrack.albumToken)} className="np__album truncate" onClick={closeNowPlaying}>
                {currentTrack.album}
              </Link>
            )}
          </div>
          <Menu items={menuItems} label="Track options" />
        </header>

        <div className="np__art">
          <Artwork src={currentTrack.image} alt={currentTrack.title} size={500} kind="song" eager />
        </div>

        <div className="np__meta">
          <h1 className="np__title clamp-2">{currentTrack.title}</h1>
          <p className="np__artists truncate">
            {currentTrack.artists.length > 0 ? (
              currentTrack.artists.slice(0, 3).map((artist, index) => (
                <span key={`${artist.id}-${index}`}>
                  {index > 0 && ', '}
                  <Link
                    to={artistPath(artist.token)}
                    state={{ artist }}
                    className="np__artist-link"
                    onClick={closeNowPlaying}
                  >
                    {artist.name}
                  </Link>
                </span>
              ))
            ) : (
              <span>{currentTrack.artistLine}</span>
            )}
          </p>
        </div>

        <div className="np__timeline">
          <Slider
            label="Seek"
            value={shown}
            max={duration}
            formatValue={(value) => `${formatDuration(value)} of ${formatDuration(duration)}`}
            onPreview={setScrubTime}
            onDragStateChange={(dragging) => {
              seekingRef.current = dragging
            }}
            onCommit={seek}
          />
          <div className="np__times">
            <span>{formatDuration(shown)}</span>
            <span>-{formatDuration(Math.max(0, duration - shown))}</span>
          </div>
        </div>

        {playbackError && (
          <p className="np__error" role="alert">
            <Icon name="alert" size={14} />
            {playbackError}
          </p>
        )}

        <div className="np__controls">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Shuffle"
          >
            <Icon name="shuffle" size={19} />
          </button>
          <button
            type="button"
            className="icon-btn np__step"
            onClick={previous}
            aria-label={hasPrevious ? 'Previous track' : 'Restart track'}
          >
            <Icon name="previous" size={26} />
          </button>
          <button type="button" className="np__play" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {buffering && isPlaying ? (
              <span className="np__spinner" aria-hidden="true" />
            ) : (
              <Icon name={isPlaying ? 'pause' : 'play'} size={26} />
            )}
          </button>
          <button type="button" className="icon-btn np__step" onClick={() => next()} aria-label="Next track">
            <Icon name="next" size={26} />
          </button>
          <button
            type="button"
            className="icon-btn player__repeat"
            onClick={cycleRepeat}
            data-active={repeat !== 'off' ? 'true' : undefined}
            aria-label={`Repeat: ${repeat}`}
          >
            <Icon name="repeat" size={19} />
            {repeat === 'one' && <span className="player__repeat-badge">1</span>}
          </button>
        </div>

        <div className="np__panel">
          <div className="np__panel-row np__panel-row--quality">
            <span className="np__panel-label">Audio quality</span>
            <QualitySelector variant="inline" />
          </div>

          <div className="np__panel-row np__panel-row--volume">
            <button type="button" className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              <VolumeIcon level={volume} muted={muted} size={19} />
            </button>
            <Slider
              label="Volume"
              value={muted ? 0 : volume}
              max={1}
              step={0.05}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onCommit={changeVolume}
              onPreview={(value) => {
                if (value !== null) changeVolume(value)
              }}
            />
          </div>
        </div>

        <button type="button" className="np__upnext" onClick={toggleQueue}>
          <span className="np__upnext-label">
            <Icon name="queue" size={16} />
            {upNext ? 'Up next' : 'Queue'}
          </span>
          <span className="np__upnext-track truncate">
            {upNext ? `${upNext.title} · ${upNext.artistLine}` : `${entries.length} in queue`}
          </span>
          <Icon name="chevron" size={16} />
        </button>
      </div>
    </section>
  )
}
