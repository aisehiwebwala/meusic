import { QUALITIES } from '../api/normalize'
import { Menu } from '../ui/Menu'
import { handleRadioGroupKeys } from '../ui/radioGroupKeys'
import { usePlayer } from './PlayerContext'
import './QualitySelector.css'

const DESCRIPTIONS = {
  96: 'Data saver',
  160: 'Balanced',
  320: 'High fidelity',
}

/**
 * Bitrate picker for the streams in `downloadURLs`. Switching mid-playback is
 * seamless — `PlayerContext` restores the playhead on the new source.
 *
 * The chip reports `activeQuality`, the bitrate actually being streamed. It only
 * differs from the selection when the track is missing that bitrate, and in that
 * case the option is disabled here too, so the two never contradict each other.
 *
 * @param {{ variant?: 'compact'|'inline' }} props
 */
export function QualitySelector({ variant = 'compact' }) {
  const { quality, activeQuality, changeQuality, currentTrack } = usePlayer()
  const available = currentTrack?.downloadUrls
  const isMissing = (option) => Boolean(available) && !available[option]

  if (variant === 'inline') {
    return (
      <div
        className="quality-inline"
        role="radiogroup"
        aria-label="Audio quality"
        onKeyDown={(event) => handleRadioGroupKeys(event, QUALITIES, changeQuality, isMissing)}
      >
        {QUALITIES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={activeQuality === option}
            /* Roving tabindex: the group is one tab stop, arrows move inside it. */
            tabIndex={activeQuality === option ? 0 : -1}
            className="quality-inline__option"
            data-active={activeQuality === option ? 'true' : undefined}
            disabled={isMissing(option)}
            title={isMissing(option) ? `${option} kbps not available for this track` : DESCRIPTIONS[option]}
            onClick={() => changeQuality(option)}
          >
            <span className="quality-inline__rate">{option}</span>
            <span className="quality-inline__unit">kbps</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Menu
      align="end"
      label="Audio quality"
      items={QUALITIES.map((option) => ({
        label: `${option} kbps · ${DESCRIPTIONS[option]}${activeQuality === option ? '  ✓' : ''}`,
        icon: option === activeQuality ? 'sparkle' : 'wifi',
        disabled: isMissing(option),
        onSelect: () => changeQuality(option),
      }))}
      trigger={({ ref, ...props }) => (
        <button
          type="button"
          ref={ref}
          {...props}
          className="quality-chip"
          title={
            activeQuality === quality
              ? `Audio quality: ${quality} kbps (${DESCRIPTIONS[quality]})`
              : `Streaming at ${activeQuality} kbps — this track has no ${quality} kbps version`
          }
        >
          <span className="quality-chip__rate">{activeQuality}</span>
          <span className="quality-chip__unit">kbps</span>
        </button>
      )}
    />
  )
}
