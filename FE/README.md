# Cadence — frontend

**Find your rhythm.**

A dark-mode music web app: search the catalogue, browse albums and artists, and
listen through a persistent bottom player with selectable stream quality
(96 / 160 / 320 kbps) and a fully interactive, drag-to-reorder play queue.

Built with React 19 + Vite 6 and React Router 7. Plain CSS — no UI framework.

---

## Quick start

```bash
npm install
cp .env.example .env      # required for dev — the repo's .gitignore excludes *.env
npm run dev               # http://localhost:5173
```

```bash
npm run build             # production bundle into dist/
npm run preview           # serve the built bundle
npm run lint              # eslint, zero warnings expected
```

`BE/app.js` serves `../FE/dist` statically with an SPA fallback, so
`npm run build` from this folder is all the deploy step needs — deep links like
`/album/:token` resolve correctly.

## Environment

| Variable                | Required | Default            | Purpose                                            |
| ----------------------- | -------- | ------------------ | -------------------------------------------------- |
| `VITE_API_BASE_URL`     | in dev   | the current origin | Base URL of the backend. **No trailing slash.**    |
| `VITE_DEFAULT_LANGUAGE` | no       | `hindi`            | Language sent to the trending (`/meta`) endpoints.  |

The base URL is never hardcoded — it is read from the environment in
`src/api/client.js`. With nothing set, requests fall back to the current origin,
which is exactly right in production because `BE/app.js` serves this app's
`dist/`, so `/api/...` hits the same deployment. In dev the app runs on Vite's
own port, so `.env` is needed there and a missing value logs a console warning.
Point it at `http://localhost:3000` to develop against a local `BE/`.

Note that the repository's root `.gitignore` excludes `*.env`, so `FE/.env` is
never committed — `.env.example` is the checked-in reference.

---

## The API this app talks to

Everything below was read out of `BE/src/models` and `BE/src/routes` and
verified against the live deployment. `src/api/endpoints.js` is the single place
that knows these shapes; the rest of the app only sees normalised entities.

| Endpoint                                            | Response                              |
| --------------------------------------------------- | ------------------------------------- |
| `GET /api/search/song?q&p&n`                        | `{ total, start, results: Song[] }`   |
| `GET /api/search/album?q&p&n`                       | `{ total, start, results: Album[] }`  |
| `GET /api/search/artist?q&p&n`                      | `{ total, start, results: Artist[] }` |
| `GET /api/detail/song?token`                        | `{ results: Song[] }`                 |
| `GET /api/detail/album?token`                       | `{ ...Album, list: Song[] }`          |
| `GET /api/detail/artist?token&n&p`                  | `{ songs: Song[], albums: RawAlbum[] }` |
| `GET /api/meta/trending/songs?language`             | `{ songs: Song[] }`                   |
| `GET /api/meta/trending/albums?language`            | `{ songs: Album[] }`                  |
| `GET /api/meta/same-artist/songs?artist_ids&song_id` | `{ songs: Song[] }`                   |

`/api/detail/song` and `/api/meta/same-artist/songs` are listed for completeness
but deliberately unwrapped: songs have no detail page, so nothing in the UI ever
resolves a song by token or asks for related tracks.

`Song` (from `BE/src/models/search-model.js`):

```js
{
  id, title, subtitle, perma_url, token, albumToken,
  duration,        // string, seconds
  image,           // CDN URL sized 150x150
  language, year, type, album, music,
  downloadURLs,    // { "96": url, "160": url, "320": url }  — or "" on failure
  artists: [{ id, name, image, type, perma_url, token }]
}
```

### Quirks the frontend has to absorb

Each of these is handled in one place and commented there:

- **`downloadURLs` can be an empty string.** `BE/src/utils/download-url.js`
  returns `""` when the auth-URL fetch fails. `normalizeDownloadUrls` turns that
  into `null`, `isPlayable()` keeps such tracks out of the queue, and the UI
  marks the row as unavailable rather than silently doing nothing.
- **`/meta/trending/albums` keys its albums as `songs`.** Contained in
  `getTrendingAlbums`.
- **`/detail/artist` returns no artist profile**, and its `albums` are raw
  upstream objects (no `token`, artists nested under
  `more_info.artistMap.primary_artists`). `normalizeAlbum` accepts both the
  modelled and raw shapes; the artist's name and image come from the card that
  linked to the page (router state), falling back to `deriveArtistProfile`,
  which matches the URL token against the artist objects embedded in that
  artist's own top songs.
