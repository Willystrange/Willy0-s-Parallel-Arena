var app = {};

// Variables globales pour les deux types de musiques
let baseAudios = [];
let audiosCGlobal = [];

initMusicPlayer = function() {
  const userData = getUserData();
  const musicFiles = [
    'music/B1.mp3', 'music/B2.mp3', 'music/B3.mp3', 'music/B4.mp3', 'music/B5.mp3',
    'music/B6.mp3', 'music/B7.mp3', 'music/B8.mp3', 'music/B9.mp3', 'music/B10.mp3',
    'music/B11.mp3', 'music/B12.mp3'
  ];

  baseAudios = musicFiles.map(file => new Audio(file));

  let hasStarted = false;
  if (userData.music) {
    const stopMusicC = () => {
      audiosCGlobal.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };

    const playSequence = () => {
      stopMusicC(); // Coupe la musique C si elle joue

      const shuffledAudios = [...baseAudios];
      shuffledAudios.sort(() => Math.random() - 0.5);
      let currentIndex = 0;

      const playNext = () => {
        shuffledAudios[currentIndex].play();
        shuffledAudios[currentIndex].onended = () => {
          currentIndex = (currentIndex + 1) % shuffledAudios.length;
          playNext();
        };
      };

      playNext();
    };

    const startMusicOnFirstTouch = () => {
      if (!hasStarted) {
        hasStarted = true;
        playSequence();
      }
    };

    document.addEventListener('touchstart', startMusicOnFirstTouch, { once: true });
    document.addEventListener('click', startMusicOnFirstTouch, { once: true });
  }
};

let combatAudios = [];
let hasStartedC = false;

initMusicPlayerC = function() {
  const userData = getUserData();
  const musicFilesC = [
    'music/C1.mp3', 'music/C2.mp3', 'music/C3.mp3', 'music/C4.mp3', 'music/C5.mp3', 'music/C6.mp3', 'music/C7.mp3', 'music/C8.mp3', 'music/C9.mp3', 'music/C10.mp3'
  ];
  if (userData.music) {
    combatAudios = musicFilesC.map(file => new Audio(file));
  }
}

function resumeBaseMusic() {
  // Stopper la musique de combat
  combatAudios.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });

  hasStartedC = false; // Permet de 
  hasStarted = true;
  initMusicPlayer();
}

function startMusicC() {
  if (hasStartedC) return;
  userData = getUserData();
  if (userData.music) {
    hasStartedC = true;

    // Stopper la musique normale
    baseAudios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    const shuffled = [...combatAudios].sort(() => Math.random() - 0.5);
    let index = 0;

    const playNextC = () => {
      shuffled[index].play();
      shuffled[index].onended = () => {
        index = (index + 1) % shuffled.length;
        playNextC();
      };
    };

    playNextC();
  }
}


// Déclaration de l'objet global app pour stocker vos variables et fonctions

const firebaseConfig = {
  apiKey: "AIzaSyAwIIKfoYwdtFD63yKhVggZOAnooQion-M",
  authDomain: "willy0s-parallel-arena.firebaseapp.com",
  databaseURL: "https://willy0s-parallel-arena-default-rtdb.firebaseio.com",
  projectId: "willy0s-parallel-arena",
  storageBucket: "willy0s-parallel-arena.appspot.com",
  messagingSenderId: "683284732830",
  appId: "1:683284732830:web:ef7fb4cf1c88f73eead48f",
  measurementId: "G-85B8R4NKNM"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const perf = firebase.performance();

// --- Mesure FCP et FID ---
if ('PerformanceObserver' in window) {
  const paintObserver = new PerformanceObserver((list) => {
    const entries = list.getEntriesByName('first-contentful-paint');
    if (entries.length > 0) {
      // Message supprimé
    }
  });
  paintObserver.observe({ type: 'paint', buffered: true });

  const fidObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'first-input') {
        // Message supprimé
      }
    });
  });
  fidObserver.observe({ type: 'first-input', buffered: true });
}

// --- Gestion de la maintenance ---
// En haut du fichier, en scope global :
let maintenanceEnCours = false;

function checkMaintenance() {
  Promise.all([
    database.ref('maintenance/start').once('value'),
    database.ref('maintenance/end').once('value')
  ]).then(([startSnap, endSnap]) => {
    const maintenanceStart = new Date(startSnap.val());
    const maintenanceEnd   = new Date(endSnap.val());
    const now              = new Date();

    const dansLaFenetre = now >= maintenanceStart && now <= maintenanceEnd;

    if (dansLaFenetre) {
      // Si on entre en maintenance et qu’on n’y est pas déjà :
      if (!maintenanceEnCours) {
        maintenanceEnCours = true;
        loadPage('maintenance');
      }
    } else {
      // On est hors maintenance : on réinitialise le flag
      maintenanceEnCours = false;
    }
  }).catch(err => {
    console.error('Erreur checkMaintenance:', err);
  });
}

