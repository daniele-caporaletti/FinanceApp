
const CACHE_NAME = 'finance-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache core files
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // We only cache local files explicitly to avoid CORS issues with CDNs
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: Network First for HTML (Navigation), Cache First for Assets
self.addEventListener('fetch', (event) => {
  // 1. Navigation requests (HTML) -> Network First
  // This ensures users always get the latest version after a deploy (Fixes 404 on hashed assets)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Assets (JS, CSS, Images) -> Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
