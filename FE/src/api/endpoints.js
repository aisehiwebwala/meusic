/**
 * Every endpoint the backend (BE/) exposes, wrapped so the UI only ever sees
 * normalised entities.
 *
 *  GET /api/search/song?q&p&n          -> { total, start, results: Song[] }
 *  GET /api/search/album?q&p&n         -> { total, start, results: Album[] }
 *  GET /api/search/artist?q&p&n        -> { total, start, results: Artist[] }
 *  GET /api/detail/album?token         -> { ...Album, list: Song[] }
 *  GET /api/detail/artist?token&n&p    -> { songs: Song[], albums: RawAlbum[] }
 *  GET /api/meta/trending/songs?language   -> { songs: Song[] }
 *  GET /api/meta/trending/albums?language  -> { songs: Album[] }   // albums, despite the key
 *
 * `/api/detail/song` and `/api/meta/same-artist/songs` are deliberately not
 * wrapped: songs have no detail page, so nothing in the UI resolves a song by
 * token or asks for related tracks.
 *
 * `q`, `p` and `n` are all mandatory on the search routes — omitting any of
 * them is a 404 — so they are always sent.
 */

import { request } from './client'
import { normalizeAlbum, normalizeArtist, normalizeSong } from './normalize'

export const SEARCH_TYPES = ['song', 'album', 'artist']
export const PAGE_SIZE = 20

const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE || 'hindi'

const NORMALIZERS = {
  song: normalizeSong,
  album: normalizeAlbum,
  artist: normalizeArtist,
}

function mapList(list, normalizer) {
  return Array.isArray(list) ? list.map(normalizer).filter(Boolean) : []
}

/**
 * @param {'song'|'album'|'artist'} type
 * @param {{ query: string, page?: number, limit?: number, signal?: AbortSignal }} options
 */
export async function search(type, { query, page = 1, limit = PAGE_SIZE, signal } = {}) {
  const normalizer = NORMALIZERS[type]
  if (!normalizer) throw new Error(`Unsupported search type: ${type}`)

  const data = await request(`/search/${type}`, {
    params: { q: query, p: page, n: limit },
    signal,
  })

  const raw = Array.isArray(data?.results) ? data.results : []
  const total = Number(data?.total) || 0
  return {
    results: mapList(raw, normalizer),
    total,
    page,
    // Measured on the raw page, not the normalised one: a single unusable row
    // shouldn't read as "the last page" and hide the rest of the results.
    hasMore: raw.length === limit && page * limit < total,
  }
}

export async function getAlbum(token, { signal } = {}) {
  const data = await request('/detail/album', { params: { token }, signal })
  return normalizeAlbum(data)
}

/**
 * The artist route returns top songs and top albums but no artist profile, so
 * callers fall back to `deriveArtistProfile` for the name and image.
 */
export async function getArtist(token, { limit = 20, page = 1, signal } = {}) {
  const data = await request('/detail/artist', {
    params: { token, n: limit, p: page },
    signal,
  })
  return {
    songs: mapList(data?.songs, normalizeSong),
    albums: mapList(data?.albums, normalizeAlbum),
  }
}

/**
 * Recovers an artist's name and artwork from the artist objects embedded in
 * their own top songs, matching on the token in each `perma_url`.
 *
 * Name and image are collected independently because plenty of those embedded
 * entries carry a name but an empty `image` — stopping at the first match would
 * report no artwork for an artist whose very next song has it.
 */
export function deriveArtistProfile(token, songs) {
  let name = ''
  let image = ''
  for (const song of songs || []) {
    const match = song.artists?.find((artist) => artist.token === token)
    if (!match) continue
    if (!name) name = match.name
    if (!image) image = match.image
    if (name && image) break
  }
  return { name, image }
}

export async function getTrendingSongs({ language = DEFAULT_LANGUAGE, signal } = {}) {
  const data = await request('/meta/trending/songs', { params: { language }, signal })
  return mapList(data?.songs, normalizeSong)
}

export async function getTrendingAlbums({ language = DEFAULT_LANGUAGE, signal } = {}) {
  const data = await request('/meta/trending/albums', { params: { language }, signal })
  // The route keys its album array as `songs`; keep the quirk contained here.
  return mapList(data?.songs, normalizeAlbum)
}

export const LANGUAGES = [
  'hindi',
  'english',
  'punjabi',
  'tamil',
  'telugu',
  'marathi',
  'bengali',
  'kannada',
  'malayalam',
  'gujarati',
  'haryanvi',
  'rajasthani',
  'urdu',
]

export const DEFAULT_LANG = DEFAULT_LANGUAGE
