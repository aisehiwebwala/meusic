/**
 * Thin fetch wrapper around the `BE/` backend.
 *
 * The backend replies with JSON on success and a plain-text body on failure
 * (e.g. `404 Invalid query!`), so errors are normalised into a single
 * `ApiError` shape that the UI can render without special-casing.
 *
 * `VITE_API_BASE_URL` points at the backend. When it is unset we fall back to
 * the current origin, which is correct in production: `BE/app.js` serves this
 * app's `dist/` itself, so `/api/...` resolves to the same deployment. In dev
 * the app is on Vite's port instead, so a missing value is warned about loudly.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

if (!BASE_URL && import.meta.env.DEV) {
  console.warn(
    '[cadence] VITE_API_BASE_URL is not set, so requests will go to this origin ' +
      '(which has no /api in dev). Copy FE/.env.example to FE/.env and restart.',
  )
}

export class ApiError extends Error {
  constructor(message, { status = 0, aborted = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.aborted = aborted
  }
}

function buildUrl(path, params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return `${BASE_URL}/api${path}${query ? `?${query}` : ''}`
}

/**
 * @param {string} path   Path below `/api`, e.g. `/search/song`.
 * @param {object} [options]
 * @param {object} [options.params]  Query params; empty values are dropped.
 * @param {AbortSignal} [options.signal]
 */
export async function request(path, { params, signal } = {}) {
  let response
  try {
    response = await fetch(buildUrl(path, params), {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request cancelled', { aborted: true })
    }
    throw new ApiError('Cannot reach the server. Check your connection and try again.')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ApiError(messageForStatus(response.status, body), { status: response.status })
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('The server returned an unexpected response.', { status: response.status })
  }
}

function messageForStatus(status, body) {
  const detail = (body || '').trim()
  if (status === 404) return detail === 'Invalid query!' ? 'That request was missing something.' : 'Not found.'
  if (status === 429) return 'Too many requests right now. Give it a moment.'
  if (status >= 500) return 'The music service is having a moment. Try again shortly.'
  return detail.length > 0 && detail.length < 160 ? detail : `Request failed (${status}).`
}
