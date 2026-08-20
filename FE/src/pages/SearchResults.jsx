import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { PAGE_SIZE, SEARCH_TYPES, search } from '../api/endpoints'
import { EntityCard } from '../components/MediaCard'
import { SearchBar } from '../components/SearchBar'
import { SongList } from '../components/SongRow'
import { usePlayer } from '../player/PlayerContext'
import { searchPath } from '../routes'
import { Icon } from '../ui/Icon'
import { CardGridSkeleton, EmptyState, ErrorState, RowListSkeleton, Spinner } from '../ui/States'
import './SearchResults.css'

const TYPE_LABELS = { song: 'songs', album: 'albums', artist: 'artists' }

/**
 * Results for `?q=<query>&type=<song|album|artist>`.
 *
 * The URL owns the search state, so results are shareable and survive reloads.
 * Pages accumulate behind a "Load more" button rather than infinite scroll — the
 * backend mints a fresh auth token per song, so each page is a deliberate cost.
 */
export function SearchResults() {
  const [params] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const requestedType = params.get('type')
  const type = SEARCH_TYPES.includes(requestedType) ? requestedType : 'song'

  const { playNow, addToQueue } = usePlayer()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState(query ? 'loading' : 'idle')
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  /**
   * The in-flight "Load more" request, so a new search can cancel it. Without
   * this, a slow page 2 for “kesariya” resolves after you have searched for
   * something else and appends its tracks to the new results.
   */
  const moreRef = useRef(null)

  // First page: resets everything whenever the query or type changes.
  useEffect(() => {
    // The previous run's cleanup has just cancelled any "Load more" in flight;
    // its spinner is cleared here, since the cancelled call deliberately leaves
    // state alone.
    setLoadingMore(false)

    if (!query) {
      setItems([])
      setTotal(0)
      setStatus('idle')
      setError(null)
      return undefined
    }

    const controller = new AbortController()
    let active = true

    setStatus('loading')
    setError(null)
    setPage(1)

    search(type, { query, page: 1, signal: controller.signal })
      .then((result) => {
        if (!active) return
        setItems(result.results)
        setTotal(result.total)
        setHasMore(result.hasMore)
        setStatus('ready')
      })
      .catch((err) => {
        if (!active || err?.aborted) return
        setError(err)
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
      moreRef.current?.abort()
    }
  }, [query, type, retryKey])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    const controller = new AbortController()
    moreRef.current = controller
    setLoadingMore(true)
    // Clear any previous "couldn't load more" so a successful retry removes it.
    setError(null)
    try {
      const result = await search(type, { query, page: nextPage, signal: controller.signal })
      // De-duplicate: the upstream API can repeat entries across page edges.
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [...current, ...result.results.filter((item) => !seen.has(item.id))]
      })
      setPage(nextPage)
      setHasMore(result.hasMore)
    } catch (err) {
      if (err?.aborted) return
      setError(err)
    } finally {
      // A cancelled page belongs to a search that is no longer on screen, so it
      // touches nothing: the new search's effect owns the loading state now.
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }, [loadingMore, hasMore, page, type, query])

  const playableSongs = type === 'song' ? items.filter((item) => item.downloadUrls) : []

  /**
   * What a screen reader is told when the results change. Rendered always, and
   * empty until there is something to say: a live region only announces updates
   * to a region that was already there.
   */
  const announcement =
    status === 'loading'
      ? `Searching for ${query}`
      : status === 'error'
        ? 'Search failed'
        : status === 'ready'
          ? items.length === 0
            ? `No ${TYPE_LABELS[type]} found for ${query}`
            : `${items.length} of ${total} ${TYPE_LABELS[type]} for ${query}`
          : ''

  return (
    <div className="results">
      <div className="results__search">
        <SearchBar initialQuery={query} type={type} autoFocus={!query} />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {status === 'idle' ? (
        <SearchIdeas />
      ) : (
        <>
          <header className="results__head">
            <div>
              <h1 className="results__title">
                {status === 'loading' ? (
                  'Searching…'
                ) : (
                  <>
                    {TYPE_LABELS[type]} for <span className="results__query">“{query}”</span>
                  </>
                )}
              </h1>
              {status === 'ready' && (
                <p className="results__count">
                  {total > 0
                    ? `${items.length} of ${total.toLocaleString()} result${total === 1 ? '' : 's'}`
                    : 'No results'}
                </p>
              )}
            </div>

            {playableSongs.length > 0 && (
              <div className="results__actions">
                <button type="button" className="pill" onClick={() => playNow(playableSongs, 0)}>
                  <Icon name="play" size={13} />
                  Play all
                </button>
                <button type="button" className="pill" onClick={() => addToQueue(playableSongs)}>
                  <Icon name="plus" size={14} />
                  Queue all
                </button>
              </div>
            )}
          </header>

          {status === 'loading' ? (
            type === 'song' ? (
              <RowListSkeleton count={8} />
            ) : (
              <CardGridSkeleton count={10} round={type === 'artist'} />
            )
          ) : status === 'error' ? (
            <ErrorState error={error} onRetry={() => setRetryKey((key) => key + 1)} title="Search failed" />
          ) : items.length === 0 ? (
            <EmptyState
              icon="search"
              title={`No ${TYPE_LABELS[type]} found`}
              text={`Nothing matched “${query}”. Check the spelling, or try a different category.`}
            />
          ) : (
            <>
              {type === 'song' ? (
                <SongList tracks={items} showAlbum showIndex showHeader showArtwork />
              ) : (
                <div className="card-grid">
                  {items.map((item, index) => (
                    <EntityCard key={`${item.id}-${index}`} item={item} eager={index < 6} />
                  ))}
                </div>
              )}

              <div className="results__more">
                {hasMore ? (
                  <button type="button" className="pill results__more-btn" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <Spinner size={14} /> : <Icon name="chevron-down" size={15} />}
                    {loadingMore ? 'Loading…' : `Load ${PAGE_SIZE} more`}
                  </button>
                ) : (
                  items.length > PAGE_SIZE && <p className="results__end">That’s everything for “{query}”.</p>
                )}
                {error && status === 'ready' && (
                  <ErrorState error={error} onRetry={loadMore} title="Couldn’t load more" compact />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

const IDEAS = ['Arijit Singh', 'Kedarnath', 'Lo-fi', 'Diljit Dosanjh', 'A.R. Rahman', 'Anuv Jain']

/** Shown before the first search — gives the empty page something to do. */
function SearchIdeas() {
  return (
    <div className="ideas">
      <div className="ideas__head">
        <span className="state__icon">
          <Icon name="search" size={20} />
        </span>
        <h1 className="ideas__title">Search the catalogue</h1>
        <p className="ideas__text">
          Look up songs, albums or artists. Pick a category above, then press Enter or hit Search.
        </p>
      </div>
      <div className="ideas__chips">
        {IDEAS.map((idea) => (
          <Link key={idea} className="pill" to={searchPath(idea, 'song')}>
            {idea}
          </Link>
        ))}
      </div>
    </div>
  )
}
