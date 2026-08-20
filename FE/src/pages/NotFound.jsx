import { Link } from 'react-router-dom'

import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/States'

/** Catch-all route. */
export function NotFound() {
  return (
    <EmptyState
      icon="alert"
      title="Page not found"
      text="That link doesn’t lead anywhere. Head back home or search for something to play."
      action={
        <div className="state__actions">
          <Link to="/" className="btn-accent">
            <Icon name="home" size={16} />
            Go home
          </Link>
          <Link to="/search" className="pill">
            <Icon name="search" size={14} />
            Search
          </Link>
        </div>
      }
    />
  )
}