- **Search requires all of `q`, `p` and `n`** — omitting any one is a 404. They
  are always sent.
- **A bad token returns `200` with empty fields** rather than a 404, so
  `isEmptyEntity` decides when to show "not found".
- **Errors arrive as plain text**, not JSON. `messageForStatus` maps them to
  readable copy.
- **Durations are strings** and titles contain HTML entities; both are coerced
  in `normalize.js`, which also upscales `150x150` artwork URLs to `500x500`
  (with a fallback to the original if the larger size 404s).

---

## Architecture

```
src/
  api/          client.js (fetch + errors) · normalize.js (entities) · endpoints.js
  hooks/        useAsync · usePersistentState · useMediaQuery · useClickOutside
                useFocusTrap
  player/       playerReducer · PlayerContext · PlayerBar · QueueList · QueuePanel
                NowPlayingSheet · Slider · QualitySelector · usePlayerHotkeys
  layout/       AppLayout (grid shell) · Sidebar · TopBar · MobileNav · Logo
  components/   SongRow/SongList · MediaCard · SearchBar · Section · useTrackMenu
                LanguagePicker
  ui/           Icon · Artwork · States (skeleton/empty/error) · Menu
                ToastContext · UIContext · radioGroupKeys
  pages/        Home · SearchResults · AlbumDetail · ArtistDetail
                QueuePage · NotFound
```

### State

Four contexts, nested in `App.jsx` in this order — `ToastProvider` is outermost
because the player reports stream failures through it, and `PlayerProvider` sits
**above** `BrowserRouter` so playback and the queue survive every navigation:

- `ToastProvider` — transient messages.
- `LanguageProvider` — trending language, persisted.
- `PlayerProvider` — the queue (`useReducer`) plus the `<audio>` element,
  quality, volume, shuffle and repeat. Persists the queue and preferences to
  `localStorage` under the `cadence:` prefix (`STORAGE_PREFIX`) and restores them
  paused on boot.
  Also wires the MediaSession API for OS media keys.
- `UIProvider` — queue-drawer and now-playing-sheet visibility, i.e. the two
  surfaces that open over the page. Navigation isn't in here: the mobile tab bar
  is always visible, so there is nothing to open.

The trending language has one control, `LanguagePicker`, rendered in the sidebar
on desktop and on the home page below 821px — where the sidebar is `display:
none`, and a picker only in the rail would be unreachable.

### Player details

- **Seamless quality switching.** Changing bitrate mid-track swaps the `src` and
  restores the exact playback position from `onLoadedMetadata`, so the switch is
  inaudible apart from a brief rebuffer. The active bitrate is always visible in
  the player bar and in the now-playing sheet.
- **Source-swap event suppression.** Replacing `src` makes the element fire
  `pause` and sometimes `error`; a `swappingRef` guard stops those from flipping
  the UI to "paused" and breaking auto-advance.
- **Condensed transport on handsets.** Below 820px the bar keeps only artwork,
  title, prev/play/next and the quality chip; the timeline becomes a full-width
  interactive seek strip stacked directly above it, and the whole left block is
  one tap target for the now-playing sheet, which holds the links, volume,
  shuffle, repeat and track menu the row has no space for.
- **Automatic bitrate step-down.** All three URLs are derived by string
  substitution upstream, so any one of them may 404. A stream error retries at
  the next lower quality and toasts once.
- **Previous never wraps.** With nothing behind the current track — no visited
  step and no lower index — Previous restarts it from zero instead of jumping to
  the end of the queue. Past the opening 3 seconds it restarts either way, and
  the button relabels itself "Restart track" when that's all it can do.
- **Shuffle draws without replacement.** `NEXT` keeps a bag of uids already
  played this cycle (`shuffleDone`) and picks from what's left, so every track
  plays once before any repeats and the queue has a real end: with repeat off,
  playback stops when the bag empties. Sampling at random each time — the obvious
  implementation — replays songs, strands others, and never ends. A new cycle
  excludes the track that just played, which is the only repeat anyone notices.
  The bag is keyed by uid, so reordering and removing don't disturb it.
- **Clear is undoable, so nothing needs a confirmation dialog.** "Clear queue"
  and "Clear upcoming" both toast with an Undo (7s instead of the usual 2.6s).
  Undoing "clear upcoming" re-appends the removed tail, leaving the playing
  track's uid untouched, so the audio element never reloads and the music doesn't
  stutter. "Clear upcoming" removes only what is *after* the current track: the
  count the UI offers is exactly what disappears.
