/*
 * Pootd service worker.
 *
 * Versioned at build time by the `pootd-sw-version` Vite plugin, so every
 * deploy activates a fresh cache and drops the previous one. Strategy:
 *   - navigations: network first, `/index.html` as the offline shell
 *   - hashed `/assets/*`: precached from `index.html` at install, then cache first
 *   - same-origin images: stale-while-revalidate
 *   - everything else (Supabase REST/storage): untouched
 */
const VERSION = '__POOTD_VERSION__'
const SHELL_CACHE = `pootd-shell-${VERSION}`
const ASSET_CACHE = `pootd-assets-${VERSION}`
const IMAGE_CACHE = `pootd-images-${VERSION}`
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE])

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/apple-touch-icon.png',
]

/**
 * The hashed bundle names live in `index.html`, so read them out of the shell we
 * just cached and precache them. Without this the document would load offline
 * but its JS/CSS would not, leaving a blank page offline.
 */
async function precacheAssets() {
  const shell = await caches.open(SHELL_CACHE)
  const document = await shell.match('/index.html')
  if (!document) return

  const html = await document.clone().text()
  const urls = [...new Set(html.match(/\/assets\/[A-Za-z0-9._-]+/g) ?? [])]
  if (urls.length === 0) return

  const assets = await caches.open(ASSET_CACHE)
  await assets.addAll(
    urls.map((url) => new Request(url, { cache: 'reload' })),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // `reload` bypasses the HTTP cache so the shell is really this version.
      await cache.addAll(
        SHELL_FILES.map((url) => new Request(url, { cache: 'reload' })),
      )
      // A failed asset precache must not block the worker from installing —
      // the cache-first fetch handler still fills the cache on first use.
      try {
        await precacheAssets()
      } catch {
        // Ignore.
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pootd-') && !KEEP.has(key))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Any SPA route returns the same document; keep one copy for offline.
      await cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    const cached = await cache.match('/index.html')
    return cached || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  return cached || (await network) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never cache application data.
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
  }
})
