// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('my-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/menu_principal.html',
        '/parametres.html',
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
        '/settings-icon.heic',
        '/icon.png',
        '/XP_2.png',
        'XP_MAX.png',
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
