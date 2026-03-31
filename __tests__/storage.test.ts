import {
  loadCurrencies, saveCurrencies, DEFAULT_CURRENCIES,
  loadActiveValue, saveActiveValue,
  loadActiveCurrency, saveActiveCurrency,
} from '@/lib/storage'

const STORAGE_KEY = 'selectedCurrencies'
const VALUE_KEY = 'activeValue'
const CURRENCY_KEY = 'activeCurrency'

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
    try {
      expect(() => saveCurrencies(['USD'])).not.toThrow()
    } finally {
      Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
    }
  })
})

describe('loadActiveValue', () => {
  it('returns default "1.00" when nothing is stored', () => {
    expect(loadActiveValue()).toBe('1.00')
  })

  it('returns stored value', () => {
    localStorage.setItem(VALUE_KEY, '42.5')
    expect(loadActiveValue()).toBe('42.5')
  })

  it('returns default when stored value is empty string', () => {
    localStorage.setItem(VALUE_KEY, '')
    expect(loadActiveValue()).toBe('1.00')
  })

  it('returns default when localStorage throws', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    try {
      expect(loadActiveValue()).toBe('1.00')
    } finally {
      Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
    }
  })
})

describe('saveActiveValue', () => {
  it('saves value to localStorage', () => {
    saveActiveValue('99.9')
    expect(localStorage.getItem(VALUE_KEY)).toBe('99.9')
  })

  it('does not throw if localStorage is unavailable', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { setItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    try {
      expect(() => saveActiveValue('10')).not.toThrow()
    } finally {
      Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
    }
  })
})

describe('loadActiveCurrency', () => {
  it('returns null when nothing is stored', () => {
    expect(loadActiveCurrency()).toBeNull()
  })

  it('returns stored currency code', () => {
    localStorage.setItem(CURRENCY_KEY, 'EUR')
    expect(loadActiveCurrency()).toBe('EUR')
  })

  it('returns null when stored value is empty string', () => {
    localStorage.setItem(CURRENCY_KEY, '')
    expect(loadActiveCurrency()).toBeNull()
  })

  it('returns null when localStorage throws', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    try {
      expect(loadActiveCurrency()).toBeNull()
    } finally {
      Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
    }
  })
})

describe('saveActiveCurrency', () => {
  it('saves currency code to localStorage', () => {
    saveActiveCurrency('GBP')
    expect(localStorage.getItem(CURRENCY_KEY)).toBe('GBP')
  })

  it('does not throw if localStorage is unavailable', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { setItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    try {
      expect(() => saveActiveCurrency('GBP')).not.toThrow()
    } finally {
      Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
    }
  })
})
