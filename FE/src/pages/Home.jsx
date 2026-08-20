import { useCallback } from 'react'

import { getAlbum, getTrendingAlbums, getTrendingSongs } from '../api/endpoints'
import { LanguagePicker } from '../components/LanguagePicker'
import { AlbumCardWithPlay, SongCard } from '../components/MediaCard'
import { Section } from '../components/Section'
import { SongList } from '../components/SongRow'
import { useAsync } from '../hooks/useAsync'
import { useLanguage } from '../LanguageContext'
import { usePlayer } from '../player/PlayerContext'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { CardGridSkeleton, EmptyState, ErrorState, RowListSkeleton } from '../ui/States'
import { useToast } from '../ui/ToastContext'
import './Home.css'

const SHELF_LIMIT = 12

/** Landing page: trending songs and albums for the selected language. */
export function Home() {
  const { language } = useLanguage()
  const { playNow, addToQueue } = usePlayer()
  const toast = useToast()

  const songs = useAsync((signal) => getTrendingSongs({ language, signal }), [language])
  const albums = useAsync((signal) => getTrendingAlbums({ language, signal }), [language])

  const trendingSongs = songs.data || []
  const playable = trendingSongs.filter((song) => song.downloadUrls)

  /** Album cards fetch their track list on demand before queuing it. */
  const playAlbum = useCallback(
    async (album) => {
      try {
        const detail = await getAlbum(album.token)
        const tracks = (detail?.songs || []).filter((song) => song.downloadUrls)
        if (tracks.length === 0) {
          toast.show('No playable tracks in this album')
          return
        }
        playNow(tracks, 0)
      } catch (error) {
        toast.show(error.message || 'Could not load that album')
      }
    },
    [playNow, toast],
  )

  return (
    <>
      <Hero
        language={language}
        songs={playable}
        loading={songs.loading}
        error={songs.error}
        onPlayAll={() => playNow(playable, 0)}
        onQueueAll={() => addToQueue(playable)}
      />

      {/* Only rendered below 821px, where the sidebar — and with it the only other
          copy of this control — is hidden. */}
      <LanguagePicker id="home-language" variant="inline" label="Trending language" />

      <Section
        title="Trending songs"
        subtitle={`Most played in ${language} right now`}
        action={
          playable.length > 0 && (
            <button type="button" className="pill" onClick={() => playNow(playable, 0)}>
              <Icon name="play" size={13} />
              Play all
            </button>
          )
        }
      >
        {songs.loading ? (
          <CardGridSkeleton count={6} />
        ) : songs.error ? (
          <ErrorState error={songs.error} onRetry={songs.reload} title="Couldn’t load trending songs" />
        ) : trendingSongs.length === 0 ? (
          <EmptyState
            icon="song"
            title="No trending songs"
            text={`Nothing is charting in ${language} right now — try another language, or search instead.`}
          />
        ) : (
          <div className="card-grid">
            {trendingSongs.slice(0, SHELF_LIMIT).map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                context={trendingSongs}
                contextIndex={index}
                eager={index < 6}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Trending albums" subtitle="Fresh records and soundtracks">
        {albums.loading ? (
          <CardGridSkeleton count={6} />
        ) : albums.error ? (
          <ErrorState error={albums.error} onRetry={albums.reload} title="Couldn’t load trending albums" />
        ) : (albums.data || []).length === 0 ? (
          <EmptyState
            icon="album"
            title="No trending albums"
            text={`No ${language} albums are charting right now — try another language, or search instead.`}
          />
        ) : (
          <div className="card-grid">
            {albums.data.slice(0, SHELF_LIMIT).map((album) => (
              <AlbumCardWithPlay key={album.id} album={album} onPlay={() => playAlbum(album)} />
            ))}
          </div>
        )}
      </Section>

      {/* The same trending list as a compact queue-friendly view. Hidden outright
          when the fetch failed, because it shares its request — and therefore its
          error state — with "Trending songs" above. */}
      {!songs.error && (
        <Section title="More to play" subtitle="The rest of today’s trending list">
          {songs.loading ? (
            <RowListSkeleton count={6} />
          ) : trendingSongs.length > SHELF_LIMIT ? (
            <SongList tracks={trendingSongs.slice(SHELF_LIMIT)} showAlbum showIndex />
          ) : (
            <EmptyState
              icon="sparkle"
              title="That’s everything"
              text="Search to dig deeper into the catalogue."
              compact
            />
          )}
        </Section>
      )}
    </>
  )
}

/** Editorial header with the first trending track as the featured item. */
function Hero({ language, songs, loading, error, onPlayAll, onQueueAll }) {
  const featured = songs[0]

  // A failed fetch and an empty chart are different things, and "nothing
  // trending" would send someone hunting for another language when the real
  // answer is "try again". The retry button lives in the section below, which
  // shares this request.
  const title = loading
    ? 'Loading today’s charts…'
    : error
      ? 'Couldn’t load today’s charts'
      : featured
        ? featured.title
        : 'Nothing trending right now'

  const subtitle = loading
    ? 'Fetching the current charts.'
    : error
      ? error.message
      : featured
        ? `${featured.artistLine}${featured.year ? ` · ${featured.year}` : ''}`
        : 'Pick another language, or search for something specific.'

  return (
    <section className="hero">
      <div className="hero__body">
        <span className="hero__eyebrow">
          <Icon name="sparkle" size={13} />
          Trending in {language}
        </span>
        <h1 className="hero__title">{title}</h1>
        <p className="hero__sub">{subtitle}</p>

        <div className="hero__actions">
          <button type="button" className="btn-accent" onClick={onPlayAll} disabled={songs.length === 0}>
            <Icon name="play" size={16} />
            Play {songs.length > 0 ? `all ${songs.length}` : 'all'}
          </button>
          <button type="button" className="pill" onClick={onQueueAll} disabled={songs.length === 0}>
            <Icon name="plus" size={14} />
            Add to queue
          </button>
        </div>
      </div>

      {/* Decorative stack of the top three covers. */}
      <div className="hero__art" aria-hidden="true">
        {songs.slice(0, 3).map((song, index) => (
          <span key={`${song.id}-${index}`} className="hero__cover" data-depth={index}>
            <Artwork src={song.image} alt="" size={500} kind="song" eager />
          </span>
        ))}
      </div>
    </section>
  )
}
