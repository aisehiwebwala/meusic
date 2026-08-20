import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatDuration } from '../api/normalize'
import { useIsMobile } from '../hooks/useMediaQuery'
import { albumPath, artistPath } from '../routes'
import { Artwork } from '../ui/Artwork'
import { Icon, VolumeIcon } from '../ui/Icon'
import { useUI } from '../ui/UIContext'
import { usePlayer } from './PlayerContext'
import { QualitySelector } from './QualitySelector'
import { Slider } from './Slider'
import './PlayerBar.css'

/** Persistent transport docked at the bottom of every page. */
export function PlayerBar() {
  const player = usePlayer()
  const { queueOpen, toggleQueue, openNowPlaying } = useUI()
  const isMobile = useIsMobile()

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
  } = player

  const [scrubTime, setScrubTime] = useState(null)

  const shown = scrubTime ?? currentTime
  const hasTrack = Boolean(currentTrack)
  const scrubbing = scrubTime !== null
  // Pressing Next on the last track wraps to the top, so anything past a single
  // entry counts — only a queue of one has nowhere to go.
  const canGoNext = entries.length > 1

  const renderProgress = (className) => (
    <Slider
      className={className}
      label="Seek"
      value={shown}
      max={duration}
      disabled={!hasTrack}
      formatValue={(value) => `${formatDuration(value)} of ${formatDuration(duration)}`}
      onPreview={setScrubTime}
      onDragStateChange={(dragging) => {
        // Suppress `timeupdate` writes so the handle tracks the pointer.
        seekingRef.current = dragging
      }}
      onCommit={seek}
    />
  )

  return (
    <>
      {/* Mobile keeps the timeline as a full-width strip above the bar: the row
          itself has no space for one, but scrubbing shouldn't need the sheet. */}
      {isMobile && <div className="player__seek">{renderProgress('player__seek-slider')}</div>}

      <footer className="player" data-empty={hasTrack ? undefined : 'true'}>
        {/* --------------------------------------------------------- track */}
        <div className="player__track">
          {hasTrack ? (
            isMobile ? (
              /* One tap target instead of art + linked artists: at 360px the row
                 has no room for separate links, and the sheet holds them all. */
              <button
                type="button"
                className="player__peek"
                onClick={openNowPlaying}
                aria-label={`Open now playing: ${currentTrack.title}`}
              >
                <span className="player__art">
                  <Artwork src={currentTrack.image} alt="" size={150} kind="song" eager />
                </span>
                <span className="player__meta">
                  <span className="player__title">{currentTrack.title}</span>
                  {/* The subline doubles as the scrub readout and, since the bar's
                      error text has nowhere to go on mobile, as the error slot. */}
                  <span
                    className="player__artists"
                    data-error={playbackError ? 'true' : undefined}
                    role={playbackError ? 'alert' : undefined}
                  >
                    {playbackError ||
                      (scrubbing
                        ? `${formatDuration(shown)} / ${formatDuration(duration)}`
                        : currentTrack.artistLine)}
                  </span>
                </span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="player__art"
                  onClick={openNowPlaying}
                  aria-label="Open now playing"
                  title="Now playing"
                >
                  <Artwork src={currentTrack.image} alt="" size={150} kind="song" eager />
                  <span className="player__art-expand">
                    <Icon name="expand" size={15} />
                  </span>
                </button>
                <div className="player__meta">
                  <p className="player__title" title={currentTrack.title}>
                    {currentTrack.title}
                  </p>
                  <p className="player__artists">
                    {currentTrack.artists.length > 0 ? (
                      currentTrack.artists.slice(0, 2).map((artist, index) => (
                        <span key={`${artist.id}-${index}`}>
                          {index > 0 && ', '}
                          <Link to={artistPath(artist.token)} state={{ artist }} className="player__sublink">
                            {artist.name}
                          </Link>
                        </span>
                      ))
                    ) : (
                      <span>{currentTrack.artistLine}</span>
                    )}
                  </p>
                </div>
                {currentTrack.albumToken && (
                  <Link
                    to={albumPath(currentTrack.albumToken)}
                    className="icon-btn player__album-link"
                    aria-label={`Go to album ${currentTrack.album}`}
                    title={currentTrack.album}
                  >
                    <Icon name="album" size={17} />
                  </Link>
                )}
              </>
            )
          ) : (
            <div className="player__idle">
              <span className="player__idle-art">
                <Icon name="song" size={19} />
              </span>
              <div className="player__meta">
                <p className="player__title">Nothing playing</p>
                <p className="player__artists">Pick a track to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------- transport */}
        <div className="player__center">
          <div className="player__buttons">
            {!isMobile && (
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
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={previous}
              disabled={!hasTrack}
              /* With nothing behind it the button restarts the track, so say so
                 rather than promise a jump that can't happen. */
              aria-label={hasPrevious ? 'Previous track' : 'Restart track'}
              title={hasPrevious ? 'Previous' : 'Restart'}
            >
              <Icon name="previous" size={19} />
            </button>

            <button
              type="button"
              className="player__play"
              onClick={toggle}
              disabled={!hasTrack}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {buffering && isPlaying ? (
                <span className="player__spinner" aria-hidden="true" />
              ) : (
                <Icon name={isPlaying ? 'pause' : 'play'} size={19} />
              )}
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => next()}
              disabled={!hasTrack || !canGoNext}
              aria-label="Next track"
            >
              <Icon name="next" size={19} />
            </button>

            {!isMobile && (
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
            )}
          </div>

          {!isMobile && (
            <div className="player__timeline">
              <span className="player__time">{formatDuration(shown)}</span>
              {renderProgress('player__progress')}
              <span className="player__time">{formatDuration(duration)}</span>
            </div>
          )}

          {playbackError && (
            <p className="player__error" role="alert">
              <Icon name="alert" size={13} />
              {playbackError}
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- extras */}
        <div className="player__extras">
          <QualitySelector />

          {!isMobile && (
            <div className="player__volume">
              <button
                type="button"
                className="icon-btn"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                aria-pressed={muted}
              >
                <VolumeIcon level={volume} muted={muted} size={19} />
              </button>
              <Slider
                className="player__volume-slider"
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
          )}

          {/* Mobile reaches the queue from the bottom nav, which already carries an
              unread-style dot — a second entry point would only crowd the row. */}
          {!isMobile && (
            <button
              type="button"
              className="icon-btn"
              onClick={toggleQueue}
              aria-pressed={queueOpen}
              aria-label={`${queueOpen ? 'Hide' : 'Show'} queue`}
              title="Queue"
            >
              <Icon name="queue" size={19} />
              {entries.length > 0 && <span className="player__queue-count">{entries.length}</span>}
            </button>
          )}
        </div>
      </footer>
    </>
  )
}