- **Queue reordering** uses raw pointer events rather than HTML5 drag-and-drop so
  touch behaves identically. The held row is lifted out of flow and replaced by a
  spacer; drop slots are computed from static layout geometry, because measuring
  the transformed rows would feed the drag's own animation back into its target.
  The same `QueueList` renders in the drawer and on `/queue`.

### Keyboard and headset control

`usePlayerHotkeys` (called once from `AppLayout`) binds a global `keydown`:

| Key                 | Action                  |
| ------------------- | ----------------------- |
| `Space` / `K`       | Play or pause           |
| `←` / `→`           | Seek 5s back / forward  |
| `J` / `L`           | Seek 10s back / forward |
| `Shift` + `←` / `→` | Previous / next track   |
| `M`                 | Mute                    |

Only the horizontal arrows are claimed — `↑`/`↓` stay with the scroller, since
`<main>` is the only thing that scrolls. Nothing fires while focus is inside an
input, select, menu, slider or radio group (each implements the arrow contract
its role promises), and `Space` also stands down on anything it would otherwise
click.
`MediaPlayPause`/`MediaTrackNext`/`MediaTrackPrevious` keys are handled for the
platforms that deliver them to the page.

**Earphone buttons** work through the MediaSession actions registered in
`PlayerContext` — one press is play/pause, a double press is `nexttrack`, a
triple press is `previoustrack`. The OS counts the clicks; the web platform has
no raw headset-button event, so registering those actions is the whole
integration. It only responds once the session is live (i.e. after audio has
started), and a triple press on the first track restarts it, per the rule above.
`seekbackward`, `seekforward` and `seekto` are registered too, so the lock screen
and notification scrubber move the real playhead, and `setPositionState` keeps
their progress bar in step.

### Routes

| Path             | Page                                            |
| ---------------- | ----------------------------------------------- |
| `/`              | Trending songs and albums                       |
| `/search`        | `?q=` and `?type=song\|album\|artist`           |
| `/album/:token`  | Cover, metadata, track list                     |
| `/artist/:token` | Top songs and albums                            |
| `/queue`         | Full-page play queue                            |
| `*`              | Not found                                       |

Detail pages exist for albums and artists only. Songs have no page of their own —
clicking a song row or card plays it immediately.

Search state lives entirely in the URL, so results are shareable and survive a
reload. Tokens are `encodeURIComponent`-ed in `src/routes.js` — some contain
commas.

### UX invariants

- Every fetch has an explicit loading (skeleton matching the final layout),
  empty and error branch, and every error offers a retry.
- Requests are cancelled via `AbortController` when deps change or the component
  unmounts, so a slow response can never overwrite a newer one.
- Only `<main>` scrolls; the player and chrome never move.
- One accent colour (`--accent`) over a near-black scale; the only place real
  colour appears is the blurred album-art backdrop in the now-playing sheet.
- Focus rings are `:focus-visible`-only, and every animation is disabled under
  `prefers-reduced-motion` — except spinners, which keep turning slowly, because
  a ring frozen mid-rotation reads as a broken image rather than as progress.
- Anything a mouse can do, a keyboard can do:
  - The two button-based radio groups (search category, bitrate) share
    `ui/radioGroupKeys.js` — arrows and Home/End move the selection, wrapping and
    skipping unavailable options — and use a roving tabindex, so the group is one
    tab stop.
  - `ui/Menu` renders in a portal at the end of `<body>`, so it moves focus into
    the menu on open, walks it with the arrows, and hands it back to the trigger
    on Escape, selection or Tab. Without that, its items sit past everything else
    in the tab order.
  - The now-playing sheet and the narrow-screen queue drawer cover the page, so
    `useFocusTrap` keeps Tab inside them and returns focus on close. Both carry
    `role="dialog"`; the queue takes it only at the width where it is an overlay,
    since above 1100px it is a docked column and part of the page.
- Screen readers are told what changed when the change is a layout one: search
  announces "Searching…", the result count, or the failure through a `sr-only`
  live region, because a grid of results appearing says nothing on its own.
- Touch gets its own affordances rather than hover leftovers: play buttons that
  fade in on hover stay visible under `@media (hover: none)` wherever there is no
  artwork behind them to tap instead.
