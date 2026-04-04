import { renderHook, waitFor } from '@testing-library/react'
import { SWRTestConfig } from '../helpers/swr-test-config'
import { useHistory } from '@/hooks/use-history'

const MOCK_HISTORY = {
  dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
  rates: [1.08, 1.10, 1.09],
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRTestConfig>{children}</SWRTestConfig>
)

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_HISTORY),
    } as Response)
  )
})

describe('useHistory', () => {
  it('returns empty data initially then populates on fetch', async () => {
    const { result } = renderHook(() => useHistory('EUR', 'USD', 30), { wrapper })
    expect(result.current.data).toEqual([])
    await waitFor(() => {
      expect(result.current.data.length).toBe(3)
    })
    expect(result.current.data[0]).toEqual({ date: '2025-01-01', rate: 1.08 })
    expect(result.current.data[2]).toEqual({ date: '2025-01-03', rate: 1.09 })
  })

  it('returns friendly error message when fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network error')))
    const { result } = renderHook(() => useHistory('EUR', 'USD', 30), { wrapper })
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load history')
    })
    expect(result.current.data).toEqual([])
  })

  it('constructs the correct fetch URL from parameters', async () => {
    renderHook(() => useHistory('GBP', 'JPY', 365), { wrapper })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/history?base=GBP&target=JPY&days=365')
    })
  })

  it('re-fetches when parameters change', async () => {
    const { result, rerender } = renderHook(
      ({ base, target, days }) => useHistory(base, target, days),
      { wrapper, initialProps: { base: 'EUR', target: 'USD', days: 30 } }
    )
    await waitFor(() => {
      expect(result.current.data.length).toBe(3)
    })
    rerender({ base: 'EUR', target: 'GBP', days: 7 })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/history?base=EUR&target=GBP&days=7')
    })
  })
})
