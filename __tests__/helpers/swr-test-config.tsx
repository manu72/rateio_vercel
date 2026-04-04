import { SWRConfig } from 'swr'

const jsonFetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    return res.json()
  })

/**
 * Wraps components with a test-appropriate SWRConfig:
 * - Fresh Map cache per render (no cross-test leaking)
 * - Same fetcher as production (delegates to global.fetch)
 * - No deduplication, retry, or focus revalidation (fast tests)
 */
export function SWRTestConfig({ children, fallback }: {
  children: React.ReactNode
  fallback?: Record<string, unknown>
}) {
  return (
    <SWRConfig value={{
      provider: () => new Map(),
      fetcher: jsonFetcher,
      dedupingInterval: 0,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      ...(fallback && { fallback }),
    }}>
      {children}
    </SWRConfig>
  )
}
