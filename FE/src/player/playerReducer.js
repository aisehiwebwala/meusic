/**
 * Queue state machine.
 *
 * The queue is a flat list of *entries* — a track plus a `uid`. The uid exists
 * because the same song can legitimately appear twice (add an album, then add
 * one of its tracks again), and both React keys and drag-and-drop need a stable
 * identity that `song.id` cannot provide.
 *
 * `currentIndex` is the only pointer into the queue; `-1` means nothing loaded.
 */

export const REPEAT_MODES = ['off', 'all', 'one']

export const initialQueueState = {
  entries: [],
  currentIndex: -1,
  seq: 0,
  shuffle: false,
  repeat: 'off',
  /** Indices already visited, so Previous retraces a shuffled path. */
  history: [],
  /**
   * Uids played in the current shuffle cycle — the "bag" shuffle draws from.
   * Keyed by uid rather than index so reordering or removing a track can't
   * silently re-enter something that already played.
   */
  shuffleDone: [],
}

/** Only playable tracks make it into the queue — a song with no URLs is dead weight. */
const isPlayable = (track) => Boolean(track?.downloadUrls)

function toEntries(tracks, startSeq) {
  const list = (Array.isArray(tracks) ? tracks : [tracks]).filter(isPlayable)
  return list.map((track, index) => ({ ...track, uid: `q${startSeq + index}` }))
}

function clampIndex(index, length) {
  if (length === 0) return -1
  return Math.min(Math.max(index, 0), length - 1)
}

