import { renderHook, waitFor } from '@testing-library/react'
import { SWRTestConfig } from '../helpers/swr-test-config'
import { useRates } from '@/hooks/use-rates'

const MOCK_RATES = {
  rates: { EUR: 0.92, USD: 1.0, GBP: 0.79 },
  updatedAt: '2025-01-01T00:00:00Z',
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRTestConfig>{children}</SWRTestConfig>
)

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_RATES),
    } as Response)
  )
})

describe('useRates', () => {
  it('returns null ratesData initially then populates on fetch', async () => {
    const { result } = renderHook(() => useRates(), { wrapper })
    expect(result.current.ratesData).toBeNull()
    await waitFor(() => {
      expect(result.current.ratesData).not.toBeNull()
    })
    expect(result.current.ratesData?.rates.EUR).toBe(0.92)
    expect(result.current.ratesData?.updatedAt).toBe('2025-01-01T00:00:00Z')
  })

  it('sets error to true when fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network error')))
    const { result } = renderHook(() => useRates(), { wrapper })
    await waitFor(() => {
      expect(result.current.error).toBe(true)
    })
    expect(result.current.ratesData).toBeNull()
  })

  it('sets error to true when response is not ok', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 } as Response)
    )
    const { result } = renderHook(() => useRates(), { wrapper })
    await waitFor(() => {
      expect(result.current.error).toBe(true)
    })
    expect(result.current.ratesData).toBeNull()
  })

  it('reports isValidating during background revalidation', async () => {
    const { result } = renderHook(() => useRates(), { wrapper })
    expect(result.current.isValidating).toBe(true)
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false)
    })
  })
})
