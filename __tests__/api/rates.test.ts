/**
 * @jest-environment node
 */
global.fetch = jest.fn()

const mockFrankfurterResponse = {
  date: '2026-03-20',
  rates: { EUR: 0.922, GBP: 0.782 },
}

const mockExchangeRateResponse = {
  time_last_update_utc: 'Fri, 20 Mar 2026 00:00:00 +0000',
  conversion_rates: { USD: 1, EUR: 0.920, GBP: 0.780, AED: 3.67 },
}

function makeFetchMock(frankfurterOk: boolean, exchangeRateOk: boolean) {
  return (url: string) => {
    if ((url as string).includes('frankfurter.dev')) {
      if (!frankfurterOk) return Promise.resolve({ ok: false })
      return Promise.resolve({ ok: true, json: async () => mockFrankfurterResponse })
    }
    if (!exchangeRateOk) return Promise.resolve({ ok: false })
    return Promise.resolve({ ok: true, json: async () => mockExchangeRateResponse })
  }
}

describe('GET /api/rates', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('merges both sources — ExchangeRate-API takes precedence for live rates', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(makeFetchMock(true, true))
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    const data = await response.json()

    expect(data.rates.EUR).toBe(0.92)  // ExchangeRate-API wins over Frankfurter 0.922
    expect(data.rates.GBP).toBe(0.78)  // ExchangeRate-API wins over Frankfurter 0.782
    expect(data.rates.AED).toBe(3.67)  // ExchangeRate-API provides exotic currencies
    expect(data.updatedAt).toBe('Fri, 20 Mar 2026 00:00:00 +0000')
    expect(response.status).toBe(200)
  })

  it('falls back to Frankfurter-only rates when no API key is set', async () => {
    delete process.env.EXCHANGERATE_API_KEY
    ;(global.fetch as jest.Mock).mockImplementation(makeFetchMock(true, false))
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    const data = await response.json()

    expect(data.rates.EUR).toBe(0.922)
    expect(data.rates.USD).toBe(1)
    expect(data.updatedAt).toBe('2026-03-20')
    expect(response.status).toBe(200)
  })

  it('falls back to Frankfurter when ExchangeRate-API fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(makeFetchMock(true, false))
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    const data = await response.json()

    expect(data.rates.EUR).toBe(0.922)
    expect(data.rates.USD).toBe(1)
    expect(data.updatedAt).toBe('2026-03-20')
    expect(response.status).toBe(200)
  })

  it('returns 500 when both sources fail', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(makeFetchMock(false, false))
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
