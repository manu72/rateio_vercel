// Rateio Service Worker — cache-first extension for offline navigation.
// Caches previously visited pages and static assets so returning users
// can navigate between the homepage and chart pages without a network.

// Bumped to v2: the cache strategy now bounds /api staleness, so flush the old
// (unbounded) entries on activate.
const CACHE_NAME = 'rateio-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  const isSameOrigin = url.origin === self.location.origin
  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'

  if (!isSameOrigin && !isGoogleFont) return

  // Cache-first: content-hashed static assets (JS, CSS, fonts via next/font)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Cache-first: optimised images served by next/image
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Cache-first: app icons and logo
  if (/^\/(favicon|apple-touch-icon|android-chrome)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Cache-first: Google Fonts (dev-mode fallback; production self-hosts via next/font)
  if (isGoogleFont) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Network-first with bounded staleness: API responses are financial data, so
  // when offline only serve cached responses within their max age (rates 6h,
  // history 24h) and evict older entries instead of serving unbounded stale data.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, apiMaxAge(url.pathname)))
    return
  }

  // Stale-while-revalidate: full document navigations get an instant cached
  // paint, then refresh in the background.
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Network-first: RSC (client-side) navigations — keep route data fresh.
  if (request.headers.get('RSC') === '1') {
    event.respondWith(networkFirst(request))
    return
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

function apiMaxAge(pathname) {
  // History is daily data; live rates update hourly. Bound offline staleness so
  // the SW never serves financial data that is arbitrarily old.
  if (pathname.startsWith('/api/history')) return 24 * 60 * 60 * 1000
  return 6 * 60 * 60 * 1000
}

async function networkFirst(request, maxAgeMs = 0) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    // Bound staleness for cached financial data: if the cached response is
    // older than maxAgeMs (by its Date header), evict it and go offline rather
    // than serve misleadingly old rates.
    if (cached && maxAgeMs > 0) {
      const dateHeader = cached.headers.get('date')
      const age = dateHeader ? Date.now() - Date.parse(dateHeader) : 0
      if (Number.isFinite(age) && age > maxAgeMs) {
        const cache = await caches.open(CACHE_NAME)
        cache.delete(request).catch(() => {})
        return new Response('', { status: 503, statusText: 'Offline' })
      }
    }
    if (cached) return cached
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

// Serve a cached response instantly (if any) and refresh it in the background;
// fall back to the network response — or an offline page — when nothing is cached.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {})
      return response
    })
    .catch(() => null)
  if (cached) return cached
  const networkResponse = await networkPromise
  return networkResponse ?? new Response('', { status: 503, statusText: 'Offline' })
}
