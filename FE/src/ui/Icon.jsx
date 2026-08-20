/**
 * Single-file icon set. Every glyph is drawn on a 24x24 grid and inherits
 * `currentColor`, so icons never need their own colour rules.
 */

const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 4.2 12.6L20 21.4 21.4 20l-4.8-4.8A7 7 0 0 0 11 4m0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10',
  play: 'M8 5.14v13.72a1 1 0 0 0 1.54.84l10.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  next: 'M6 5.2v13.6a1 1 0 0 0 1.55.83L16 14v4.5h2.5v-13H16V10L7.55 4.37A1 1 0 0 0 6 5.2',
  previous: 'M18 5.2v13.6a1 1 0 0 1-1.55.83L8 14v4.5H5.5v-13H8V10l8.45-5.63A1 1 0 0 1 18 5.2',
  shuffle: 'M17 3.5 21.5 8 17 12.5V9.5h-1.6a3 3 0 0 0-2.4 1.2L12 12l-1-1.3 1-1.4A5 5 0 0 1 15.4 7.5H17zM2.5 7.5h2.1A5 5 0 0 1 8.6 9.6l4.4 5.9a3 3 0 0 0 2.4 1.2H17V13.5L21.5 18 17 22.5v-3h-1.6a5 5 0 0 1-4-2.1L7 11.5a3 3 0 0 0-2.4-1.2H2.5zM2.5 16.5h2.1a5 5 0 0 0 2.9-1L8.6 14l1.2 1.6-1 1.2a5 5 0 0 1-4.2 1.7H2.5z',
  repeat: 'M7 4h10a4 4 0 0 1 4 4v3h-2V8a2 2 0 0 0-2-2H7v2.5L2.5 5 7 1.5zM17 20H7a4 4 0 0 1-4-4v-3h2v3a2 2 0 0 0 2 2h10v-2.5L21.5 19 17 22.5z',
  volume: 'M4 9h3.2L12 4.6v14.8L7.2 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1',
  'volume-wave-1': 'M15.2 9.1a3.6 3.6 0 0 1 0 5.8',
  'volume-wave-2': 'M17.8 6.4a7.4 7.4 0 0 1 0 11.2',
  'mute-cross': 'M14.6 15 20 9.6',
  queue: 'M3 5h13v2H3zm0 5h13v2H3zm0 5h9v2H3zm12.5 0v6l5-3z',
  plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
  trash: 'M9 3h6l1 2h4v2H4V5h4zM5.5 8h13l-1 12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z',
  chevron: 'M8.6 4.6 16 12l-7.4 7.4L7.2 18l6-6-6-6z',
  'chevron-down': 'M4.6 8.6 12 16l7.4-7.4L18 7.2l-6 6-6-6z',
  album: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m0 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5',
  artist: 'M12 3a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 3m0 10.4c4.4 0 8 2.3 8 5.1V21H4v-2.5c0-2.8 3.6-5.1 8-5.1',
  song: 'M9 18.2V7l10-2v3.2L11.5 9.8v7a3.2 3.2 0 1 1-2.5-3.1V18.2z',
  grip: 'M9 5h2v2H9zm4 0h2v2h-2zM9 11h2v2H9zm4 0h2v2h-2zM9 17h2v2H9zm4 0h2v2h-2z',
  alert: 'M12 2 23 21H1zm-1 6v6h2V8zm0 8v2h2v-2z',
  expand: 'M4 4h7v2H6v5H4zm9 0h7v7h-2V6h-5zM4 13h2v5h5v2H4zm14 0h2v7h-7v-2h5z',
  wifi: 'M12 17.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5M12 12a6 6 0 0 1 4.3 1.8l-1.5 1.5a3.9 3.9 0 0 0-5.6 0l-1.5-1.5A6 6 0 0 1 12 12m0-5a11 11 0 0 1 7.8 3.2l-1.5 1.5a8.9 8.9 0 0 0-12.6 0L4.2 10.2A11 11 0 0 1 12 7',
  sparkle: 'M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z',
}

/** Icons drawn with strokes rather than fills. */
const STROKED = new Set(['volume-wave-1', 'volume-wave-2', 'mute-cross'])

export function Icon({ name, size = 20, className, style }) {
  const path = PATHS[name]
  if (!path) return null
  const stroked = STROKED.has(name)

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={path}
        fill={stroked ? 'none' : 'currentColor'}
        stroke={stroked ? 'currentColor' : 'none'}
        strokeWidth={stroked ? 1.9 : 0}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Volume glyph whose wave count tracks the level. */
export function VolumeIcon({ level, muted, size = 20 }) {
  if (muted || level === 0) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d={PATHS.volume} fill="currentColor" />
        <path d={PATHS['mute-cross']} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M14.6 9 20 14.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={PATHS.volume} fill="currentColor" />
      <path d={PATHS['volume-wave-1']} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      {level > 0.55 && (
        <path d={PATHS['volume-wave-2']} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      )}
    </svg>
  )
}
