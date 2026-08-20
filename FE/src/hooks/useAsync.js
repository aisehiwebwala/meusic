import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and exposes `{ data, error, loading, reload }`.
 *
 * The loader receives an `AbortSignal`; in-flight requests are cancelled when
 * the deps change or the component unmounts, so a slow response can never
 * overwrite the state of a newer one.
 *
 * @param {(signal: AbortSignal) => Promise<any>} loader
 * @param {any[]} deps      Re-runs the loader when these change.
 * @param {{ enabled?: boolean, initialData?: any }} [options]
 */
export function useAsync(loader, deps, { enabled = true, initialData = null } = {}) {
  const [state, setState] = useState({ data: initialData, error: null, loading: enabled })
  const [reloadKey, setReloadKey] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) {
      setState({ data: initialData, error: null, loading: false })
      return undefined
    }

    const controller = new AbortController()
    let active = true
    setState((prev) => ({ ...prev, loading: true, error: null }))

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (!active || error?.aborted || error?.name === 'AbortError') return
        setState({ data: null, error, loading: false })
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, reload }
}
