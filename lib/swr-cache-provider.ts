const CACHE_KEY = 'swr-cache'

// Listeners are registered once and delegate to activePersist, which always
// points to the persist function from the latest localStorageProvider() call.
// This prevents stale closures accumulating during HMR in development.
let activePersist: (() => void) | null = null
let listenersAttached = false

/**
 * Persists SWR's in-memory cache to localStorage so returning users
 * get instant data on page load (stale-while-revalidate across sessions).
 *
 * Uses visibilitychange (reliable on mobile) and beforeunload (desktop fallback)
 * to flush without blocking the main thread during normal usage.
 */
// SWR cache values are opaque internal State objects — `any` matches SWR's Cache<any> interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function localStorageProvider(): Map<string, any> {
  // During SSR / static generation, window and localStorage don't exist.
  // Return an empty Map — client hydration will re-call this with browser APIs available.
  if (typeof window === 'undefined') return new Map()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let map: Map<string, any>
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    map = new Map(JSON.parse(stored || '[]'))
  } catch {
    map = new Map()
  }

  function persist() {
    try {
      const entries = JSON.stringify(Array.from(map.entries()))
      localStorage.setItem(CACHE_KEY, entries)
    } catch {
      // localStorage full or unavailable (private browsing) — fail silently
    }
  }

  activePersist = persist

  if (!listenersAttached) {
    window.addEventListener('beforeunload', () => activePersist?.())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') activePersist?.()
    })
    listenersAttached = true
  }

  return map
}
