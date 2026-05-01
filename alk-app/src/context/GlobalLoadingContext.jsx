import { createContext, useContext, useMemo, useState } from 'react'

const GlobalLoadingContext = createContext(null)

export function GlobalLoadingProvider({ children }) {
  const [loadingCount, setLoadingCount] = useState(0)
  const [loadingLabel, setLoadingLabel] = useState('Loading...')

  function showGlobalLoader(label = 'Loading...') {
    setLoadingLabel(label)
    setLoadingCount((count) => count + 1)
  }

  function hideGlobalLoader() {
    setLoadingCount((count) => Math.max(0, count - 1))
  }

  async function trackGlobalLoad(task, label = 'Loading...') {
    showGlobalLoader(label)
    try {
      return await task()
    } finally {
      hideGlobalLoader()
    }
  }

  const value = useMemo(() => ({
    isGlobalLoading: loadingCount > 0,
    loadingLabel,
    showGlobalLoader,
    hideGlobalLoader,
    trackGlobalLoad,
  }), [loadingCount, loadingLabel])

  return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider')
  }
  return context
}
