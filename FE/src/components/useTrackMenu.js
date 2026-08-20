import { useNavigate } from 'react-router-dom'

import { usePlayer } from '../player/PlayerContext'
import { artistPath, albumPath } from '../routes'

/**
 * Builds the shared context-menu for a track. Every entry point (rows, cards,
 * the player, the queue) offers the same actions in the same order.
 *
 * Songs have no detail page of their own — clicking one plays it — so the only
 * navigation offered here is to the album and artist.
 *
 * @param {object} track
 * @param {{ hideAlbum?: boolean, extra?: Array }} [options]
 */
export function useTrackMenu(track, { hideAlbum = false, extra = [] } = {}) {
  const { playNext, addToQueue } = usePlayer()
  const navigate = useNavigate()

  if (!track) return []

  const primaryArtist = track.artists?.[0]

  const albumItem =
    !hideAlbum &&
    track.albumToken && {
      label: 'Go to album',
      icon: 'album',
      onSelect: () => navigate(albumPath(track.albumToken)),
    }

  const artistItem = primaryArtist?.token && {
    label: `More from ${primaryArtist.name}`,
    icon: 'artist',
    onSelect: () => navigate(artistPath(primaryArtist.token), { state: { artist: primaryArtist } }),
  }

  return [
    track.downloadUrls && { label: 'Play next', icon: 'next', onSelect: () => playNext(track) },
    track.downloadUrls && { label: 'Add to queue', icon: 'plus', onSelect: () => addToQueue(track) },
    ...extra,
    // Only divide the list when there is actually something below the line.
    (albumItem || artistItem) && { separator: true },
    albumItem,
    artistItem,
  ].filter(Boolean)
}
