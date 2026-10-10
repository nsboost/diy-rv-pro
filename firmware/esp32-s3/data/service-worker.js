const CACHE_NAME = 'diy-rv-pro-shell-v2'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    return
  }

  // Refresh the shell on navigation so a firmware/web update is visible immediately.
  // Immutable hashed assets can be served from cache; API responses never enter it.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
      return response
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))))
    return
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
    return response
  })))
})
