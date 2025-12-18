
const CACHE_NAME = 'finance-web-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Strategia: Stale-While-Revalidate per i file statici, Network-First per le API
  // Nota: Le chiamate a Supabase sono gestite dal client JS, qui gestiamo principalmente gli asset.
  
  const url = new URL(event.request.url);

  // Ignora le chiamate API o esterne dal caching aggressivo, passale direttamente
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Se la risposta è valida, aggiorna la cache per la prossima volta
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });

      // Restituisci subito la cache se c'è (velocità), altrimenti aspetta la rete
      return cachedResponse || fetchPromise;
    })
  );
});
