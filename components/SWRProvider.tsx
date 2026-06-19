'use client'

import { SWRConfig } from 'swr'
import { localStorageProvider } from '@/lib/swr-cache-provider'

const jsonFetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    return res.json()
  })

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      provider: localStorageProvider,
      fetcher: jsonFetcher,
      // FX rates update daily upstream; the route revalidates hourly server-side.
      // Revalidating on every tab/app focus just burns CPU/battery for unchanged
      // data, so revalidate only on mount and on network reconnect.
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      errorRetryCount: 2,
    }}>
      {children}
    </SWRConfig>
  )
}
