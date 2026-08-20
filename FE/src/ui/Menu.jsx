import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useClickOutside } from '../hooks/useClickOutside'
import { Icon } from './Icon'
import './Menu.css'

/**
 * Popover menu rendered in a portal so it is never clipped by a scrolling row
 * or an `overflow: hidden` card. Position is measured from the trigger and
 * flipped/clamped to stay inside the viewport.
 *
 * Items are `{ label, icon?, danger?, disabled?, onSelect }`, or `{ separator: true }`.
 *
 * @param {{ items: Array, label?: string, align?: 'start'|'end', trigger?: (props) => import('react').ReactNode }} props
 */
export function Menu({ items, label = 'More options', align = 'end', trigger }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  /**
   * Closing hands focus back to the trigger whenever it was inside the menu, so
   * Escape and item selection don't drop the keyboard at the end of `<body>`
   * where the portal lives. On an outside click this runs from `pointerdown`,
   * before the browser focuses whatever was clicked — so that click still wins.
   */
  const close = useCallback(() => {
    if (menuRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
    setOpen(false)
  }, [])

  useClickOutside(menuRef, (event) => {
    // A press on the trigger is its own toggle; Escape always closes.
    if (event.type !== 'keydown' && triggerRef.current?.contains(event.target)) return
    close()
  }, open)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return
    const anchor = triggerRef.current.getBoundingClientRect()
    const menu = menuRef.current.getBoundingClientRect()
    const margin = 8

    let left = align === 'end' ? anchor.right - menu.width : anchor.left
    left = Math.max(margin, Math.min(left, window.innerWidth - menu.width - margin))

    const below = anchor.bottom + margin
    const fitsBelow = below + menu.height < window.innerHeight - margin
    const top = fitsBelow ? below : Math.max(margin, anchor.top - menu.height - margin)

    setPosition({ top, left, flipped: !fitsBelow })
  }, [open, align, items.length])

  // Recompute on scroll/resize by simply closing — cheaper and less jittery
  // than tracking the anchor through a virtualised list.
  useLayoutEffect(() => {
    if (!open) return undefined
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  /** The items a keyboard can land on, in DOM order. */
  const focusableItems = () =>
    Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])

  /**
   * Move focus into the menu once it has a real position.
   *
   * The portal renders at the end of `<body>`, so without this the items sit at
   * the far end of the tab order: a keyboard user who opened the menu would have
   * to traverse the rest of the page to reach them. Programmatic focus after a
   * click doesn't match `:focus-visible`, so mouse users see no ring.
   */
  useEffect(() => {
    if (!open || !position) return
    // Re-running on `position` is the point: it flips from null to a measured
    // value exactly once per open, which is when the menu is on screen.
    focusableItems()[0]?.focus()
  }, [open, position])

  const onMenuKeyDown = (event) => {
    const menuItems = focusableItems()
    if (menuItems.length === 0) return
    const from = menuItems.indexOf(document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0

    if (step !== 0) {
      event.preventDefault()
      const to = from === -1 ? (step > 0 ? 0 : menuItems.length - 1) : (from + step + menuItems.length) % menuItems.length
      menuItems[to].focus()
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      menuItems[0].focus()
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      menuItems[menuItems.length - 1].focus()
      return
    }
    // Tab out of a portal would land nowhere useful, so it closes instead and
    // `close()` puts focus back on the trigger — the next Tab carries on there.
    if (event.key === 'Tab') {
      event.preventDefault()
      close()
    }
  }

  const visibleItems = items.filter(Boolean)
  if (visibleItems.length === 0) return null

  const toggle = (event) => {
    event.stopPropagation()
    event.preventDefault()
    setPosition(null)
    setOpen((value) => !value)
  }

  return (
    <>
      {trigger ? (
        trigger({ ref: triggerRef, onClick: toggle, 'aria-expanded': open, 'aria-haspopup': 'menu' })
      ) : (
        <button
          type="button"
          ref={triggerRef}
          className="icon-btn menu-trigger"
          onClick={toggle}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="menu"
          data-active={open ? 'true' : undefined}
        >
          <MoreGlyph />
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu"
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            data-ready={position ? 'true' : undefined}
            data-flipped={position?.flipped ? 'true' : undefined}
            style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
          >
            {visibleItems.map((item, index) =>
              item.separator ? (
                <hr className="menu__sep" key={`sep-${index}`} />
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  key={item.label}
                  className="menu__item"
                  data-danger={item.danger ? 'true' : undefined}
                  disabled={item.disabled}
                  onClick={(event) => {
                    event.stopPropagation()
                    close()
                    item.onSelect?.()
                  }}
                >
                  {item.icon && <Icon name={item.icon} size={17} />}
                  <span className="truncate">{item.label}</span>
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="5" r="1.85" fill="currentColor" />
      <circle cx="12" cy="12" r="1.85" fill="currentColor" />
      <circle cx="12" cy="19" r="1.85" fill="currentColor" />
    </svg>
  )
}
