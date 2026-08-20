/**
 * Central route builders.
 *
 * Entity tokens can contain characters that are legal in a URL path but would
 * otherwise be ambiguous (`,` and `-` show up regularly, e.g. `yE1eQoLw,8Q_`),
 * so every token is encoded here and decoded once by `useParams`.
 */

const encode = (token) => encodeURIComponent(token || '')

export const albumPath = (token) => `/album/${encode(token)}`
export const artistPath = (token) => `/artist/${encode(token)}`

export const searchPath = (query, type = 'song') =>
  `/search?q=${encodeURIComponent(query || '')}&type=${encodeURIComponent(type)}`
