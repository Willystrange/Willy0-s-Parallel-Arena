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
        '/XP_MAX.png',
        '/verification_maj.png',
        '/Willy.html',
        '/Doudou.html',
        '/Cocobi.html',
        '/Oiseau.html',
        '/Gros_Nounours.html',
        '/Baleine.html',
        '/Diva.html',
        '/Poulpy.html',
        '/Coeur.html',
        '/Colorina.html',
        '/Potion-1.png',
        '/Potion-3.png',
        '/Potion-5.png',
        '/Amulette-1.png',
        '/Amulette-3.png',
        '/Amulette-5.png',
        '/recompenses.html',
        '/gratuite-rec.png',
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
