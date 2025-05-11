var app = {};

// Variables globales pour les deux types de musiques
let baseAudios = [];
let audiosCGlobal = [];

initMusicPlayer = function() {
  const userData = getUserData();
  const musicFiles = [
    '../B1.mp3', '../B2.mp3', '../B3.mp3', '../B4.mp3', '../B5.mp3',
    '../B6.mp3', '../B7.mp3', '../B8.mp3', '../B9.mp3', '../B10.mp3',
    '../B11.mp3', '../B12.mp3'
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
    '../C1.mp3', '../C2.mp3', '../C3.mp3', '../C4.mp3', '../C5.mp3', '../C6.mp3', 'C7.mp3', '../C8.mp3', '../C9.mp3', '../C10.mp3'
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
  startMusic();
}

function startMusicC() {
  if (hasStartedC) return;
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
function checkMaintenance() {
  Promise.all([
    database.ref('maintenance/start').once('value'),
    database.ref('maintenance/end').once('value')
  ])
    .then(([startSnap, endSnap]) => {
      const maintenanceStart = new Date(startSnap.val());
      const maintenanceEnd = new Date(endSnap.val());
      const currentTime = new Date();
      if (maintenanceStart && maintenanceEnd && currentTime >= maintenanceStart && currentTime <= maintenanceEnd) {
        // Charger la page de maintenance via loadPage
        loadPage('maintenance');
      }
    })
}

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
      version: 'B2.1.0.00',
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
      Cocobi: 1,
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
      Baleine: 1,
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
      Poulpy: 0,
      Poulpy_XP: 0,
      Poulpy_Level: 1,
      Poulpy_boost: 0,
      Colorina: 0,
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
function loadPage(page) {
  resetApp();

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/' + page + '.css';
  link.setAttribute('data-dynamic', 'true');

  link.onload = function() {
    // Message supprimé

    fetch(page + '.html')
      .then(response => {
        if (!response.ok) {
          throw new Error('Erreur de chargement de ' + page + '.html');
        }
        return response.text();
      })
      .then(html => {
        var appContainer = document.getElementById('app');
        var container = document.createElement('div');
        container.innerHTML = html;
        appContainer.appendChild(container);

        var script = document.createElement('script');
        script.src = 'scripts/' + page + '.js';
        script.setAttribute('data-dynamic', 'true');
        document.body.appendChild(script);
      })

  };

  document.head.appendChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
  loadPage('intro');
});

setTimeout(() => {
  initMusicPlayerC();
  initMusicPlayer();
}, 5000);