// Démarrage
checkMaintenance();
setInterval(checkMaintenance, 10000);


/**
 * Réinitialise le contenu dynamique dans #app ainsi que les ressources (CSS/JS)
 * qui ont été ajoutées lors du chargement d'une page.
 * Seuls les éléments marqués comme "persistent" (ex. header, footer de index.html) restent en place.
 */
function resetApp() {
  var appContainer = document.getElementById('app');

  // Supprime les enfants non persistants
  Array.from(appContainer.children).forEach(child => {
    if (!child.classList.contains('persistent')) {
      appContainer.removeChild(child);
    }
  });

  // Retire les feuilles de style et scripts chargés dynamiquement
  document.querySelectorAll('link[data-dynamic="true"]').forEach(link => link.remove());
  document.querySelectorAll('script[data-dynamic="true"]').forEach(script => script.remove());
}

function getUserData() {
  let userData = JSON.parse(localStorage.getItem('userData'));

  if (!userData) {
    // Initialiser les données utilisateur si elles n'existent pas encore
    userData = {
      pass_XP: 0,
      pass_level: 0,
      nbr_perso: 2,
      victoires: 0,
      defaites: 0,
      manches_max: 0,
      XP_jour: 0,
      gagnant: '',
      fin_manche: 0,
      fin_xp: 0,
      fin_argent: 0,
      fin_trophees: 0,
      trophees: 0,
      argent: 100,
      VICTOIRE: false,
      version: 'B2.1.1.00',
      recompense: 0,
      perso_recompense: 0,
      xp_du_jour: 0,
      Boompy: 0,
      Boompy_XP: 0,
      Boompy_Level: 1,
      Boompy_boosy: 0,
      Willy: 1,
      Willy_XP: 0,
      Willy_Level: 1,
      Willy_boost: 0,
      Cocobi: 0,
      Cocobi_XP: 0,
      Cocobi_Level: 1,
      Cocobi_boost: 0,
      Oiseau: 0,
      Oiseau_XP: 0,
      Oiseau_Level: 1,
      Oiseau_boost: 0,
      Grours: 0,
      Grours_XP: 0,
      Grours_Level: 1,
      Grours_boost: 0,
      Baleine: 0,
      Baleine_XP: 0,
      Baleine_Level: 1,
      Baleine_boost: 0,
      Doudou: 0,
      Doudou_XP: 0,
      Doudou_Level: 1,
      Doudou_boost: 0,
      Coeur: 0,
      Coeur_XP: 0,
      Coeur_Level: 1,
      Coeur_boost: 0,
      Diva: 0,
      Diva_XP: 0,
      Diva_Level: 1,
      Diva_boost: 0,
      Perro: 0,
      Perro_XP: 0,
      Perro_Level: 1,
      Perro_boost: 0,
      Poulpy: 0,
      Poulpy_XP: 0,
      Poulpy_Level: 1,
      Poulpy_boost: 0,
      Colorina: 1,
      Colorina_XP: 0,
      Colorina_Level: 1,
      Colorina_boost: 0,
      Rosalie: 0,
      Rosalie_XP: 0,
      Rosalie_Level: 1,
      Rosalie_boost: 0,
      Sboonie: 0,
      Sboonie_XP: 0,
      Sboonie_Level: 1,
      Sboonie_boost: 0,
      Inconnu: 0,
      Inconnu_XP: 0,
      Inconnu_Level: 1,
      Inconnu_boost: 0,
      Double_XP: 5,
      Double_XP_acheté: 0,
      Potion_de_Santé_acheté: 0,
      Amulette_de_Régénération_acheté: 0,
      epee_tranchante_acheté: 0,
      elixir_puissance_acheté: 0,
      armure_fer_acheté: 0,
      bouclier_solide_acheté: 0,
      Cape_acheté: 0,
      crystal_acheté: 0,
      lastDoubleXPCheck: 0,
      lastFraudeReset: 0,
      boutique_recompense: false,
      semaine1: false,
      semaine2: false,
      semaine3: false,
      semaine4: false,
      semaine5: false,
      semaine6: false,
      crystaux_parrallels: 0,
      quetes_jour: false,
      quete1_type: "",
      quete1_text: "",
      quete1_total: "",
      quete1_current: "",
      quete1_character: "",
      quete2_type: "",
      quete2_text: "",
      quete2_total: "",
      quete2_current: "",
      quete2_character: "",
      quete3_type: "",
      quete3_text: "",
      quete3_total: "",
      quete3_current: "",
      quete3_character: "",
      partie_commencee: false,
      parties_test: 0,
      parties_weekend_test: 0,
      difficulty: "hard",
      classicGames: 0,
      music: true,
      dailyClaims: {},
    };
    localStorage.setItem('userData', JSON.stringify(userData));
    saveUserData(userData);
  }
  return userData;
}

