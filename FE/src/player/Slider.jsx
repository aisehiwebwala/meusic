import { useCallback, useEffect, useRef, useState } from 'react'

import './Slider.css'

/**
 * Pointer-driven range control used for both seeking and volume.
 *
 * Native `<input type="range">` can't be styled into a thin, expanding track
 * with a hover-only handle, so this is a custom widget — but it keeps the full
 * `role="slider"` keyboard contract (arrows, Home/End, PageUp/PageDown).
 *
 * The value is only committed on release; `onPreview` reports the in-flight
 * position so the caller can show a scrub time without fighting `timeupdate`.
 *
 * @param {{
 *   value: number,
 *   max: number,
 *   onCommit: (value: number) => void,
 *   onPreview?: (value: number | null) => void,
 *   onDragStateChange?: (dragging: boolean) => void,
 *   step?: number,
 *   label: string,
 *   disabled?: boolean,
 *   formatValue?: (value: number) => string,
 *   className?: string,
 * }} props
 */
export function Slider({
  value,
  max,
  onCommit,
  onPreview,
  onDragStateChange,
  step,
  label,
  disabled = false,
  formatValue,
  className = '',
}) {
  const trackRef = useRef(null)
  const [dragValue, setDragValue] = useState(null)
  const dragging = dragValue !== null

  const safeMax = max > 0 ? max : 0
  const displayed = dragging ? dragValue : Math.min(value, safeMax)
  const percent = safeMax > 0 ? Math.min(100, Math.max(0, (displayed / safeMax) * 100)) : 0
  const resolvedStep = step ?? (safeMax > 0 ? safeMax / 100 : 1)

  const valueFromEvent = useCallback(
    (clientX) => {
      const track = trackRef.current
      if (!track || safeMax <= 0) return 0
      const rect = track.getBoundingClientRect()
      const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width
      return Math.min(safeMax, Math.max(0, ratio * safeMax))
    },
    [safeMax],
  )

  // Pointer capture keeps the drag alive when the cursor leaves the track.
  useEffect(() => {
    if (!dragging) return undefined

    const onMove = (event) => {
      const next = valueFromEvent(event.clientX)
      setDragValue(next)
      onPreview?.(next)
    }
    const onUp = (event) => {
      const next = valueFromEvent(event.clientX)
      setDragValue(null)
      onPreview?.(null)
      onDragStateChange?.(false)
      onCommit(next)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, valueFromEvent, onCommit, onPreview, onDragStateChange])

  const onPointerDown = (event) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    const next = valueFromEvent(event.clientX)
    setDragValue(next)
    onPreview?.(next)
    onDragStateChange?.(true)
  }

  const onKeyDown = (event) => {
    if (disabled || safeMax <= 0) return
    const jump = {
      ArrowLeft: -resolvedStep,
      ArrowDown: -resolvedStep,
      ArrowRight: resolvedStep,
      ArrowUp: resolvedStep,
      PageDown: -resolvedStep * 10,
      PageUp: resolvedStep * 10,
    }[event.key]

    if (jump !== undefined) {
      event.preventDefault()
      onCommit(Math.min(safeMax, Math.max(0, displayed + jump)))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      onCommit(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      onCommit(safeMax)
    }
  }

  return (
    <div
      ref={trackRef}
      className={`slider ${className}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.round(displayed * 100) / 100}
      aria-valuetext={formatValue ? formatValue(displayed) : undefined}
      aria-disabled={disabled || undefined}
      data-dragging={dragging ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <div className="slider__rail">
        <div className="slider__fill" style={{ width: `${percent}%` }} />
        <div className="slider__thumb" style={{ left: `${percent}%` }} />
      </div>
    </div>
  )
}
