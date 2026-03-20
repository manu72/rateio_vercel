/**
 * @jest-environment node
 */
global.fetch = jest.fn()

const mockFrankfurterTimeseriesResponse = {
  base: 'EUR',
  rates: {
    '2026-03-18': { USD: 1.081 },
    '2026-03-19': { USD: 1.083 },
    '2026-03-20': { USD: 1.084 },
  },
}

const mockExchangeRateTimeseriesResponse = {
  result: 'success',
  base_code: 'AED',
  rates: {
    '2026-03-18': { NGN: 450.1 },
    '2026-03-19': { NGN: 451.2 },
    '2026-03-20': { NGN: 452.3 },
  },
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/history')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

describe('GET /api/history', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('uses Frankfurter for supported currency pairs', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFrankfurterTimeseriesResponse,
    })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'EUR', target: 'USD', days: '3' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dates).toEqual(['2026-03-18', '2026-03-19', '2026-03-20'])
    expect(data.rates).toEqual([1.081, 1.083, 1.084])

    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(calledUrl).toContain('frankfurter.dev')
  })

  it('uses ExchangeRate-API for unsupported currency pairs', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockExchangeRateTimeseriesResponse,
    })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'AED', target: 'NGN', days: '3' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dates).toEqual(['2026-03-18', '2026-03-19', '2026-03-20'])
    expect(data.rates).toEqual([450.1, 451.2, 452.3])

    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(calledUrl).toContain('exchangerate-api.com')
  })

  it('falls back to ExchangeRate-API when Frankfurter fails for a supported pair', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // Frankfurter fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'EUR',
          rates: {
            '2026-03-18': { USD: 1.081 },
            '2026-03-19': { USD: 1.083 },
            '2026-03-20': { USD: 1.084 },
          },
        }),
      })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'EUR', target: 'USD', days: '3' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rates).toEqual([1.081, 1.083, 1.084])

    const fallbackUrl: string = (global.fetch as jest.Mock).mock.calls[1][0]
    expect(fallbackUrl).toContain('exchangerate-api.com')
  })

  it('returns 400 when base or target is missing', async () => {
    const { GET } = await import('@/app/api/history/route')

    const res1 = await GET(makeRequest({ target: 'USD' }))
    expect(res1.status).toBe(400)

    const res2 = await GET(makeRequest({ base: 'EUR' }))
    expect(res2.status).toBe(400)
  })

  it('returns 500 for unsupported pair when no API key is set', async () => {
    delete process.env.EXCHANGERATE_API_KEY
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'AED', target: 'NGN', days: '3' }))
    expect(response.status).toBe(500)
  })

  it('returns 500 when ExchangeRate-API fails for an unsupported pair', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'AED', target: 'NGN', days: '3' }))
    expect(response.status).toBe(500)
  })
})
