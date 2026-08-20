import { useCallback, useEffect, useRef, useState } from 'react'

import { formatDuration } from '../api/normalize'
import { useTrackMenu } from '../components/useTrackMenu'
import { Artwork } from '../ui/Artwork'
import { Icon } from '../ui/Icon'
import { Menu } from '../ui/Menu'
import { usePlayer } from './PlayerContext'
import './QueueList.css'

/** Distance from a scroll edge at which a drag starts auto-scrolling. */
const EDGE = 56
const EDGE_SPEED = 12

/** Nearest scrollable ancestor — the drawer body in the panel, `<main>` on the page. */
function scrollParentOf(element) {
  let node = element?.parentElement
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

/**
 * The reorderable queue list, shared by the drawer and the `/queue` page.
 *
 * Reordering is built on raw pointer events rather than HTML5 drag-and-drop so
 * that it behaves identically under touch and can be animated. While a row is
 * held it is lifted out of flow (`position: fixed`) and replaced by a spacer of
 * equal height; the remaining rows translate to open the drop slot. The move is
 * only committed to the reducer on release.
 *
 * Drop targets are derived from the *layout* slots (uniform row height) rather
 * than from live element rects — measuring transformed rows would feed the
 * drag's own animation back into its target calculation and oscillate.
 *
 * @param {{ listRef?: React.RefObject<HTMLUListElement>, className?: string }} props
 */
export function QueueList({ listRef, className = '' }) {
  const { entries, currentIndex, isPlaying, jumpTo, removeAt, moveItem } = usePlayer()

  const ownListRef = useRef(null)
  const listNodeRef = listRef || ownListRef
  const scrollRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)
  dragRef.current = drag
  // The drag effect only needs to know *whether* a drag is live — it reads the
  // moving parts off `dragRef`. Depending on the object itself would tear down
  // and re-register the listeners on every pointer move.
  const dragging = drag !== null

  const beginDrag = useCallback(
    (index, event, rowElement) => {
      const rect = rowElement.getBoundingClientRect()
      scrollRef.current = scrollParentOf(listNodeRef.current)
      setDrag({
        index,
        targetIndex: index,
        height: rect.height,
        width: rect.width,
        left: rect.left,
        offsetY: event.clientY - rect.top,
        pointerY: event.clientY,
      })
    },
    [listNodeRef],
  )

  useEffect(() => {
    if (!dragging) return undefined

    /** Recomputes the drop slot from the list's static geometry. */
    const resolveTarget = (pointerY) => {
      const list = listNodeRef.current
      const state = dragRef.current
      if (!list || !state || state.height === 0) return state?.targetIndex ?? 0
      const listTop = list.getBoundingClientRect().top
      const centre = pointerY - state.offsetY + state.height / 2
      const slot = Math.floor((centre - listTop) / state.height)
      return Math.max(0, Math.min(slot, entries.length - 1))
    }

    const onMove = (event) => {
      event.preventDefault()
      const pointerY = event.clientY
      setDrag((prev) => (prev ? { ...prev, pointerY, targetIndex: resolveTarget(pointerY) } : prev))
    }

    const onUp = () => {
      const state = dragRef.current
      setDrag(null)
      if (state && state.targetIndex !== state.index) moveItem(state.index, state.targetIndex)
    }

    // Auto-scroll while the pointer rests near either edge of the scroller.
    let frame = 0
    const tick = () => {
      const scroller = scrollRef.current
      const state = dragRef.current
      if (scroller && state) {
        const rect = scroller.getBoundingClientRect()
        const fromTop = state.pointerY - rect.top
        const fromBottom = rect.bottom - state.pointerY
        let delta = 0
        if (fromTop < EDGE) delta = -EDGE_SPEED * (1 - Math.max(0, fromTop) / EDGE)
        else if (fromBottom < EDGE) delta = EDGE_SPEED * (1 - Math.max(0, fromBottom) / EDGE)
        if (delta !== 0) {
          scroller.scrollTop += delta
          setDrag((prev) => (prev ? { ...prev, targetIndex: resolveTarget(prev.pointerY) } : prev))
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, moveItem, entries.length, listNodeRef])

  /** Offset applied to a settled row to open the drop slot. */
  const shiftFor = (index) => {
    if (!drag || index === drag.index) return 0
    const { index: from, targetIndex: to, height } = drag
    if (from < to && index > from && index <= to) return -height
    if (from > to && index >= to && index < from) return height
    return 0
  }

  return (
    <ul
      className={`queue__list ${className}`.trim()}
      ref={listNodeRef}
      data-dragging={drag ? 'true' : undefined}
    >
      {entries.map((entry, index) => (
        <QueueRow
          key={entry.uid}
          entry={entry}
          index={index}
          total={entries.length}
          isCurrent={index === currentIndex}
          isPlaying={index === currentIndex && isPlaying}
          isDragged={drag?.index === index}
          shift={shiftFor(index)}
          drag={drag?.index === index ? drag : null}
          onJump={() => jumpTo(index)}
          onRemove={() => removeAt(index)}
          onDragStart={beginDrag}
          onMove={moveItem}
        />
      ))}
    </ul>
  )
}

function QueueRow({
  entry,
  index,
  total,
  isCurrent,
  isPlaying,
  isDragged,
  shift,
  drag,
  onJump,
  onRemove,
  onDragStart,
  onMove,
}) {
  const rowRef = useRef(null)
  const menuItems = useTrackMenu(entry, {
    extra: [
      index > 0 && { label: 'Move up', icon: 'previous', onSelect: () => onMove(index, index - 1) },
      index < total - 1 && { label: 'Move down', icon: 'next', onSelect: () => onMove(index, index + 1) },
      { label: 'Remove from queue', icon: 'close', danger: true, onSelect: onRemove },
    ].filter(Boolean),
  })

  const style = isDragged
    ? { top: drag.pointerY - drag.offsetY, left: drag.left, width: drag.width }
    : { transform: shift ? `translateY(${shift}px)` : undefined }

  return (
    <>
      {/* Placeholder keeps the list height — and therefore the slot geometry —
          constant while the dragged row is out of flow. */}
      {isDragged && <li className="queue-row__spacer" style={{ height: drag.height }} aria-hidden="true" />}

      <li
        ref={rowRef}
        className="queue-row"
        data-current={isCurrent ? 'true' : undefined}
        data-dragged={isDragged ? 'true' : undefined}
        style={style}
      >
        <button
          type="button"
          className="queue-row__grip"
          aria-label={`Reorder ${entry.title}. Use the options menu to move it up or down.`}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            if (rowRef.current) onDragStart(index, event, rowRef.current)
          }}
        >
          <Icon name="grip" size={16} />
        </button>

        <button type="button" className="queue-row__main" onClick={onJump} aria-label={`Play ${entry.title}`}>
          <span className="queue-row__art">
            <Artwork src={entry.image} alt="" size={150} kind="song" />
            {isCurrent && (
              <span className="queue-row__now">
                <span className="playing-bars" data-paused={isPlaying ? undefined : 'true'}>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            )}
          </span>
          <span className="queue-row__text">
            <span className="queue-row__title truncate">{entry.title}</span>
            <span className="queue-row__sub truncate">{entry.artistLine}</span>
          </span>
        </button>

        <span className="queue-row__time">{formatDuration(entry.duration)}</span>

        <div className="queue-row__actions">
          <button
            type="button"
            className="icon-btn queue-row__remove"
            onClick={onRemove}
            aria-label={`Remove ${entry.title} from queue`}
          >
            <Icon name="close" size={15} />
          </button>
          <Menu items={menuItems} label={`Options for ${entry.title}`} />
        </div>
      </li>
    </>
  )
}
