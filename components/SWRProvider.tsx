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
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      errorRetryCount: 2,
    }}>
      {children}
    </SWRConfig>
  )
}
