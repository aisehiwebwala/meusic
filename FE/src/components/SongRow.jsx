import { memo } from 'react'
import { Link } from 'react-router-dom'

import { formatDuration } from '../api/normalize'
import { usePlayer } from '../player/PlayerContext'
import { albumPath, artistPath } from '../routes'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { useTrackMenu } from './useTrackMenu'
import './SongRow.css'

/** Three animated bars shown in place of the track number while it plays. */
function PlayingBars({ animate }) {
  return (
    <span className="playing-bars" data-paused={animate ? undefined : 'true'} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

/**
 * One track in a list. `context` is the list the row belongs to, so pressing
 * play queues the whole album/result set rather than the single song.
 *
 * @param {{
 *   track: object,
 *   index?: number,
 *   context?: object[],
 *   contextIndex?: number,
 *   showArtwork?: boolean,
 *   showAlbum?: boolean,
 *   showIndex?: boolean,
 * }} props
 */
export const SongRow = memo(function SongRow({
  track,
  index,
  context,
  contextIndex,
  showArtwork = true,
  showAlbum = false,
  showIndex = false,
}) {
  const { currentTrack, isPlaying, toggleTrack } = usePlayer()
  const menuItems = useTrackMenu(track, { hideAlbum: !track.albumToken })

  const isCurrent = currentTrack?.id === track.id
  const isActive = isCurrent && isPlaying
  const unavailable = !track.downloadUrls

  const play = () => toggleTrack(track, context, contextIndex ?? index)

  /**
   * Clicking anywhere on the row plays it. Nested links (artist, album) and
   * buttons (the lead play button, the overflow menu) handle their own clicks,
   * so bail out when the event came from one of those.
   */
  const handleRowClick = (event) => {
    if (unavailable) return
    if (event.target.closest('a, button')) return
    play()
  }

  return (
    <div
      className="song-row"
      data-current={isCurrent ? 'true' : undefined}
      data-unavailable={unavailable ? 'true' : undefined}
      onClick={handleRowClick}
    >
      {showIndex && (
        <span className="song-row__index">
          {isCurrent ? <PlayingBars animate={isActive} /> : <span className="song-row__num">{(index ?? 0) + 1}</span>}
        </span>
      )}

      <button
        type="button"
        className="song-row__lead"
        data-bare={showArtwork ? undefined : 'true'}
        onClick={play}
        aria-label={unavailable ? `${track.title} is unavailable` : isActive ? `Pause ${track.title}` : `Play ${track.title}`}
        disabled={unavailable}
      >
        {showArtwork && <Artwork src={track.image} alt="" size={150} kind="song" className="song-row__art" />}
        <span className="song-row__overlay">
          <Icon name={isActive ? 'pause' : 'play'} size={16} />
        </span>
      </button>

      <div className="song-row__meta">
        <span className="song-row__title truncate" title={track.title}>
          {track.title}
        </span>
        <p className="song-row__sub truncate">
          {track.artists.length > 0 ? (
            track.artists.slice(0, 3).map((artist, position) => (
              <span key={`${artist.id}-${position}`}>
                {position > 0 && ', '}
                <Link to={artistPath(artist.token)} state={{ artist }} className="song-row__link">
                  {artist.name}
                </Link>
              </span>
            ))
          ) : (
            <span>{track.artistLine || '—'}</span>
          )}
        </p>
      </div>

      {showAlbum && (
        <div className="song-row__album truncate">
          {track.albumToken ? (
            <Link to={albumPath(track.albumToken)} className="song-row__link">
              {track.album}
            </Link>
          ) : (
            <span>{track.album}</span>
          )}
        </div>
      )}

      <div className="song-row__tail">
        {unavailable && <span className="song-row__badge">Unavailable</span>}
        <span className="song-row__time">{formatDuration(track.duration)}</span>
        <Menu items={menuItems} label={`More options for ${track.title}`} />
      </div>
    </div>
  )
})

/** Vertical list wrapper; renders an optional column header on wide screens. */
export function SongList({ tracks, showAlbum = false, showIndex = false, showHeader = false, showArtwork = true }) {
  return (
    <div className="song-list" data-with-album={showAlbum ? 'true' : undefined}>
      {showHeader && (
        /* Mirrors the row's flex structure so the columns line up. */
        <div className="song-list__head">
          {showIndex && <span className="song-row__index">#</span>}
          <span className="song-list__head-spacer" data-bare={showArtwork ? undefined : 'true'} aria-hidden="true" />
          <span className="song-list__head-cell song-list__head-cell--grow">Title</span>
          {showAlbum && <span className="song-list__head-cell song-list__head-cell--grow song-row__album">Album</span>}
          <span className="song-list__head-cell song-list__head-time">Time</span>
        </div>
      )}
      {tracks.map((track, index) => (
        <SongRow
          key={`${track.id}-${index}`}
          track={track}
          index={index}
          context={tracks}
          contextIndex={index}
          showAlbum={showAlbum}
          showIndex={showIndex}
          showArtwork={showArtwork}
        />
      ))}
    </div>
  )
}
