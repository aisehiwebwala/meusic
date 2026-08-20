import { Link } from 'react-router-dom'

import './Logo.css'

/** Wordmark with a small animated equaliser standing in for the icon. */
export function Logo({ compact = false }) {
  return (
    <Link to="/" className="logo" data-compact={compact ? 'true' : undefined} aria-label="Cadence — home">
      <span className="logo__mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span className="logo__word">Cadence</span>}
    </Link>
  )
}
