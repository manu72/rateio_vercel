import { localStorageProvider } from '@/lib/swr-cache-provider'

beforeEach(() => {
  localStorage.clear()
  jest.restoreAllMocks()
})

describe('localStorageProvider', () => {
  it('returns an empty Map when no cache exists in localStorage', () => {
    const map = localStorageProvider()
    expect(map.size).toBe(0)
    expect(map).toBeInstanceOf(Map)
  })

  it('restores cached entries from localStorage', () => {
    localStorage.setItem('swr-cache', JSON.stringify([
      ['/api/rates', { data: { rates: { USD: 1 } } }],
      ['/api/history?base=EUR&target=USD&days=30', { data: { dates: [], rates: [] } }],
    ]))
    const map = localStorageProvider()
    expect(map.size).toBe(2)
    expect(map.get('/api/rates')).toEqual({ data: { rates: { USD: 1 } } })
  })

  it('returns empty Map when localStorage contains invalid JSON', () => {
    localStorage.setItem('swr-cache', 'not-valid-json')
    const map = localStorageProvider()
    expect(map.size).toBe(0)
  })

  it('persists cache to localStorage on beforeunload', () => {
    const map = localStorageProvider()
    map.set('testKey', { data: 'testValue' })
    window.dispatchEvent(new Event('beforeunload'))
    const stored = JSON.parse(localStorage.getItem('swr-cache')!)
    expect(stored).toContainEqual(['testKey', { data: 'testValue' }])
  })

  it('persists cache to localStorage on visibilitychange to hidden', () => {
    const map = localStorageProvider()
    map.set('cacheKey', { data: 42 })
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    const stored = JSON.parse(localStorage.getItem('swr-cache')!)
    expect(stored).toContainEqual(['cacheKey', { data: 42 }])
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
  })

  it('supports standard Map operations (get, set, delete)', () => {
    const map = localStorageProvider()
    map.set('a', 1)
    expect(map.get('a')).toBe(1)
    map.delete('a')
    expect(map.get('a')).toBeUndefined()
  })
})
