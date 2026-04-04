// Rateio Service Worker — cache-first extension for offline navigation.
// Caches previously visited pages and static assets so returning users
// can navigate between the homepage and chart pages without a network.

const CACHE_NAME = 'rateio-v1'

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

  // Network-first: API routes (prevents SWR revalidation errors when offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Network-first: full page navigations and RSC client-side navigations
  if (request.mode === 'navigate' || request.headers.get('RSC') === '1') {
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

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}
