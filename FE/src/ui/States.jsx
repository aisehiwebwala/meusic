import { Icon } from './Icon'
import './States.css'

/** Rectangular shimmer block — the base of every skeleton in the app. */
export function Skeleton({ width = '100%', height = 14, radius = 'var(--r-sm)', className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

/** Placeholder matching the footprint of a `<MediaCard>`. */
export function CardSkeleton({ round = false }) {
  return (
    <div className="skeleton-card">
      <Skeleton height="auto" radius={round ? 'var(--r-full)' : 'var(--r-md)'} className="skeleton-card__art" />
      <Skeleton width="75%" height={13} />
      <Skeleton width="50%" height={11} />
    </div>
  )
}

export function CardGridSkeleton({ count = 6, round = false }) {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} round={round} />
      ))}
    </div>
  )
}

/** Placeholder matching the footprint of a `<SongRow>`. */
export function RowListSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <Skeleton width={44} height={44} radius="var(--r-sm)" />
          <div className="skeleton-row__text">
            <Skeleton width={`${45 + ((index * 13) % 35)}%`} height={13} />
            <Skeleton width={`${25 + ((index * 7) % 20)}%`} height={11} />
          </div>
          <Skeleton width={34} height={11} />
        </div>
      ))}
    </div>
  )
}

export function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

/**
 * Terminal state for a failed fetch. Always offers a retry, because most
 * failures here are transient upstream hiccups.
 */
export function ErrorState({ error, onRetry, title = 'Something went wrong', compact = false }) {
  const message = error?.message || 'Unexpected error.'
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <span className="state__icon state__icon--error">
        <Icon name="alert" size={20} />
      </span>
      <div className="state__body">
        <p className="state__title">{title}</p>
        <p className="state__text">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="pill" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

/** Nothing-to-show state. `action` is an optional node, e.g. a "Browse" link. */
export function EmptyState({ icon = 'search', title = 'Nothing here', text, action, compact = false }) {
  return (
    <div className={`state ${compact ? 'state--compact' : ''}`}>
      <span className="state__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="state__body">
        <p className="state__title">{title}</p>
        {text && <p className="state__text">{text}</p>}
      </div>
      {action}
    </div>
  )
}