export function playerReducer(state, action) {
  switch (action.type) {
    /** Replaces the queue outright — "play this album / this search result". */
    case 'PLAY_NOW': {
      const entries = toEntries(action.tracks, state.seq)
      if (entries.length === 0) return state
      const requested = action.startIndex ?? 0
      // startIndex refers to the caller's list, which may have held unplayable
      // tracks; re-locate the intended track by id before falling back.
      const wanted = (Array.isArray(action.tracks) ? action.tracks : [action.tracks])[requested]
      const found = wanted ? entries.findIndex((entry) => entry.id === wanted.id) : -1
      return {
        ...state,
        entries,
        seq: state.seq + entries.length,
        currentIndex: found >= 0 ? found : clampIndex(requested, entries.length),
        history: [],
        shuffleDone: [],
      }
    }

    /** Inserts directly after the current track. */
    case 'PLAY_NEXT': {
      const entries = toEntries(action.tracks, state.seq)
      if (entries.length === 0) return state
      if (state.currentIndex === -1) {
        return {
          ...state,
          entries: [...state.entries, ...entries],
          seq: state.seq + entries.length,
          currentIndex: state.entries.length,
        }
      }
      const next = [...state.entries]
      next.splice(state.currentIndex + 1, 0, ...entries)
      return { ...state, entries: next, seq: state.seq + entries.length }
    }

    case 'ADD_TO_QUEUE': {
      const entries = toEntries(action.tracks, state.seq)
      if (entries.length === 0) return state
      const wasEmpty = state.entries.length === 0
      return {
        ...state,
        entries: [...state.entries, ...entries],
        seq: state.seq + entries.length,
        // Adding to an empty queue should cue the first track up, not play it.
        currentIndex: wasEmpty ? 0 : state.currentIndex,
      }
    }

    case 'REMOVE_AT': {
      const { index } = action
      if (index < 0 || index >= state.entries.length) return state
      const entries = state.entries.filter((_, i) => i !== index)
      let currentIndex = state.currentIndex
      if (index < state.currentIndex) currentIndex -= 1
      else if (index === state.currentIndex) currentIndex = clampIndex(index, entries.length)
      return { ...state, entries, currentIndex, history: [] }
    }

    case 'CLEAR_QUEUE':
      return { ...state, entries: [], currentIndex: -1, history: [], shuffleDone: [] }

    /**
     * Drops the tail after the current track — and only the tail. Everything at
     * or before `currentIndex` stays, so the count the UI offers ("3 tracks up
     * next") is exactly what disappears, and `history` and `shuffleDone` stay
     * valid: no surviving index moves, and no surviving uid changes.
     */
    case 'CLEAR_UPCOMING': {
      if (state.currentIndex === -1) {
        return { ...state, entries: [], currentIndex: -1, history: [], shuffleDone: [] }
      }
      if (state.currentIndex === state.entries.length - 1) return state
      return { ...state, entries: state.entries.slice(0, state.currentIndex + 1) }
    }

    /** Drag-and-drop reorder; keeps the playing track under the pointer. */
    case 'MOVE_ITEM': {
      const { from, to } = action
      const length = state.entries.length
      if (from === to || from < 0 || from >= length || to < 0 || to >= length) return state
      const entries = [...state.entries]
      const [moved] = entries.splice(from, 1)
      entries.splice(to, 0, moved)

      let currentIndex = state.currentIndex
      if (from === currentIndex) currentIndex = to
      else if (from < currentIndex && to >= currentIndex) currentIndex -= 1
      else if (from > currentIndex && to <= currentIndex) currentIndex += 1
      return { ...state, entries, currentIndex }
    }

    case 'JUMP_TO': {
      const index = action.index
      if (index < 0 || index >= state.entries.length) return state
      return {
        ...state,
        currentIndex: index,
        history: state.currentIndex === -1 ? state.history : [...state.history, state.currentIndex].slice(-50),
      }
    }

    /**
     * Advances the pointer. `auto` marks an end-of-track advance, where
     * `repeat: 'off'` must stop at the end instead of wrapping.
     */
    case 'NEXT': {
      const { entries, currentIndex, shuffle, repeat } = state
      if (entries.length === 0) return state
      const history = currentIndex === -1 ? state.history : [...state.history, currentIndex].slice(-50)

      if (shuffle && entries.length > 1) {
        // Draw without replacement: every track plays once before any repeats.
        // Sampling at random each time — the obvious implementation — replays
        // songs while leaving others unplayed, and never reaches an end, so a
        // shuffled queue with repeat off would run forever.
        const done = new Set(state.shuffleDone)
        const currentUid = entries[currentIndex]?.uid
        if (currentUid) done.add(currentUid)

        let pool = entries.filter((entry) => !done.has(entry.uid))
        if (pool.length === 0) {
          // Bag empty: the queue has been played through.
          if (action.auto && repeat === 'off') return state
          // A fresh cycle, minus the track that just played — the same song
          // twice across the seam is the one repeat that would be noticed.
          done.clear()
          pool = entries.filter((entry) => entry.uid !== currentUid)
          if (pool.length === 0) pool = entries
        }

        const pick = pool[Math.floor(Math.random() * pool.length)]
        done.add(pick.uid)
        return { ...state, currentIndex: entries.indexOf(pick), history, shuffleDone: [...done] }
      }
      if (currentIndex < entries.length - 1) return { ...state, currentIndex: currentIndex + 1, history }
      if (repeat === 'all' || !action.auto) return { ...state, currentIndex: 0, history }
      return state // End of queue on auto-advance: hold on the last track.
    }

    /**
     * Steps back through the visited path, or one slot when there is none.
     * Never wraps: with nothing behind the first track, `previous()` in
     * `PlayerContext` restarts the current one instead of jumping to the end.
     */
    case 'PREVIOUS': {
      const { entries, currentIndex, history } = state
      if (entries.length === 0) return state
      if (history.length > 0) {
        return { ...state, currentIndex: clampIndex(history[history.length - 1], entries.length), history: history.slice(0, -1) }
      }
      if (currentIndex > 0) return { ...state, currentIndex: currentIndex - 1 }
      return state
    }

    /** Turning shuffle on (or off and on again) starts a fresh cycle. */
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle, shuffleDone: [] }

    case 'CYCLE_REPEAT': {
      const index = REPEAT_MODES.indexOf(state.repeat)
      return { ...state, repeat: REPEAT_MODES[(index + 1) % REPEAT_MODES.length] }
    }

    /** Rehydrates a persisted queue on boot; uids are re-issued from zero. */
    case 'RESTORE': {
      const entries = (action.entries || [])
        .filter(isPlayable)
        .map((track, index) => ({ ...track, uid: `q${index}` }))
      if (entries.length === 0) return state
      return {
        ...state,
        entries,
        currentIndex: clampIndex(action.currentIndex ?? 0, entries.length),
        seq: entries.length,
        history: [],
        shuffleDone: [],
      }
    }

    default:
      return state
  }
}
