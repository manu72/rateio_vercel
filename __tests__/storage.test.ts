import { loadCurrencies, saveCurrencies, DEFAULT_CURRENCIES } from '@/lib/storage'

const STORAGE_KEY = 'selectedCurrencies'

beforeEach(() => {
  localStorage.clear()
})

describe('loadCurrencies', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadCurrencies()).toEqual(DEFAULT_CURRENCIES)
  })

  it('returns stored currencies', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['USD', 'EUR']))
    expect(loadCurrencies()).toEqual(['USD', 'EUR'])
  })

  it('returns defaults when stored value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadCurrencies()).toEqual(DEFAULT_CURRENCIES)
  })
})

describe('saveCurrencies', () => {
  it('saves currencies to localStorage', () => {
    saveCurrencies(['GBP', 'JPY'])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['GBP', 'JPY'])
  })

  it('does not throw if localStorage is unavailable', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { setItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    expect(() => saveCurrencies(['USD'])).not.toThrow()
    Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
  })
})
