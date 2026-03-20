/**
 * @jest-environment node
 */
global.fetch = jest.fn()

const mockTimeseriesResponse = {
  result: 'success',
  base_code: 'EUR',
  rates: {
    '2026-03-18': { USD: 1.081 },
    '2026-03-19': { USD: 1.083 },
    '2026-03-20': { USD: 1.084 },
  },
}

describe('GET /api/history', () => {
  beforeEach(() => {
    jest.resetModules()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTimeseriesResponse,
    })
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('returns dates and rates arrays', async () => {
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR&target=USD&days=3'
    const response = await GET(new Request(url))
    const data = await response.json()

    expect(data.dates).toEqual(['2026-03-18', '2026-03-19', '2026-03-20'])
    expect(data.rates).toEqual([1.081, 1.083, 1.084])
    expect(response.status).toBe(200)
  })

  it('returns 400 when base or target is missing', async () => {
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR'
    const response = await GET(new Request(url))
    expect(response.status).toBe(400)
  })

  it('returns 500 when upstream fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR&target=USD&days=7'
    const response = await GET(new Request(url))
    expect(response.status).toBe(500)
  })
})
