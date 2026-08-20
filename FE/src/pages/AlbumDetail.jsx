import { Link, useParams } from 'react-router-dom'

import { getAlbum } from '../api/endpoints'
import { formatDurationLong, isEmptyEntity } from '../api/normalize'
import { SongList } from '../components/SongRow'
import { useAsync } from '../hooks/useAsync'
import { usePlayer } from '../player/PlayerContext'
import { artistPath } from '../routes'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { EmptyState, ErrorState, RowListSkeleton, Skeleton } from '../ui/States'
import './Detail.css'

/** Full album view: cover, metadata and the track list. */
export function AlbumDetail() {
  const { token } = useParams()
  const { playNow, addToQueue } = usePlayer()

  const { data: album, loading, error, reload } = useAsync((signal) => getAlbum(token, { signal }), [token])

  if (loading) return <DetailSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} title="Couldn’t load this album" />
  if (isEmptyEntity(album)) {
    return (
      <EmptyState
        icon="album"
        title="Album not found"
        text="That album link looks stale. Try searching for it instead."
        action={
          <Link to="/search" className="pill">
            Go to search
          </Link>
        }
      />
    )
  }

  const tracks = album.songs
  const playable = tracks.filter((track) => track.downloadUrls)
  const totalSeconds = tracks.reduce((sum, track) => sum + (track.duration || 0), 0)

  const facts = [
    'Album',
    album.year,
    `${tracks.length} track${tracks.length === 1 ? '' : 's'}`,
    totalSeconds > 0 && formatDurationLong(totalSeconds),
    album.language && album.language[0].toUpperCase() + album.language.slice(1),
  ].filter(Boolean)

  return (
    <div className="detail">
      <header className="detail__head">
        <div className="detail__art">
          <Artwork src={album.image} alt={album.title} size={500} kind="album" eager />
        </div>

        <div className="detail__info">
          <span className="detail__eyebrow">Album</span>
          <h1 className="detail__title">{album.title}</h1>

          {album.artists.length > 0 ? (
            <p className="detail__artists">
              {album.artists.map((artist, index) => (
                <span key={`${artist.id}-${index}`}>
                  {index > 0 && <span className="detail__sep">·</span>}
                  <Link to={artistPath(artist.token)} state={{ artist }} className="detail__artist-link">
                    {artist.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            album.subtitle && <p className="detail__artists">{album.subtitle}</p>
          )}

          <p className="detail__facts">{facts.join(' · ')}</p>

          <div className="detail__actions">
            <button
              type="button"
              className="btn-accent"
              onClick={() => playNow(playable, 0)}
              disabled={playable.length === 0}
            >
              <Icon name="play" size={16} />
              Play
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
            {playable.length > 1 && (
              <button
                type="button"
                className="pill detail__pill"
                onClick={() => playNow(shuffled(playable), 0)}
                title="Play in random order"
              >
                <Icon name="shuffle" size={14} />
                Shuffle
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="detail__body">
        {tracks.length === 0 ? (
          <EmptyState icon="song" title="No tracks listed" text="The API returned this album without a track list." />
        ) : (
          <SongList tracks={tracks} showIndex showArtwork={false} showHeader />
        )}
      </section>
    </div>
  )
}

/** Fisher–Yates, so "Shuffle" starts from a genuinely random order. */
function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function DetailSkeleton({ round = false }) {
  return (
    <div className="detail">
      <header className="detail__head" data-round={round ? 'true' : undefined}>
        <div className="detail__art">
          <Skeleton height="auto" radius={round ? 'var(--r-full)' : 'var(--r-lg)'} className="skeleton-card__art" />
        </div>
        <div className="detail__info">
          <Skeleton width={70} height={11} />
          <Skeleton width="65%" height={38} radius="var(--r-sm)" />
          <Skeleton width="35%" height={15} />
          <Skeleton width="45%" height={12} />
          <div className="detail__actions">
            <Skeleton width={116} height={44} radius="var(--r-full)" />
            <Skeleton width={140} height={34} radius="var(--r-full)" />
          </div>
        </div>
      </header>
      <section className="detail__body">
        <RowListSkeleton count={8} />
      </section>
    </div>
  )
}
