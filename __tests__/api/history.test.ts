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

  it('rejects malformed currency codes with 400 (no upstream call)', async () => {
    const { GET } = await import('@/app/api/history/route')
    for (const bad of ['USD!', 'US', 'USDB', '../../v1', 'us d', '1A2', 'EUR ']) {
      const res = await GET(makeRequest({ base: bad, target: 'USD', days: '3' }))
      expect(res.status).toBe(400)
    }
    for (const bad of ['', 'NG', 'NGNB', 'a b c']) {
      const res = await GET(makeRequest({ base: 'EUR', target: bad, days: '3' }))
      expect(res.status).toBe(400)
    }
    expect((global.fetch as jest.Mock)).not.toHaveBeenCalled()
  })

  it('normalizes lowercase currency codes to uppercase before forwarding', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFrankfurterTimeseriesResponse,
    })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'eur', target: 'usd', days: '3' }))
    expect(response.status).toBe(200)
    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(calledUrl).toContain('base=EUR')
    expect(calledUrl).toContain('symbols=USD')
  })

  it('clamps an absurd days value to the maximum range', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFrankfurterTimeseriesResponse,
    })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'EUR', target: 'USD', days: '99999999999' }))
    expect(response.status).toBe(200)
    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0]
    const match = calledUrl.match(/\/v1\/(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/)
    expect(match).not.toBeNull()
    const spanDays = (Date.parse(match![2]) - Date.parse(match![1])) / 86_400_000
    expect(spanDays).toBeLessThanOrEqual(1825)
  })

  it('falls back to the default range when days is non-numeric', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFrankfurterTimeseriesResponse,
    })
    const { GET } = await import('@/app/api/history/route')
    const response = await GET(makeRequest({ base: 'EUR', target: 'USD', days: 'garbage' }))
    expect(response.status).toBe(200)
    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0]
    const match = calledUrl.match(/\/v1\/(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/)
    expect(match).not.toBeNull()
    const spanDays = (Date.parse(match![2]) - Date.parse(match![1])) / 86_400_000
    // default range is 30 days, clamped to [1, 1825]
    expect(spanDays).toBeGreaterThan(20)
    expect(spanDays).toBeLessThanOrEqual(1825)
  })
})
