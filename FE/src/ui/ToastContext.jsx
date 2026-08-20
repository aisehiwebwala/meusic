import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import './Toast.css'

const ToastContext = createContext(null)
const DURATION = 2600
/** A toast you are meant to act on has to outlast one you only read. */
const DURATION_WITH_ACTION = 7000

/**
 * Minimal transient-message stack, used to confirm queue actions and to explain
 * automatic bitrate fallbacks.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  /**
   * @param {string} message
   * @param {{ action?: { label: string, onAction: () => void } }} [options]
   *   An action turns the toast into the undo affordance for a destructive
   *   command, which is why those commands don't need a confirmation dialog.
   */
  const show = useCallback(
    (message, options = {}) => {
      if (!message) return
      idRef.current += 1
      const id = idRef.current
      const action = options.action?.label && options.action?.onAction ? options.action : null
      // Keep the stack shallow — three is enough context, more is noise.
      setToasts((list) => [...list.slice(-2), { id, message, action }])
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), action ? DURATION_WITH_ACTION : DURATION),
      )
    },
    [dismiss],
  )

  // Toasts pushed off the bottom of the stack are already gone from the DOM, so
  // their timeout has nothing left to dismiss — drop it rather than let it fire.
  useEffect(() => {
    const live = new Set(toasts.map((toast) => toast.id))
    for (const [id, timer] of timersRef.current) {
      if (live.has(id)) continue
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [toasts])

  // Nothing should still be pending after the provider goes away.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) =>
          toast.action ? (
            // Two targets, so tapping the message can't fire the action by
            // accident: the body dismisses, the button acts.
            <div key={toast.id} className="toast toast--action">
              <button type="button" className="toast__body" onClick={() => dismiss(toast.id)}>
                {toast.message}
              </button>
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  dismiss(toast.id)
                  toast.action.onAction()
                }}
              >
                {toast.action.label}
              </button>
            </div>
          ) : (
            <button key={toast.id} type="button" className="toast" onClick={() => dismiss(toast.id)}>
              {toast.message}
            </button>
          ),
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside a <ToastProvider>')
  return context
}
