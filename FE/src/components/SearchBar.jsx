import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SEARCH_TYPES } from '../api/endpoints'
import { searchPath } from '../routes'
import { Icon } from '../ui/Icon'
import { handleRadioGroupKeys } from '../ui/radioGroupKeys'
import './SearchBar.css'

const TYPE_LABELS = { song: 'Songs', album: 'Albums', artist: 'Artists' }
const TYPE_ICONS = { song: 'song', album: 'album', artist: 'artist' }

/**
 * Search input plus type selector. Submitting (Enter or the button) navigates
 * to `/search`; the URL is the single source of truth for the query, so results
 * survive a reload and are shareable.
 *
 * Changing the type re-submits immediately when a query is already present —
 * switching from Songs to Artists shouldn't need a second Enter.
 *
 * @param {{ initialQuery?: string, type?: string, autoFocus?: boolean, showTypes?: boolean }} props
 */
export function SearchBar({ initialQuery = '', type = 'song', autoFocus = false, showTypes = true }) {
  const [value, setValue] = useState(initialQuery)
  const [activeType, setActiveType] = useState(type)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Keep in sync when the URL changes underneath us (back/forward, links).
  useEffect(() => setValue(initialQuery), [initialQuery])
  useEffect(() => setActiveType(type), [type])

  const submit = (nextType = activeType, nextValue = value) => {
    const query = nextValue.trim()
    if (query.length === 0) {
      inputRef.current?.focus()
      return
    }
    navigate(searchPath(query, nextType))
  }

  const selectType = (nextType) => {
    setActiveType(nextType)
    if (value.trim().length > 0) submit(nextType)
  }

  return (
    <div className="search-bar">
      <form
        className="search-bar__field"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Icon name="search" size={18} className="search-bar__icon" />
        <input
          ref={inputRef}
          type="search"
          className="search-bar__input"
          placeholder={`Search ${TYPE_LABELS[activeType].toLowerCase()}…`}
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          aria-label={`Search ${TYPE_LABELS[activeType].toLowerCase()}`}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setValue('')
          }}
        />
        {value.length > 0 && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
          >
            <Icon name="close" size={15} />
          </button>
        )}
        <button type="submit" className="search-bar__submit">
          Search
        </button>
      </form>

      {/* A radiogroup, not a tablist: these pick what to search for, and there are
          no tabpanels for a tablist's roles to point at. */}
      {showTypes && (
        <div
          className="search-bar__types"
          role="radiogroup"
          aria-label="Search category"
          onKeyDown={(event) => handleRadioGroupKeys(event, SEARCH_TYPES, selectType)}
        >
          {SEARCH_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={activeType === option}
              /* Roving tabindex: a radio group is one stop in the tab order, and
                 the arrow keys move within it. */
              tabIndex={activeType === option ? 0 : -1}
              className="search-bar__type"
              data-active={activeType === option ? 'true' : undefined}
              onClick={() => selectType(option)}
            >
              <Icon name={TYPE_ICONS[option]} size={15} />
              {TYPE_LABELS[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
