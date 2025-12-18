
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through fetch. 
  // For a full offline experience, caching logic would go here.
  event.respondWith(fetch(event.request));
});
