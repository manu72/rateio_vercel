import useSWR from 'swr'
import { useMemo } from 'react'

interface HistoryResponse {
  dates: string[]
  rates: number[]
}

export interface HistoryDataPoint {
  date: string
  rate: number
}

export function useHistory(base: string, target: string, days: number) {
  const key = `/api/history?base=${base}&target=${target}&days=${days}`
  const { data, error, isLoading, isValidating } = useSWR<HistoryResponse>(key)

  const points = useMemo<HistoryDataPoint[]>(() => {
    if (!data) return []
    return data.dates.map((date, i) => ({ date, rate: data.rates[i] }))
  }, [data])

  return {
    data: points,
    error: error ? 'Failed to load history' : null,
    isLoading,
    isValidating,
  }
}
