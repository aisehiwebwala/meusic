import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { DEFAULT_QUALITY, QUALITIES, upscaleImage } from '../api/normalize'
import { STORAGE_PREFIX, usePersistentState } from '../hooks/usePersistentState'
import { useToast } from '../ui/ToastContext'
import { initialQueueState, playerReducer } from './playerReducer'

const PlayerContext = createContext(null)

/** Lower-quality streams to fall back to when a bitrate 404s on the CDN. */
const FALLBACK_ORDER = ['320', '160', '96']

/* The queue is written by hand rather than through `usePersistentState`, because
   restoring it has to go through the reducer — but it shares the namespace. */
const QUEUE_KEY = `${STORAGE_PREFIX}queue`

/**
 * Picks the stream for a bitrate, stepping down when that bitrate is missing.
 * The chosen quality comes back with the URL so the UI can report what is
 * actually playing rather than what was asked for.
 */
function resolveStream(track, quality) {
  const urls = track?.downloadUrls
  if (!urls) return { url: null, quality: null }
  if (urls[quality]) return { url: urls[quality], quality }
  for (const candidate of FALLBACK_ORDER) {
    if (urls[candidate]) return { url: urls[candidate], quality: candidate }
  }
  return { url: null, quality: null }
}

/** Next-lowest bitrate that hasn't already failed for this track. */
function nextFallbackQuality(quality, tried) {
  const lower = QUALITIES.filter((q) => Number(q) < Number(quality) && !tried.has(q))
  return lower.sort((a, b) => Number(b) - Number(a))[0] || null
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialQueueState)
  const { entries, currentIndex, shuffle, repeat, history, shuffleDone } = state
  const currentTrack = currentIndex >= 0 ? entries[currentIndex] || null : null
  /** Whether anything sits behind the current track — a visited step or a lower index. */
  const hasPrevious = history.length > 0 || currentIndex > 0

  /**
   * Whether the shuffle bag is empty — every track has had its turn. This is
   * shuffle's equivalent of "sitting on the last track": what tells an
   * end-of-track advance that there is nowhere left to go.
   */
  const shuffleExhausted = useMemo(() => {
    if (!shuffle || entries.length === 0) return false
    const done = new Set(shuffleDone)
    const currentUid = entries[currentIndex]?.uid
    return entries.every((entry) => entry.uid === currentUid || done.has(entry.uid))
  }, [shuffle, entries, currentIndex, shuffleDone])

  const audioRef = useRef(null)
  const toast = useToast()

  const [quality, setQuality] = usePersistentState('quality', DEFAULT_QUALITY, {
    validate: (value) => QUALITIES.includes(value),
  })
  const [volume, setVolume] = usePersistentState('volume', 0.8, {
    validate: (value) => typeof value === 'number' && value >= 0 && value <= 1,
  })
  const [muted, setMuted] = usePersistentState('muted', false, {
    validate: (value) => typeof value === 'boolean',
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffering, setBuffering] = useState(false)
  const [playbackError, setPlaybackError] = useState(null)

  /** Position to restore once the new source has metadata — the seamless quality switch. */
  const pendingSeekRef = useRef(0)
  /**
   * Swapping `audio.src` makes the element emit `pause`/`error`. Without this
   * flag those events would be read as "the user paused", killing playback on
   * every track change and quality switch.
   */
  const swappingRef = useRef(false)
  /** Which queue entry and stream URL the audio element currently holds. */
  const loadedRef = useRef({ uid: null, url: null })
  /** Bitrates that errored for the current track, so fallback never loops. */
  const failedQualitiesRef = useRef(new Set())
  /** True while the user drags the progress handle, so ticks don't fight the drag. */
  const seekingRef = useRef(false)

  /** The element's duration once known, falling back to the catalogue's value. */
  const effectiveDuration = duration || currentTrack?.duration || 0

  const stream = resolveStream(currentTrack, quality)
  const activeUrl = stream.url
  /** The bitrate actually being streamed, which can be lower than the one picked. */
  const activeQuality = stream.quality || quality

  // ---------------------------------------------------------------- restore
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(QUEUE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Array.isArray(saved?.entries) && saved.entries.length > 0) {
        dispatch({ type: 'RESTORE', entries: saved.entries, currentIndex: saved.currentIndex })
      }
    } catch {
      // A corrupt snapshot just means starting with an empty queue.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify({ entries, currentIndex }))
    } catch {
      // Ignore quota errors — persistence is a convenience, not a requirement.
    }
  }, [entries, currentIndex])

  // ------------------------------------------------------------ load source
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentTrack || !activeUrl) {
      swappingRef.current = true
      audio.removeAttribute('src')
      audio.load()
      loadedRef.current = { uid: null, url: null }
      setCurrentTime(0)
      setDuration(0)
      // The reducer keeps unplayable tracks out of the queue, so this is a
      // backstop — but if one ever gets in, say so instead of showing a player
      // bar that silently refuses to start.
      if (currentTrack) {
        setIsPlaying(false)
        setPlaybackError('No stream is available for this track.')
      }
      return
    }

    // Keyed on the resolved URL rather than the requested bitrate: two bitrates
    // can map to the same stream when one of them is missing, and reloading the
    // source we are already playing would rebuffer for nothing.
    const isSameTrack = loadedRef.current.uid === currentTrack.uid
    if (isSameTrack && loadedRef.current.url === activeUrl) return

    // Switching bitrate keeps the playhead; switching track starts from zero.
    swappingRef.current = true
    pendingSeekRef.current = isSameTrack ? audio.currentTime : 0
    if (!isSameTrack) {
      failedQualitiesRef.current = new Set()
      setCurrentTime(0)
      setDuration(currentTrack.duration || 0)
      setPlaybackError(null)
    }

    loadedRef.current = { uid: currentTrack.uid, url: activeUrl }
    audio.src = activeUrl
    audio.load()
    setBuffering(true)
  }, [currentTrack, activeUrl])

  // ----------------------------------------------------------- play / pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      const attempt = audio.play()
      if (attempt?.catch) {
        attempt.catch((error) => {
          // Autoplay policies reject until the user interacts; reflect reality.
          if (error?.name === 'NotAllowedError') setIsPlaying(false)
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack, activeUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  // ------------------------------------------------------------ transport
  /**
   * The only place that writes `audio.currentTime`. The element throws if the
   * source hasn't loaded yet — which every caller would otherwise have to guard,
   * now that seeks arrive from hotkeys and the OS as well as the slider.
   */
  const applySeek = useCallback((seconds) => {
    const audio = audioRef.current
    if (!audio) return
    const target = Math.max(0, seconds)
    try {
      audio.currentTime = target
    } catch {
      return // Nothing loaded to seek within.
    }
    setCurrentTime(target)
  }, [])

  const next = useCallback((options = {}) => {
    dispatch({ type: 'NEXT', auto: options.auto === true })
  }, [])

  const previous = useCallback(() => {
    const audio = audioRef.current
    // Restart instead of stepping back in two cases: we're past the opening
    // seconds (the familiar behaviour), or nothing precedes this track at all —
    // which is what a headset triple-press on the first song should do.
    if ((audio && audio.currentTime > 3) || !hasPrevious) {
      applySeek(0)
      return
    }
    dispatch({ type: 'PREVIOUS' })
  }, [hasPrevious, applySeek])

  const handleEnded = useCallback(() => {
    const audio = audioRef.current
    if (repeat === 'one' && audio) {
      audio.currentTime = 0
      audio.play().catch(() => setIsPlaying(false))
      return
    }
    // Shuffle ends when the bag is empty, not when the pointer reaches the last
    // row — the last row is just wherever chance put it.
    const atEnd = shuffle ? shuffleExhausted : currentIndex >= entries.length - 1
    if (atEnd && repeat === 'off') {
      setIsPlaying(false)
      setCurrentTime(0)
      return
    }
    next({ auto: true })
  }, [repeat, currentIndex, entries.length, shuffle, shuffleExhausted, next])

  /**
   * A 404 on one bitrate doesn't mean the song is gone — the backend derives all
   * three URLs by string substitution, so step down and try again.
   */
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack || !audio.currentSrc) return

    swappingRef.current = false
    const failed = failedQualitiesRef.current
    failed.add(activeQuality)

    // Step down until a bitrate maps to a *different* stream: the three URLs are
    // derived from one another upstream, so a bitrate the track doesn't carry
    // resolves straight back to the file that just failed.
    let fallback = nextFallbackQuality(activeQuality, failed)
    while (fallback && resolveStream(currentTrack, fallback).url === activeUrl) {
      failed.add(fallback)
      fallback = nextFallbackQuality(fallback, failed)
    }

    if (fallback) {
      toast.show(`${activeQuality} kbps unavailable — switched to ${fallback} kbps`)
      setQuality(fallback)
      return
    }

    setBuffering(false)
    setIsPlaying(false)
    setPlaybackError('This track could not be streamed.')
  }, [currentTrack, activeUrl, activeQuality, setQuality, toast])

  // -------------------------------------------------------------- commands
  const playNow = useCallback((tracks, startIndex = 0) => {
    dispatch({ type: 'PLAY_NOW', tracks, startIndex })
    setIsPlaying(true)
  }, [])

  const playNext = useCallback(
    (tracks) => {
      const count = Array.isArray(tracks) ? tracks.length : 1
      dispatch({ type: 'PLAY_NEXT', tracks })
      toast.show(count > 1 ? `${count} tracks play next` : 'Playing next')
    },
    [toast],
  )

  const addToQueue = useCallback(
    (tracks) => {
      const count = Array.isArray(tracks) ? tracks.length : 1
      dispatch({ type: 'ADD_TO_QUEUE', tracks })
      toast.show(count > 1 ? `${count} tracks added to queue` : 'Added to queue')
    },
    [toast],
  )

  const toggle = useCallback(() => {
    if (!currentTrack || !activeUrl) return
    setPlaybackError(null)
    setIsPlaying((playing) => !playing)
  }, [currentTrack, activeUrl])

  /**
   * Play/pause for a specific track. When it's already loaded this toggles
   * instead of restarting, which is what a play button on a row should do.
   */
  const toggleTrack = useCallback(
    (track, contextTracks, contextIndex) => {
      if (!track?.downloadUrls) {
        toast.show('No stream available for this track')
        return
      }
      if (currentTrack && currentTrack.id === track.id) {
        toggle()
        return
      }
      if (Array.isArray(contextTracks) && contextTracks.length > 0) {
        const index =
          typeof contextIndex === 'number'
            ? contextIndex
            : Math.max(contextTracks.findIndex((item) => item.id === track.id), 0)
        playNow(contextTracks, index)
        return
      }
      playNow([track], 0)
    },
    [currentTrack, playNow, toggle, toast],
  )

  const seek = useCallback(
    (seconds) => {
      const audio = audioRef.current
      if (!audio) return
      applySeek(Math.min(seconds, audio.duration || seconds))
    },
    [applySeek],
  )

  /**
   * Relative seek for hotkeys and the OS's fast-forward / rewind controls.
   * Reads the live playhead rather than `currentTime` state, so holding a key
   * accumulates instead of fighting a render behind.
   */
  const seekBy = useCallback(
    (delta) => {
      const audio = audioRef.current
      if (!audio || !currentTrack) return
      const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : currentTrack.duration || 0
      const target = audio.currentTime + delta
      applySeek(total > 0 ? Math.min(target, total) : target)
    },
    [currentTrack, applySeek],
  )

  const changeQuality = useCallback(
    (value) => {
      if (!QUALITIES.includes(value)) return
      failedQualitiesRef.current.delete(value)
      setQuality(value)
    },
    [setQuality],
  )

  const jumpTo = useCallback((index) => {
    dispatch({ type: 'JUMP_TO', index })
    setIsPlaying(true)
  }, [])

  const removeAt = useCallback((index) => dispatch({ type: 'REMOVE_AT', index }), [])
  const moveItem = useCallback((from, to) => dispatch({ type: 'MOVE_ITEM', from, to }), [])

  /**
   * Emptying the queue is the one action here that can't be reconstructed by
   * hand, so the confirmation carries an undo rather than blocking on a dialog:
   * the common case (you meant it) stays a single click. The restore goes through
   * `RESTORE`, which re-issues uids, so playback resumes at the start of the
   * track that was cut off.
   */
  const clearQueue = useCallback(() => {
    if (entries.length === 0) return
    const restore = { entries, currentIndex, wasPlaying: isPlaying }
    dispatch({ type: 'CLEAR_QUEUE' })
    setIsPlaying(false)
    toast.show('Queue cleared', {
      action: {
        label: 'Undo',
        onAction: () => {
          dispatch({ type: 'RESTORE', entries: restore.entries, currentIndex: restore.currentIndex })
          if (restore.wasPlaying) setIsPlaying(true)
        },
      },
    })
  }, [entries, currentIndex, isPlaying, toast])

  /**
   * Undo re-appends the removed tail rather than restoring a snapshot of the
   * whole queue: the track playing keeps its uid, so the audio element never
   * reloads and the music doesn't stutter for an undo.
   */
  const clearUpcoming = useCallback(() => {
    const removed = currentIndex >= 0 ? entries.slice(currentIndex + 1) : entries
    if (removed.length === 0) return
    dispatch({ type: 'CLEAR_UPCOMING' })
    toast.show(`${removed.length} upcoming track${removed.length === 1 ? '' : 's'} cleared`, {
      action: {
        label: 'Undo',
        onAction: () => dispatch({ type: 'ADD_TO_QUEUE', tracks: removed }),
      },
    })
  }, [entries, currentIndex, toast])

  const toggleShuffle = useCallback(() => dispatch({ type: 'TOGGLE_SHUFFLE' }), [])
  const cycleRepeat = useCallback(() => dispatch({ type: 'CYCLE_REPEAT' }), [])
  const toggleMute = useCallback(() => setMuted((value) => !value), [setMuted])

  const changeVolume = useCallback(
    (value) => {
      setVolume(Math.max(0, Math.min(1, value)))
      if (value > 0) setMuted(false)
    },
    [setVolume, setMuted],
  )

  // -------------------------------------------------- OS media integration
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!currentTrack) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistLine,
      album: currentTrack.album,
      artwork: [
        { src: upscaleImage(currentTrack.image, 500), sizes: '500x500', type: 'image/jpeg' },
        { src: currentTrack.image, sizes: '150x150', type: 'image/jpeg' },
      ].filter((art) => art.src),
    })
  }, [currentTrack])

  /**
   * Headset buttons reach the page through here and nowhere else: the OS counts
   * the clicks itself and dispatches one press as play/pause, a double press as
   * `nexttrack` and a triple press as `previoustrack`. There is no web API for
   * raw button events, so registering these actions *is* the earphone support —
   * and it only works while the session is active, i.e. once audio has played.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    const handlers = {
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      stop: () => {
        setIsPlaying(false)
        applySeek(0)
      },
      nexttrack: () => next(),
      previoustrack: () => previous(),
      // Lock-screen and notification scrubbing. `seekOffset` is the platform's
      // preferred jump; 10s is the conventional default when it omits one.
      seekbackward: (details) => seekBy(-(details?.seekOffset || 10)),
      seekforward: (details) => seekBy(details?.seekOffset || 10),
      seekto: (details) => {
        if (typeof details?.seekTime !== 'number') return
        const audio = audioRef.current
        if (details.fastSeek && audio?.fastSeek) {
          audio.fastSeek(details.seekTime)
          setCurrentTime(details.seekTime)
          return
        }
        applySeek(details.seekTime)
      },
    }
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Unsupported action — nothing to do.
      }
    }
    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          /* noop */
        }
      }
    }
  }, [isPlaying, next, previous, seekBy, applySeek])

  /**
   * Keeps the OS scrubber in step with the playhead. Guarded because Safari
   * throws if the position ever exceeds the duration, which happens for a tick
   * while a source is being swapped.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return
    const audio = audioRef.current
    if (!audio || !(effectiveDuration > 0)) return
    try {
      navigator.mediaSession.setPositionState({
        duration: effectiveDuration,
        playbackRate: audio.playbackRate || 1,
        position: Math.max(0, Math.min(audio.currentTime, effectiveDuration)),
      })
    } catch {
      /* Position outside the duration mid-swap — the next tick corrects it. */
    }
  }, [effectiveDuration, currentTime, isPlaying])

  const value = useMemo(
    () => ({
      // state
      entries,
      currentIndex,
      currentTrack,
      isPlaying,
      currentTime,
      duration: effectiveDuration,
      buffering,
      playbackError,
      quality,
      activeQuality,
      volume,
      muted,
      shuffle,
      repeat,
      hasQueue: entries.length > 0,
      hasPrevious,
      // commands
      playNow,
      playNext,
      addToQueue,
      toggle,
      toggleTrack,
      next,
      previous,
      seek,
      seekBy,
      changeQuality,
      changeVolume,
      toggleMute,
      jumpTo,
      removeAt,
      moveItem,
      clearQueue,
      clearUpcoming,
      toggleShuffle,
      cycleRepeat,
      seekingRef,
    }),
    [
      entries,
      currentIndex,
      currentTrack,
      isPlaying,
      currentTime,
      effectiveDuration,
      hasPrevious,
      buffering,
      playbackError,
      quality,
      activeQuality,
      volume,
      muted,
      shuffle,
      repeat,
      playNow,
      playNext,
      addToQueue,
      toggle,
      toggleTrack,
      next,
      previous,
      seek,
      seekBy,
      changeQuality,
      changeVolume,
      toggleMute,
      jumpTo,
      removeAt,
      moveItem,
      clearQueue,
      clearUpcoming,
      toggleShuffle,
      cycleRepeat,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          if (pendingSeekRef.current > 0) {
            // Restores the playhead after a bitrate switch.
            audio.currentTime = pendingSeekRef.current
            setCurrentTime(pendingSeekRef.current)
            pendingSeekRef.current = 0
          }
          setDuration(Number.isFinite(audio.duration) ? audio.duration : currentTrack?.duration || 0)
        }}
        onTimeUpdate={(event) => {
          if (seekingRef.current) return
          setCurrentTime(event.currentTarget.currentTime)
        }}
        onPlay={() => {
          swappingRef.current = false
          setIsPlaying(true)
        }}
        onPause={() => {
          // Ignore the pause the element emits while its source is being replaced.
          if (swappingRef.current) return
          setIsPlaying(false)
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          swappingRef.current = false
          setBuffering(false)
          setPlaybackError(null)
        }}
        onCanPlay={() => {
          swappingRef.current = false
          setBuffering(false)
        }}
        onEnded={handleEnded}
        onError={handleAudioError}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside a <PlayerProvider>')
  return context
}
