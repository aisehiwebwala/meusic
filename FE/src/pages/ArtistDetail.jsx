import { Link, useLocation, useParams } from 'react-router-dom'

import { deriveArtistProfile, getArtist } from '../api/endpoints'
import { AlbumCard } from '../components/MediaCard'
import { Section } from '../components/Section'
import { SongList } from '../components/SongRow'
import { useAsync } from '../hooks/useAsync'
import { usePlayer } from '../player/PlayerContext'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { EmptyState, ErrorState } from '../ui/States'
import { DetailSkeleton } from './AlbumDetail'
import './Detail.css'

const SONG_LIMIT = 20

/**
 * Artist view.
 *
 * `GET /api/detail/artist` returns top songs and albums but *no* artist profile,
 * so the name and image come from the card that linked here (router state) and
 * fall back to the artist entry embedded in their own top songs.
 */
export function ArtistDetail() {
  const { token } = useParams()
  const location = useLocation()
  const { playNow, addToQueue } = usePlayer()

  const passed = location.state?.artist
  const { data, loading, error, reload } = useAsync(
    (signal) => getArtist(token, { limit: SONG_LIMIT, page: 1, signal }),
    [token],
  )

  if (loading) return <DetailSkeleton round />
  if (error) return <ErrorState error={error} onRetry={reload} title="Couldn’t load this artist" />

  const songs = data?.songs || []
  const albums = data?.albums || []

  if (songs.length === 0 && albums.length === 0) {
    return (
      <EmptyState
        icon="artist"
        title="Artist not found"
        text="No songs or albums came back for this artist."
        action={
          <Link to="/search?type=artist" className="pill">
            Search artists
          </Link>
        }
      />
    )
  }

  const derived = deriveArtistProfile(token, songs)
  const name = passed?.name || derived.name || 'Unknown artist'
  const image = passed?.image || derived.image

  const playable = songs.filter((song) => song.downloadUrls)
  const facts = [
    'Artist',
    songs.length > 0 && `${songs.length} top song${songs.length === 1 ? '' : 's'}`,
    albums.length > 0 && `${albums.length} album${albums.length === 1 ? '' : 's'}`,
  ].filter(Boolean)

  return (
    <div className="detail">
      <header className="detail__head" data-round="true">
        <div className="detail__art">
          <Artwork src={image} alt={name} size={500} kind="artist" rounded eager />
        </div>

        <div className="detail__info">
          <span className="detail__eyebrow">Artist</span>
          <h1 className="detail__title">{name}</h1>
          <p className="detail__facts">{facts.join(' · ')}</p>

          <div className="detail__actions">
            <button
              type="button"
              className="btn-accent"
              onClick={() => playNow(playable, 0)}
              disabled={playable.length === 0}
            >
              <Icon name="play" size={16} />
              Play top songs
            </button>
            <button
              type="button"
              className="pill detail__pill"
              onClick={() => addToQueue(playable)}
              disabled={playable.length === 0}
            >
              <Icon name="plus" size={14} />
              Add to queue
            </button>
          </div>
        </div>
      </header>

      <div className="detail__sections">
        <Section title="Top songs" subtitle={`Most played by ${name}`}>
          {songs.length === 0 ? (
            <EmptyState icon="song" title="No songs listed" compact />
          ) : (
            <SongList tracks={songs} showAlbum showIndex showArtwork />
          )}
        </Section>

        <Section title="Albums" subtitle={`Records featuring ${name}`}>
          {albums.length === 0 ? (
            <EmptyState icon="album" title="No albums listed" compact />
          ) : (
            <div className="card-grid">
              {albums.map((album, index) => (
                <AlbumCard key={`${album.id}-${index}`} album={album} eager={index < 6} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
