import { memo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { usePlayer } from '../player/PlayerContext'
import { albumPath, artistPath } from '../routes'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { Spinner } from '../ui/States'
import { useTrackMenu } from './useTrackMenu'
import './MediaCard.css'

/**
 * Card shell shared by songs, albums and artists.
 *
 * Albums and artists navigate to a detail page, so they get a `to` and render as
 * a link. Songs have no detail page — they play — so they get `onActivate`, and
 * the surface becomes a plain click target rather than a second button wrapped
 * around the overlaid play button. Keyboard users reach the same action through
 * that play button, which `:focus-within` keeps visible.
 */
function CardShell({
  to,
  state,
  onActivate,
  title,
  subtitle,
  image,
  kind,
  round = false,
  onPlay,
  isPlaying,
  pending = false,
  menuItems,
  eager,
}) {
  const inner = (
    <>
      <div className="media-card__art">
        <Artwork src={image} alt="" size={500} kind={kind} rounded={round} eager={eager} />
        {onPlay && (
          <button
            type="button"
            className="media-card__play"
            /* Pinned open while pending, so the thing you pressed stays on screen
               and visibly working — otherwise the pointer leaves and the only
               feedback disappears with it. */
            data-visible={isPlaying || pending ? 'true' : undefined}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onPlay()
            }}
            aria-label={pending ? `Loading ${title}` : isPlaying ? `Pause ${title}` : `Play ${title}`}
          >
            {pending ? <Spinner size={16} /> : <Icon name={isPlaying ? 'pause' : 'play'} size={18} />}
          </button>
        )}
      </div>
      <div className="media-card__body">
        <p className="media-card__title truncate" title={title}>
          {title}
        </p>
        {subtitle && <p className="media-card__sub truncate">{subtitle}</p>}
      </div>
    </>
  )

  return (
    <div className="media-card" data-round={round ? 'true' : undefined}>
      {to ? (
        <Link to={to} state={state} className="media-card__link" aria-label={title}>
          {inner}
        </Link>
      ) : (
        <div className="media-card__link" onClick={onActivate}>
          {inner}
        </div>
      )}
      {menuItems && menuItems.length > 0 && (
        <div className="media-card__menu">
          <Menu items={menuItems} label={`More options for ${title}`} />
        </div>
      )}
    </div>
  )
}

export const SongCard = memo(function SongCard({ song, context, contextIndex, eager }) {
  const { currentTrack, isPlaying, toggleTrack } = usePlayer()
  const menuItems = useTrackMenu(song)
  const isActive = currentTrack?.id === song.id && isPlaying
  const play = () => toggleTrack(song, context, contextIndex)

  return (
    <CardShell
      onActivate={play}
      title={song.title}
      subtitle={song.artistLine}
      image={song.image}
      kind="song"
      eager={eager}
      isPlaying={isActive}
      onPlay={play}
      menuItems={menuItems}
    />
  )
})

export const AlbumCard = memo(function AlbumCard({ album, eager }) {
  const subtitle = [album.subtitle, album.year].filter(Boolean).join(' · ')
  return (
    <CardShell
      to={albumPath(album.token)}
      title={album.title}
      subtitle={subtitle || 'Album'}
      image={album.image}
      kind="album"
      eager={eager}
    />
  )
})

export const ArtistCard = memo(function ArtistCard({ artist, eager }) {
  return (
    <CardShell
      to={artistPath(artist.token)}
      state={{ artist }}
      title={artist.name}
      subtitle="Artist"
      image={artist.image}
      kind="artist"
      round
      eager={eager}
    />
  )
})

/**
 * Renders the right card for any normalised entity — lets the search page stay
 * agnostic about which type it is showing.
 */
export function EntityCard({ item, context, contextIndex, eager }) {
  if (item.kind === 'album') return <AlbumCard album={item} eager={eager} />
  if (item.kind === 'artist') return <ArtistCard artist={item} eager={eager} />
  return <SongCard song={item} context={context} contextIndex={contextIndex} eager={eager} />
}

/**
 * Album card with a play button that queues the album once it is fetched.
 *
 * The fetch is a network round trip before anything audible happens, so the
 * button carries its own pending state — `onPlay` may return a promise, and
 * while it is unresolved the press is visibly in progress and can't be repeated.
 */
export function AlbumCardWithPlay({ album, onPlay, eager }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const subtitle = [album.subtitle, album.year].filter(Boolean).join(' · ')

  const play = async () => {
    if (pending) return
    setPending(true)
    try {
      await onPlay()
    } finally {
      setPending(false)
    }
  }

  return (
    <CardShell
      to={albumPath(album.token)}
      title={album.title}
      subtitle={subtitle || 'Album'}
      image={album.image}
      kind="album"
      eager={eager}
      onPlay={play}
      pending={pending}
      menuItems={[
        { label: pending ? 'Loading album…' : 'Play album', icon: 'play', disabled: pending, onSelect: play },
        { label: 'Open album', icon: 'album', onSelect: () => navigate(albumPath(album.token)) },
      ]}
    />
  )
}
