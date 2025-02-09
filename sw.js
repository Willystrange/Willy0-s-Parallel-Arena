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
        '/verification_maj.png',
        '/Willy.html',
        '/Doudou.html',
        '/Cocobi.html',
        '/Oiseau.html',
        '/Grours.html',
        '/Baleine.html',
        '/Diva.html',
        '/Poulpy.html',
        '/Coeur.html',
        '/Colorina.html',
        '/Potion-1.png',
        '/Amulette-1.png',
        '/recompenses.html',
        '/gratuite-rec.png',
        '/armure-1.png',
        '/elixir-1.png',
        '/epee-1.png',
        '/quetes.html',
        '/Icon-menu.png',
        '/Icon-parametre.png',
        '/Icon-personnage.png',
        '/Icon-magazin.png',
        '/Icon-amelioration.png',
        '/trophy-icon-3.png',
        '/user-icon.png',
        '/fin_partie_survie.html',
        '/combat-survie.html',
        '/special.png',
        '/attaque.png',
        '/inventaire.png',
        '/defense.png',
        '/actualites.html',
        '/passe_de_combat.html',
        '/passe_fond.jpeg',
        '/Sboonie.html',
        '/Rosalie.html',
        '/maintenance.html',
        '/cadeau_exeption.html',
        "/Cape_de_l'ombre.png",
        '/Crystale.png',
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
