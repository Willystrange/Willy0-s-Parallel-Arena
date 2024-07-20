// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('my-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/amelioration.html',
        '/boutique.html',
        '/characters.html',
        '/combat.html',
        '/feed-back.html',
        '/mise_a_jour.html',
        '/patch_note.html',
        '/perso_stats.html',
        '/userdata.html',
        '/localStorage.js',
        '/path/to/style.css',
        '/path/to/script.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
