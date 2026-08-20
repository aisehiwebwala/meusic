import { NavLink } from 'react-router-dom'

import { usePlayer } from '../player/PlayerContext'
import { Icon } from '../ui/Icon'
import { useUI } from '../ui/UIContext'
import './MobileNav.css'

/** Bottom tab bar, shown below 821px in place of the sidebar. */
export function MobileNav() {
  const { toggleQueue, queueOpen } = useUI()
  const { entries } = usePlayer()

  return (
    <nav className="mobile-nav" aria-label="Primary">
      <NavLink to="/" className="mobile-nav__item" end>
        <Icon name="home" size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className="mobile-nav__item">
        <Icon name="search" size={20} />
        <span>Search</span>
      </NavLink>
      <button
        type="button"
        className="mobile-nav__item"
        onClick={toggleQueue}
        aria-pressed={queueOpen}
        data-active={queueOpen ? 'true' : undefined}
      >
        <span className="mobile-nav__icon">
          <Icon name="queue" size={20} />
          {entries.length > 0 && <span className="mobile-nav__dot" />}
        </span>
        <span>Queue</span>
      </button>
    </nav>
  )
}
