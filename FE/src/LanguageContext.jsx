import { createContext, useContext, useMemo } from 'react'

import { DEFAULT_LANG, LANGUAGES } from './api/endpoints'
import { usePersistentState } from './hooks/usePersistentState'

const LanguageContext = createContext(null)

/**
 * The trending (meta) endpoints are language-scoped, so the choice is app-level
 * state and worth remembering between visits.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = usePersistentState('language', DEFAULT_LANG, {
    validate: (value) => LANGUAGES.includes(value),
  })

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside a <LanguageProvider>')
  return context
}
