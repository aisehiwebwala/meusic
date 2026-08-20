import { useLocation, useNavigate } from 'react-router-dom'

import { SearchBar } from '../components/SearchBar'
import { useIsMobile } from '../hooks/useMediaQuery'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'
import './TopBar.css'

/**
 * Sticky header: history controls plus the always-available search field.
 * The type tabs live on the search page itself, so this stays one line tall.
 */
export function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const params = new URLSearchParams(location.search)
  const isSearchPage = location.pathname === '/search'
  const atHome = location.pathname === '/'

  /**
   * `key === 'default'` marks the first entry in this app's history: a shared
   * album link opened in a new tab, where `navigate(-1)` either does nothing or
   * leaves the site. Home is the useful destination there — on a phone, that
   * back arrow is the only chrome on the screen.
   */
  const goBack = () => {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  return (
    <header className="topbar">
      {isMobile ? (
        <>
          {atHome ? (
            <Logo compact />
          ) : (
            <button type="button" className="icon-btn topbar__back" onClick={goBack} aria-label="Go back">
              <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </>
      ) : (
        <div className="topbar__history">
          <button type="button" className="icon-btn" onClick={goBack} aria-label="Go back">
            <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button type="button" className="icon-btn" onClick={() => navigate(1)} aria-label="Go forward">
            <Icon name="chevron" size={18} />
          </button>
        </div>
      )}

      {/* The search page renders its own bar with type tabs; showing a second
          field here would duplicate the control. */}
      {!isSearchPage && (
        <div className="topbar__search">
          <SearchBar initialQuery={params.get('q') || ''} type={params.get('type') || 'song'} showTypes={false} />
        </div>
      )}
    </header>
  )
}
