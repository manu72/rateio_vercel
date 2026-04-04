import useSWR from 'swr'

export interface RatesData {
  rates: Record<string, number>
  updatedAt: string
}

export function useRates() {
  const { data, error, isLoading, isValidating } = useSWR<RatesData>('/api/rates')
  return {
    ratesData: data ?? null,
    error: !!error,
    isLoading,
    isValidating,
  }
}
