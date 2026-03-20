/**
 * @jest-environment node
 */
// Mock the global fetch before importing the route handler
const mockRatesResponse = {
  result: 'success',
  time_last_update_utc: 'Fri, 20 Mar 2026 00:00:00 +0000',
  conversion_rates: { USD: 1, EUR: 0.922, GBP: 0.782 },
}

global.fetch = jest.fn()

describe('GET /api/rates', () => {
  beforeEach(() => {
    jest.resetModules()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRatesResponse,
    })
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('returns rates and updatedAt', async () => {
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    const data = await response.json()

    expect(data.rates).toEqual({ USD: 1, EUR: 0.922, GBP: 0.782 })
    expect(data.updatedAt).toBe('Fri, 20 Mar 2026 00:00:00 +0000')
    expect(response.status).toBe(200)
  })

  it('returns 500 when upstream fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
