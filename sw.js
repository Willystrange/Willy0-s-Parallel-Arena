// sw.js - KILLED TO PREVENT CACHE ISSUES
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach(client => {
        if (client.url && "navigate" in client) {
          client.navigate(client.url);
        }
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always go to network
  event.respondWith(fetch(event.request));
});