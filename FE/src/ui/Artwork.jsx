import { useEffect, useRef, useState } from 'react'

import { upscaleImage } from '../api/normalize'
import { Icon } from './Icon'
import './Artwork.css'

/**
 * Artwork with three graceful degradations:
 *  - requests an upscaled variant, falling back to the original thumbnail if
 *    the larger size 404s on the CDN;
 *  - fades in on decode so grids don't flash;
 *  - renders a typed placeholder glyph when there is no usable image.
 *
 * @param {{ src?: string, alt?: string, size?: number, kind?: 'song'|'album'|'artist', rounded?: boolean, className?: string, eager?: boolean }} props
 */
export function Artwork({ src, alt = '', size = 500, kind = 'song', rounded = false, className = '', eager = false }) {
  const wanted = upscaleImage(src, size)
  const [state, setState] = useState(() => ({ wanted, url: wanted, status: src ? 'loading' : 'error' }))
  const imgRef = useRef(null)

  // Start over on a new image — keyed on the *resolved* URL, not on `src`. Two
  // different sources routinely upscale to the same file (an artist's 50x50 and
  // 150x150 thumbnails both become 500x500), and returning to `loading` without
  // changing the element's `src` would leave us waiting for a `load` event the
  // browser has no reason to fire again, hiding the image behind its fade-in.
  if (state.wanted !== wanted) {
    setState({ wanted, url: wanted, status: src ? 'loading' : 'error' })
  }

  const { url, status } = state

  const settle = (loaded) => {
    setState((prev) => {
      if (loaded) return prev.status === 'ready' ? prev : { ...prev, status: 'ready' }
      // The upscaled variant may not exist; retry the original thumbnail once.
      if (src && prev.url !== src) return { ...prev, url: src }
      return prev.status === 'error' ? prev : { ...prev, status: 'error' }
    })
  }

  // `load` and `error` don't always reach us: a cached image can settle before
  // React attaches the handlers, and an element reused for a URL it has already
  // decoded fires neither. Ask the element itself after every commit, so no
  // image can be left invisible waiting for an event that already happened.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete) settle(img.naturalWidth > 0)
  })

  const classes = ['artwork', rounded ? 'artwork--round' : '', className].filter(Boolean).join(' ')

  if (status === 'error') {
    return (
      <div
        className={classes}
        data-placeholder="true"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : 'true'}
      >
        <Icon name={kind} size={Math.max(18, Math.min(44, size / 6))} />
      </div>
    )
  }

  return (
    <div className={classes} data-loading={status === 'loading' ? 'true' : undefined}>
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable="false"
        onLoad={() => settle(true)}
        onError={() => settle(false)}
      />
    </div>
  )
}
