import {
  CURRENCIES, getCurrency, hasHistoricalData,
  HISTORICAL_CURRENCIES, FRANKFURTER_CURRENCIES,
} from '@/lib/currencies'

describe('getCurrency', () => {
  it('returns currency object for a valid code', () => {
    const eur = getCurrency('EUR')
    expect(eur).toEqual({ code: 'EUR', name: 'Euro', flag: '🇪🇺' })
  })

  it('returns undefined for an unknown code', () => {
    expect(getCurrency('ZZZ')).toBeUndefined()
  })
})

describe('hasHistoricalData', () => {
  it('returns true for currencies in the Frankfurter set', () => {
    for (const code of ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CHF']) {
      expect(hasHistoricalData(code)).toBe(true)
    }
  })

  it('returns false for currencies outside the Frankfurter set', () => {
    expect(hasHistoricalData('AFN')).toBe(false)
    expect(hasHistoricalData('ZZZ')).toBe(false)
  })
})

describe('HISTORICAL_CURRENCIES', () => {
  it('contains only currencies present in the FRANKFURTER_CURRENCIES set', () => {
    for (const c of HISTORICAL_CURRENCIES) {
      expect(FRANKFURTER_CURRENCIES.has(c.code)).toBe(true)
    }
  })

  it('has the same size as the FRANKFURTER_CURRENCIES set', () => {
    expect(HISTORICAL_CURRENCIES.length).toBe(FRANKFURTER_CURRENCIES.size)
  })

  it('is a subset of the full CURRENCIES list', () => {
    const allCodes = new Set(CURRENCIES.map(c => c.code))
    for (const c of HISTORICAL_CURRENCIES) {
      expect(allCodes.has(c.code)).toBe(true)
    }
  })
})
