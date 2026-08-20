/**
 * Adapters between the backend payloads and the shapes the UI consumes.
 *
 * Two quirks in the upstream data drive most of this file:
 *  1. Text fields arrive HTML-escaped (`Gehra Hua (From &quot;Dhurandhar&quot;)`).
 *  2. Artwork URLs are 50x50 / 150x150 thumbnails that can be upscaled by
 *     rewriting the dimensions in the filename.
 *
 * `GET /api/detail/artist` is also the one endpoint that returns *raw* JioSaavn
 * albums (no `token`, artists nested under `more_info.artistMap`), so
 * `normalizeAlbum` accepts both the modelled and the raw shape.
 */

export const QUALITIES = ['96', '160', '320']
export const DEFAULT_QUALITY = '160'

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
}

/** A numeric entity outside Unicode range would throw; leave it as written. */
function codePoint(value, fallback) {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return fallback
  return String.fromCodePoint(value)
}

/** Decodes the HTML entities the upstream API leaves in titles and subtitles. */
export function decodeText(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code) => {
      const key = code.toLowerCase()
      if (ENTITIES[key]) return ENTITIES[key]
      if (key.startsWith('#x')) return codePoint(parseInt(key.slice(2), 16), match)
      if (key.startsWith('#')) return codePoint(parseInt(key.slice(1), 10), match)
      return match
    })
    .trim()
}

/**
 * Rewrites a thumbnail URL to a larger variant. Placeholder assets that carry
 * no dimensions in the filename are returned untouched.
 */
export function upscaleImage(url, size = 500) {
  if (typeof url !== 'string' || url === '') return ''
  return url.replace(/(\d{2,4})x(\d{2,4})(?=\.\w+$)/, `${size}x${size}`)
}

/** The API identifies entities by the trailing segment of their perma_url. */
export function tokenFromPermaUrl(permaUrl) {
  if (typeof permaUrl !== 'string') return ''
  return permaUrl.split('/').filter(Boolean).pop() || ''
}

function normalizeArtistList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  return list.reduce((acc, artist) => {
    const token = artist?.token || tokenFromPermaUrl(artist?.perma_url)
    const name = decodeText(artist?.name)
    if (!name || seen.has(name)) return acc
    seen.add(name)
    acc.push({
      id: artist?.id || token,
      name,
      token,
      role: artist?.role || '',
      image: artist?.image || '',
      permaUrl: artist?.perma_url || '',
    })
    return acc
  }, [])
}

/** `downloadURLs` is `""` when the backend fails to mint an auth token. */
function normalizeDownloadUrls(downloadURLs) {
  if (!downloadURLs || typeof downloadURLs !== 'object') return null
  const urls = {}
  for (const quality of QUALITIES) {
    const url = downloadURLs[quality]
    if (typeof url === 'string' && url.startsWith('http')) urls[quality] = url
  }
  return Object.keys(urls).length > 0 ? urls : null
}

export function normalizeSong(raw) {
  if (!raw) return null
  const token = raw.token || tokenFromPermaUrl(raw.perma_url)
  const artists = normalizeArtistList(raw.artists || raw.more_info?.artistMap?.primary_artists)
  const duration = Number(raw.duration ?? raw.more_info?.duration) || 0

  return {
    kind: 'song',
    id: raw.id || token,
    token,
    title: decodeText(raw.title),
    subtitle: decodeText(raw.subtitle),
    album: decodeText(raw.album ?? raw.more_info?.album),
    albumToken: raw.albumToken || tokenFromPermaUrl(raw.more_info?.album_url),
    duration,
    image: raw.image || '',
    language: raw.language || '',
    year: raw.year || '',
    music: decodeText(raw.music),
    permaUrl: raw.perma_url || '',
    artists,
    /** Display line: falls back to the API subtitle when no artists are listed. */
    artistLine: artists.length > 0 ? artists.map((a) => a.name).join(', ') : decodeText(raw.subtitle),
    downloadUrls: normalizeDownloadUrls(raw.downloadURLs),
  }
}

export function normalizeAlbum(raw) {
  if (!raw) return null
  const token = raw.token || tokenFromPermaUrl(raw.perma_url)
  const artists = normalizeArtistList(raw.artists || raw.more_info?.artistMap?.primary_artists)
  const songCount = Number(raw.more_info?.song_count) || (Array.isArray(raw.list) ? raw.list.length : 0)

  return {
    kind: 'album',
    id: raw.id || token,
    token,
    title: decodeText(raw.title),
    subtitle: decodeText(raw.subtitle) || decodeText(raw.more_info?.music),
    image: raw.image || '',
    language: raw.language || '',
    year: raw.year || '',
    permaUrl: raw.perma_url || '',
    artists,
    songCount,
    songs: Array.isArray(raw.list) ? raw.list.map(normalizeSong).filter(Boolean) : [],
  }
}

export function normalizeArtist(raw) {
  if (!raw) return null
  const token = raw.token || tokenFromPermaUrl(raw.perma_url)
  return {
    kind: 'artist',
    id: raw.id || token,
    token,
    name: decodeText(raw.name || raw.title),
    image: raw.image || '',
    permaUrl: raw.perma_url || '',
  }
}

/**
 * Bad tokens make the backend echo an empty model with a `200`, so "found"
 * has to be decided from the payload rather than the status code.
 */
export function isEmptyEntity(entity) {
  return !entity || (!entity.id && !entity.token) || (!entity.title && !entity.name)
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

/** Long-form duration for detail headers, e.g. `1 hr 12 min` / `4 min 20 sec`. */
export function formatDurationLong(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours} hr ${minutes} min`
  if (minutes > 0) return `${minutes} min ${total % 60} sec`
  return `${total} sec`
}