getUserData();

function saveUserData(userData) {
  const connection = JSON.parse(localStorage.getItem('connection'));
  localStorage.setItem('userData', JSON.stringify(userData));

  if (connection && connection.est_connecte) {
    const userId = connection.userid;
    const userRef = database.ref(`users/${userId}/userData`);
    userRef.set(userData, (error) => {
    });
  }
}

/**
 * Charge une page donnée en injectant son HTML, son CSS et son JS.
 * Chaque page doit être constituée de 3 fichiers :
 *   - HTML dans la racine : page.html
 *   - CSS dans le dossier styles : styles/page.css
 *   - JS dans le dossier scripts : scripts/page.js
 *
 * @param {string} page Nom de la page à charger (exemple: 'intro')
 */
// 0) table de correspondance page → pages probables à visiter
const likelyNextPages = {
  intro: ['connection', 'menu_principal'],
  connection: ['menu_principal'],
  menu_principal: ['quetes', 'perso_stats', 'passe_de_combat', 'boutique'],
  amelioration: ['combat', 'characters']
};
// Table page → liste d’URLs d’images à précharger
const imagesToPreload = {
  intro: ['Shop.svg', 'Menu.svg', 'Pass.svg', 'Characters.svg', 'Amulette-1.png', 'armure-1.png', 'bouclier.png', "Cape_de_l'ombre.png", 'Crystale.png', 'elixir-1.png', 'epee-1.png', 'Potion-1.png', 'Récompense-gratuite.png', 'XP_2.png'],
};

// Fonction JS pour précharger les images


// cache pour stocker les fetch déjà faits
const cache = {
  html: new Map(),
  script: new Set()
};
function preloadImages(page) {
  const list = imagesToPreload[page] || [];
  list.forEach(src => {
    const img = new Image();
    img.src = src;
    // Optionnel : gérer onload/onerror pour debug
    img.onload = () => console.log(`Image preloadée : ${src}`);
    img.onerror = () => console.warn(`Échec preload image : ${src}`);
  });
}
// fonction de préchargement
function preloadPage(page) {
  // 1) précharger HTML si pas déjà en cache
  if (!cache.html.has(page)) {
    fetch(page + '.html')
      .then(res => {
        if (!res.ok) throw new Error(`Erreur préchargement HTML ${page}`);
        return res.text();
      })
      .then(html => {
        cache.html.set(page, html);
      })
      .catch(console.warn);
  }
  // 2) précharger script JS (ajoute un <link rel="prefetch"> pour le navigateur)
  if (!cache.script.has(page)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'scripts/' + page + '.js';
    link.as = 'script';
    document.head.appendChild(link);
    cache.script.add(page);
  }
  // après avoir déclenché preloadPage pour le HTML/JS…
  if (page === "intro") {
    preloadImages(page);
  }
}

// fonction principale de chargement
function loadPage(page) {
  resetApp();

  // 1) classes <body>
  document.body.className = '';
  ['amelioration', 'characters', 'combat', 'quetes'].forEach(cl => {
    if (page.includes(cl)) document.body.classList.add(cl);
  });
  document.body.classList.add(page);

  // 2) charger HTML + JS
  // -- si on a déjà préchargé le HTML, on l'utilise
  const htmlPromise = cache.html.has(page)
    ? Promise.resolve(cache.html.get(page))
    : fetch(page + '.html')
      .then(res => {
        if (!res.ok) throw new Error('Erreur de chargement de ' + page + '.html');
        return res.text();
      });

  htmlPromise.then(html => {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const container = document.createElement('div');
    container.innerHTML = html;
    app.appendChild(container);

    // charger dynamiquement le script
    const script = document.createElement('script');
    script.src = 'scripts/' + page + '.js';
    script.setAttribute('data-dynamic', 'true');
    document.body.appendChild(script);

    // une fois la page chargée, précharger les suivantes
    const nexts = likelyNextPages[page] || [];
    nexts.forEach(preloadPage);
  })
    .catch(err => console.error(err));
  // après avoir déclenché preloadPage pour le HTML/JS…
}






document.addEventListener('DOMContentLoaded', function() {
  loadPage('intro');
});

setTimeout(() => {
  initMusicPlayerC();
  initMusicPlayer();
}, 5000);