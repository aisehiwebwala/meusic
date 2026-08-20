import { NavLink } from 'react-router-dom'

import { LanguagePicker } from '../components/LanguagePicker'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'
import './Sidebar.css'

const NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/queue', label: 'Queue', icon: 'queue' },
]

/** Desktop navigation rail. Hidden below 821px in favour of `<MobileNav>`. */
export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <Logo />
      </div>

      <ul className="sidebar__nav">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className="sidebar__link" end={item.to === '/'}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar__section">
        <LanguagePicker id="sidebar-language" />
      </div>

      <p className="sidebar__foot">
        <span className="sidebar__tagline">Find your rhythm.</span>
        Audio at 96, 160 or 320 kbps.
      </p>
    </nav>
  )
}
