const CACHE_NAME = 'block2lock-v3'; // Bumped version for new assets
const assetsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/levels.js',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll with a catch to prevent one failed asset from breaking the whole cache
        return cache.addAll(assetsToCache).catch(error => {
          console.error('Failed to cache assets during install:', error);
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // We only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        // Important: Don't cache new resources on the fly for this app
        // as all assets should be pre-cached.
        return fetch(event.request);
      })
  );
});