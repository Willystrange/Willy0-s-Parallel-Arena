var App = window.App = window.App || {};

App.game_version = 'VERSION_PLACEHOLDER';

// Récupération immédiate de la version réelle
fetch('/api/version')
    .then(r => r.json())
    .then(d => { 
        if(d.version) {
            App.game_version = d.version;
        }
    })
    .catch(e => {});

// --- INITIALISATION FIREBASE IMMEDIATE ---
window.firebaseConfig = {
  apiKey: "AIzaSyAwIIKfoYwdtFD63yKhVggZOAnooQion-M",
  authDomain: "willy0s-parallel-arena.firebaseapp.com",
  projectId: "willy0s-parallel-arena",
  appId: "1:683284732830:web:ef7fb4cf1c88f73eead48f"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}

App.RECAPTCHA_SITE_KEY = '6LcMZzcsAAAAAMsYhhbKUnojajX1oOdgvQVk9ioG';

    // Chargement dynamique de reCAPTCHA (Standard v3)
    App.loadRecaptchaScript = function() {
        // En local, cela fonctionnera SEULEMENT si "localhost" est ajouté aux domaines autorisés dans la console Google reCAPTCHA
        // Sinon, vous aurez des erreurs "Invalid domain" dans la console JS, mais c'est le comportement attendu si on force l'activation.
        
        const script = document.createElement('script');
        script.src = "https://www.google.com/recaptcha/api.js?render=" + App.RECAPTCHA_SITE_KEY;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    };

    App.loadRecaptchaScript();

    App.getRecaptchaToken = function(action) {
        return new Promise((resolve) => {
            // Timeout de sécurité : si reCAPTCHA ne répond pas en 10s, on échoue
            const timeout = setTimeout(() => {
                console.warn("[reCAPTCHA] Timeout.");
                resolve(null);
            }, 10000);

            if (typeof grecaptcha === 'undefined') {
                clearTimeout(timeout);
                console.warn("[reCAPTCHA] Bibliothèque non disponible.");
                resolve(null);
                return;
            }

            try {
                grecaptcha.ready(function() {
                    grecaptcha.execute(App.RECAPTCHA_SITE_KEY, { action: action })
                        .then(function(token) {
                            clearTimeout(timeout);
                            resolve(token);
                        })
                        .catch(err => {
                            clearTimeout(timeout);
                            console.error("[reCAPTCHA] Erreur execution:", err);
                            resolve(null);
                        });
                });
            } catch (e) {
                clearTimeout(timeout);
                console.error("[reCAPTCHA] Exception:", e);
                resolve(null);
            }
        });
    };

// --- UTILS: VERSION COMPARE ---
App.versionCompare = function(v1, v2) {
  const cleanVersion = v => v.replace(/[^0-9.]/g, '');
  const v1Parts = cleanVersion(v1).split('.').map(Number);
  const v2Parts = cleanVersion(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const num1 = v1Parts[i] || 0;
    const num2 = v2Parts[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

// --- UTILS: WEBAUTHN BINARY CONVERSION ---
App.base64ToBuffer = (base64) => {
    let padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) {
        padded += '=';
    }
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
};

App.bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// --- Gestion de l'état de connexion ---
App.saveConnectionState = function(userId, est_connecte) {
  localStorage.setItem('connection', JSON.stringify({ userid: userId, est_connecte }));
};

// --- Sauvegarde et chargement des données utilisateur via SERVEUR LOCAL ---
App.saveUserDataToFirebase = async function(userId, extraData = {}) {
  const userData = getUserData();
  Object.assign(userData, extraData);

  const user = firebase.auth().currentUser;
  if (!user) return { success: false, error: "Non connecté" };
  
  try {
      const token = await user.getIdToken();
      if (!token) return { success: false, error: "Jeton manquant" };

      const response = await fetch(`/api/user/${userId}`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userData })
      });
      const data = await response.json();
      if (data.success && data.userData) {
          localStorage.setItem('userData', JSON.stringify(data.userData));
          return { success: true };
      } else {
          return { success: false, error: data.error };
      }
  } catch (e) {
      console.error('Erreur sauvegarde serveur local:', e);
      return { success: false, error: "Erreur de connexion au serveur." };
  }
};

App.loadUserDataFromFirebase = async function(userId, currentUser = null) {
  const user = currentUser || firebase.auth().currentUser;
  if (!user) {
      console.error("[LoadUserData] No user found.");
      return false;
  }
  try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      if (data.success && data.userData) {
          // PROTECTION ANTI-ROLLBACK : Si la version locale est plus récente (ex: juste après une mise à jour), on ne l'écrase pas avec une vieille version serveur (latence DB)
          const local = JSON.parse(localStorage.getItem('userData') || '{}');
          if (local.version && data.userData.version && typeof App.versionCompare === 'function') {
              if (App.versionCompare(local.version, data.userData.version) > 0) {
                  data.userData.version = local.version;
                  // On force aussi une nouvelle sauvegarde vers le serveur pour corriger le tir
                  setTimeout(() => App.saveUserDataToFirebase(userId, { version: local.version }), 2000);
              }
          }

          localStorage.setItem('userData', JSON.stringify(data.userData));

          // Mise à jour immédiate du volume si présent
          if (data.userData.musicVolume !== undefined && typeof musicGainNode !== 'undefined' && musicGainNode && audioCtx) {
              musicGainNode.gain.setValueAtTime(parseFloat(data.userData.musicVolume), audioCtx.currentTime);
          }

          return true;
      }
      return false;
  } catch (e) {
      console.error('Erreur chargement serveur local:', e);
      return false;
  }
};

// --- DATA LOADING ---
App.loadEquipmentsData = async function() {
    if (App.equipments && App.equipments.length > 0) return App.equipments;

    try {
        // Try to load from server
        const response = await fetch('/api/data/equipments');
        if (response.ok) {
            const data = await response.json();
            App.equipments = data;
            window.equipments = data; // Backward compatibility
            localStorage.setItem('cached_equipments', JSON.stringify(data));
            return data;
        }
    } catch (e) {
        console.warn("[Data] Failed to fetch equipments from server, trying cache:", e);
    }

    // Fallback to cache
    const cached = localStorage.getItem('cached_equipments');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            App.equipments = data;
            window.equipments = data;
            return data;
        } catch (e) {}
    }

    // Ultimate fallback (empty or minimal)
    App.equipments = [];
    return [];
};

App.loadCharactersData = async function() {
    if (App.characters && App.characters.length > 0) return App.characters;

    try {
        const response = await fetch('/api/data/characters');
        if (response.ok) {
            const data = await response.json();
            App.characters = data;
            localStorage.setItem('cached_characters', JSON.stringify(data));
            return data;
        }
    } catch (e) {
        console.warn("[Data] Failed to fetch characters from server, trying cache:", e);
    }

    const cached = localStorage.getItem('cached_characters');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            App.characters = data;
            return data;
        } catch (e) {}
    }

    App.characters = [];
    return [];
};

// Initial load
setTimeout(() => {
    App.loadEquipmentsData();
    App.loadCharactersData();
}, 100);

// Définition globale des personnages
if (!App.characters || App.characters.length === 0) {
    App.characters = [
      { name: "Willy", pv: 11100, attaque: 463, defense: 86, spe: "Déchaîne une rafale de trois attaques consécutives sur l'adversaire.", rarete: "inhabituel", classe: "Lame de l’Ombre", vitesse: 200, chanceCritique: 5.5 },
      { name: "Cocobi", pv: 11000, attaque: 440, defense: 115, spe: "Inflige des dégâts bruts équivalents à 12% des points de vie maximum de l'adversaire.", rarete: "légendaire", classe: "Briseur de Défense", vitesse: 160, chanceCritique: 4.0 },
      { name: "Oiseau", pv: 9800, attaque: 510, defense: 85, spe: "Plonge sur l'adversaire, infligeant 250% de ses dégâts d'attaque and augmentant sa propre défense de 20 points.", rarete: "rare", classe: "Assassin Sauvage", vitesse: 300, chanceCritique: 6.5 },
      { name: "Grours", pv: 13000, attaque: 430, defense: 68, spe: "Frappe avec une force colossale, infligeant 500 points de dégâts additionnés à son attaque et ignorant 50% de la défense adverse.", rarete: "rare", classe: "Colosse Invincible", vitesse: 81, chanceCritique: 3.0 },
      { name: "Baleine", pv: 10200, attaque: 435, defense: 105, spe: "Sacrifie 15 points de sa défense pour se soigner de 1000 PV, tout en menant une attaque. Ne peut être utilisée si sa défense est trop faible.", rarete: "inhabituel", classe: "Gardien Résolu", vitesse: 101, chanceCritique: 3.5 },
      { name: "Doudou", pv: 13800, attaque: 350, defense: 80, spe: "Régénère 5% de ses PV actuels (ou 15% si ses PV sont bas), et enchaîne avec une attaque.", rarete: "inhabituel", classe: "Régénérateur Mystique", vitesse: 1, chanceCritique: 2.5 },
      { name: "Coeur", pv: 10000, attaque: 450, defense: 100, spe: "Lance une attaque vampirique qui inflige 150% de ses dégâts d'attaque and lui restitue 10% à 15% des dégâts infligés en PV.", rarete: "rare", classe: "Soigneur d’Élite", vitesse: 180, chanceCritique: 4.5 },
      { name: "Diva", pv: 11021, attaque: 475, defense: 100, spe: "Charme l'adversaire, réduisant son attaque de 25% pendant 3 tours and lui infligeant des dégâts.", rarete: "légendaire", classe: "Lame de l’Ombre", vitesse: 260, chanceCritique: 6.0 },
      { name: "Poulpy", pv: 11500, attaque: 440, defense: 100, spe: "Porte une attaque brutale infligeant 175% de ses dégâts, ignorant 50% de la défense adverse and la réduisant de 15% pour les tours suivants.", rarete: "épique", classe: "Briseur de Défense", vitesse: 121, chanceCritique: 4.5 },
      { name: "Colorina", pv: 9600, attaque: 420, defense: 80, spe: "Lance une attaque affaiblissante qui inflige 85% de ses dégâts and réduit la défense de l'adversaire de 15% pendant 3 tours.", rarete: "commun", classe: "Briseur de Défense", vitesse: 61, chanceCritique: 3.5 },
      { name: "Rosalie", pv: 10500, attaque: 460, defense: 85, spe: "Déclenche une puissante attaque infligeant 200% de ses dégâts, avec 25% de chance d'immobiliser l'adversaire pour un tour.", rarete: "épique", classe: "Maître des Arcanes", vitesse: 220, chanceCritique: 5.0 },
      { name: "Sboonie", pv: 10200, attaque: 410, defense: 95, spe: "Libère une onde d'énergie qui lui rend 8% de ses PV max, inflige 50 points de dégâts and réduit l'attaque adverse de 15% pour le tour suivant.", rarete: "commun", classe: "Soigneur d’Élite", vitesse: 21, chanceCritique: 3.0 },
      { name: "Inconnu", pv: 11300, attaque: 435, defense: 83, spe: "Verrouille la capacité spéciale de l'adversaire pour 3 tours, augmente sa propre attaque and défense de 25 points, and inflige des dégâts.", rarete: "épique", classe: "Maître des Arcanes", vitesse: 141, chanceCritique: 4.0 },
      { name: "Boompy", pv: 11800, attaque: 500, defense: 80, spe: "Active une Surcharge Instable pendant 2 tours. Ses attaques ont 40% de chance d'infliger 175% de dégâts, mais sa défense est réduite de 30%. La capacité nécessite 3 attaques pour être chargée.", rarete: "légendaire", classe: "Assassin Sauvage", vitesse: 280, chanceCritique: 7.0 },
      { name: "Perro", pv: 9700, attaque: 420, defense: 85, spe: "Mord l'adversaire, infligeant des dégâts and réduisant sa défense de 30% pendant 2 tours.", rarete: "commun", classe: "Briseur de Défense", vitesse: 41, chanceCritique: 3.0 },
      { name: "Nautilus", pv: 11280, attaque: 470, defense: 74, spe: "Effectue une série de 3 frappes rapides, chacune infligeant 60% de ses dégâts d'attaque. Chaque coup a 50% de chance de réduire la défense adverse de 10 points.", rarete: "épique", classe: "Lame de l’Ombre", vitesse: 240, chanceCritique: 5.0 },
      { name: "Paradoxe", pv: 10950, attaque: 450, defense: 100, spe: "Inversion Paradoxale : Alterne entre deux postures. **Posture d'Assaut :** Augmente son attaque de 40% mais réduit sa défense de 50% pendant 2 tours. **Posture de Garde :** Augmente sa défense de 60% mais réduit son attaque de 30% pendant 2 tours.", rarete: "épique", classe: "Maître des Arcanes", vitesse: 170, chanceCritique: 4.5 },
      { name: "Korb", pv: 9750, attaque: 425, defense: 75, spe: "Affûte sa dague, infligeant 75% de ses dégâts d'attaque and augmentant ses chances de coup critique de 15% pour son prochain tour.", rarete: "commun", classe: "Lame de l’Ombre", vitesse: 95, chanceCritique: 3.5 }
    ];
}

// Variables globales pour le moteur Web Audio
let audioCtx = null;
let musicGainNode = null; // Node pour le volume
let currentSource = null;
let isBaseMusicActive = false;
let isCombatMusicActive = false;
let hasMusicStarted = false; // Variable globale pour suivre l'état

// Fonction pour initialiser l'AudioContext et le GainNode
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (!musicGainNode) {
    musicGainNode = audioCtx.createGain();
    const userData = getUserData();
    musicGainNode.gain.value = userData.musicVolume !== undefined ? userData.musicVolume : 0.5;
    musicGainNode.connect(audioCtx.destination);
  }
}

// Fonction pour régler le volume
App.setMusicVolume = function(volume) {
  initAudioContext();
  const vol = parseFloat(volume);
  if (musicGainNode) {
    musicGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  }
  const userData = getUserData();
  userData.musicVolume = vol;
  saveUserData(userData);
};

// Fonction pour charger et décoder un son
async function loadAudioBuffer(url) {
  initAudioContext();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.error("Erreur chargement audio:", url, e);
    return null;
  }
}

// Fonction pour jouer un buffer
function playBuffer(buffer, onEndedCallback) {
  if (!buffer) return;
  initAudioContext();
  
  if (currentSource) {
    currentSource.onended = null;
    try { currentSource.stop(); } catch (e) {}
  }

  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = buffer;
  // Connexion au GainNode au lieu de la destination directe
  currentSource.connect(musicGainNode);
  currentSource.onended = onEndedCallback;
  currentSource.start(0);
}

initMusicPlayer = function() {
  const userData = getUserData();
  if (!userData.music || hasMusicStarted) return; // Ne rien faire si déjà démarré

  const musicFiles = [
    'music/B1.mp3', 'music/B2.mp3', 'music/B3.mp3', 'music/B4.mp3', 'music/B5.mp3',
    'music/B6.mp3', 'music/B7.mp3', 'music/B8.mp3', 'music/B9.mp3', 'music/B10.mp3',
    'music/B11.mp3', 'music/B12.mp3'
  ];

  isBaseMusicActive = true;
  isCombatMusicActive = false;

  const playNext = async (shuffled, index) => {
    if (!isBaseMusicActive) return;
    const url = shuffled[index % shuffled.length];
    const buffer = await loadAudioBuffer(url);
    if (buffer) {
      playBuffer(buffer, () => playNext(shuffled, index + 1));
    } else {
      setTimeout(() => playNext(shuffled, index + 1), 1000);
    }
  };

  const unlockAndStart = () => {
    if (hasMusicStarted) return;
    hasMusicStarted = true;

    // Initialisation forcée au clic
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const shuffled = [...musicFiles].sort(() => Math.random() - 0.5);
    playNext(shuffled, 0);
  };

  document.addEventListener('touchstart', unlockAndStart, { once: true });
  document.addEventListener('mousedown', unlockAndStart, { once: true });
};

function resumeBaseMusic() {
  isBaseMusicActive = true;
  isCombatMusicActive = true; // Flag pour dire qu'on change
  
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  
  // Si la musique n'a jamais démarré, on initie les listeners
  if (!hasMusicStarted) {
      initMusicPlayer();
  } else {
      // Sinon on relance juste la séquence de base si elle était coupée
      isBaseMusicActive = true;
      isCombatMusicActive = false;
      const musicFiles = [
        'music/B1.mp3', 'music/B2.mp3', 'music/B3.mp3', 'music/B4.mp3', 'music/B5.mp3',
        'music/B6.mp3', 'music/B7.mp3', 'music/B8.mp3', 'music/B9.mp3', 'music/B10.mp3',
        'music/B11.mp3', 'music/B12.mp3'
      ];
      const shuffled = [...musicFiles].sort(() => Math.random() - 0.5);
      // On utilise un petit hack pour accéder à playNext ou on simplifie
      // Pour éviter de dupliquer, on peut juste forcer un redémarrage propre si isBaseMusicActive a changé
  }
}

function startMusicC() {
  if (isCombatMusicActive) return;
  const userData = getUserData();
  if (!userData.music) return;

  isBaseMusicActive = false;
  isCombatMusicActive = true;

  const musicFilesC = [
    'music/C1.mp3', 'music/C2.mp3', 'music/C3.mp3', 'music/C4.mp3', 'music/C5.mp3',
    'music/C6.mp3', 'music/C7.mp3', 'music/C8.mp3', 'music/C9.mp3', 'music/C10.mp3'
  ];

  const playNextC = async (shuffled, index) => {
    if (!isCombatMusicActive) return;
    const url = shuffled[index % shuffled.length];
    const buffer = await loadAudioBuffer(url);
    if (buffer) {
      playBuffer(buffer, () => playNextC(shuffled, index + 1));
    } else {
      setTimeout(() => playNextC(shuffled, index + 1), 1000);
    }
  };

  const shuffledC = [...musicFilesC].sort(() => Math.random() - 0.5);
  playNextC(shuffledC, 0);
}

// Nettoyage au cas où
initMusicPlayerC = function() {};
initMusicPlayer();




// --- Gestion de l'authentification et statut en ligne ---
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Connexion au serveur de jeu pour le statut "En ligne"
            if (typeof io !== 'undefined') {
                window.App = window.App || {};
                if (!App.socket) {
                    App.socket = io(window.location.origin, { transports: ["websocket"] });
                    App.socket.on('connect', () => {
                        App.socket.emit('register', { userId: user.uid });
                    });
                }
            }
        }
    });
}

// --- Gestion de la maintenance (via API locale) ---
let maintenanceEnCours = false;

async function checkMaintenance() {
  try {
      const response = await fetch('/api/config/maintenance');
      const data = await response.json();
      if (data.maintenance) {
          maintenanceEnCours = true;
          // Redirection complète au lieu de loadPage pour bloquer tout le jeu proprement
          if (!window.location.pathname.includes('maintenance.html')) {
              window.location.href = 'maintenance.html';
          }
      } else {
          maintenanceEnCours = false;
      }
  } catch (e) {}
}

// Lancement immédiat
checkMaintenance();
setInterval(checkMaintenance, 10000); // Vérifier toutes les 10s pour un blocage quasi-instantané


/**
 * Réinitialise le contenu dynamique dans #app ainsi que les ressources (CSS/JS)
 * qui ont été ajoutées lors du chargement d'une page.
 * Seuls les éléments marqués comme "persistent" (ex. header, footer de index.html) restent en place.
 */
function resetApp() {
  var appContainer = document.getElementById('app');
  if (!appContainer) return; // Sécurité si appelé trop tôt

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
  let needsSave = false;

  if (!userData) {
    needsSave = true;
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
      argent: 100000,
      VICTOIRE: false,
      version: 'B2.2.1.20',
      recompense: 0,
      perso_recompense: 0,
      xp_du_jour: 0,
      Boompy: 0,
      Boompy_XP: 0,
      Boompy_Level: 1,
      Boompy_boosy: 0,
      Willy: 1,
      Willy_XP: 10000,
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
      Nautilus: 0,
      Nautilus_XP: 0,
      Nautilus_Level: 1,
      Nautilus_boost: 0,
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
      musicVolume: 0.5,
      language: "fr",
      dailyClaims: {},
      equipments: [],
      characters: {},
    };
  }

  // --- AJOUT/VÉRIFICATION : Initialisation de la maîtrise pour tous les personnages ---
  const allCharacterNames = [
    "Willy", "Cocobi", "Oiseau", "Grours", "Baleine", "Doudou", "Coeur",
    "Diva", "Poulpy", "Colorina", "Rosalie", "Sboonie", "Inconnu",
    "Boompy", "Perro", "Nautilus", "Paradoxe", "Korb"
  ];

  if (!userData.characters) {
    userData.characters = {};
    needsSave = true;
  }

  allCharacterNames.forEach(name => {
    if (!userData.characters[name]) {
      userData.characters[name] = {};
      needsSave = true;
    }
    if (typeof userData.characters[name].masteryLevel === 'undefined') {
      userData.characters[name].masteryLevel = 0;
      userData.characters[name].masteryGrade = 0;
      userData.characters[name].masteryPoints = 0;
      needsSave = true;
    }
  });
  // --- FIN DE L'AJOUT ---

  if (needsSave) {
    saveUserData(userData);
  }

  return userData;
}

getUserData();

function saveUserData(userData) {
  localStorage.setItem('userData', JSON.stringify(userData));
  
  // Synchronisation automatique avec le serveur si connecté
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const user = firebase.auth().currentUser;
      if (user && window.App && typeof App.saveUserDataToFirebase === 'function') {
          // On ne déclenche la synchro que si on a un utilisateur actif
          App.saveUserDataToFirebase(user.uid);
      }
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
    img.onload = () => { };
    img.onerror = () => { };
  });
}
// fonction de préchargement
function preloadPage(page) {
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
  if (!cache.script.has(page)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'scripts/' + page + '.js';
    link.as = 'script';
    document.head.appendChild(link);
    cache.script.add(page);
  }
  if (page === "intro") {
    preloadImages(page);
  }
}

let lastPageHadFooter = false; // Variable pour suivre si la page précédente avait un footer

document.addEventListener('DOMContentLoaded', function() {
  // Vérification de la session persistante
  const connectionState = localStorage.getItem('connection');
  let isConnected = false;
  let userId = null;

  if (connectionState) {
    try {
      const state = JSON.parse(connectionState);
      if (state.est_connecte && state.userid) {
        isConnected = true;
        userId = state.userid;
      }
    } catch (e) {
      console.warn("Invalid connection state in localStorage");
    }
  }

  // Si connecté et données présentes, on va directement au menu
  if (isConnected) {
    const userData = localStorage.getItem('userData');
    if (userData) {
        
        // Tentative de rafraîchissement des données en arrière-plan (si Firebase init déjà fait ou se fera via onAuthStateChanged)
        if (typeof firebase !== 'undefined' && firebase.auth) {
           firebase.auth().onAuthStateChanged(user => {
               if (user && user.uid === userId) {
                   App.loadUserDataFromFirebase(userId, user);
               }
           });
        }
        
        loadPage('menu_principal');
        return;
    }
  }

  loadPage('intro');
});

setTimeout(() => {
  initMusicPlayerC();
  initMusicPlayer();
}, 5000);

/* ========== Footer behavior simple & robuste pour SPA ========== */
(function() {
  let footer = null;
  let app = document.getElementById('app');
  let isAnimatingFooter = false;
  let handlersAdded = false;
  let trackingEnabled = true; // true = on surveille le scroll (par défaut)
  let lastWindowY = 0;
  let lastAppY = 0;
  let touchStartY = null;

  const onWindowScroll = () => {
    if (!trackingEnabled || isAnimatingFooter) return;
    const y = window.scrollY || 0;
    if (y > lastWindowY) collapse();
    else if (y < lastWindowY) expand();
    lastWindowY = y;
  };

  const onAppScroll = () => {
    if (!trackingEnabled || isAnimatingFooter || !app) return;
    const s = app.scrollTop || 0;
    if (s > lastAppY) collapse();
    else if (s < lastAppY) expand();
    lastAppY = s;
  };

  const onWheel = (e) => {
    if (!trackingEnabled || isAnimatingFooter) return;
    if (e.deltaY > 0) collapse();
    else if (e.deltaY < 0) expand();
  };

  const onTouchStart = (e) => {
    if (!trackingEnabled || isAnimatingFooter) return;
    if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (!trackingEnabled || isAnimatingFooter) return;
    if (!touchStartY || !e.touches || !e.touches[0]) return;
    const cur = e.touches[0].clientY;
    const delta = touchStartY - cur;
    if (delta > 6) collapse();
    else if (delta < -6) expand();
    touchStartY = cur;
  };

  const onTouchEnd = () => { touchStartY = null; };

  const onFooterClick = () => { expand(); };

  function collapse() {
    if (isAnimatingFooter) return;
    if (!footer) return;
    if (!footer.classList.contains('collapsed')) {
      footer.classList.add('collapsed');
    }
  }

  function expand() {
    if (!footer) return;
    if (footer.classList.contains('collapsed')) {
      footer.classList.remove('collapsed');
    }
  }

  function addListeners() {
    if (handlersAdded) return;
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    if (app) app.addEventListener('scroll', onAppScroll, { passive: true });
    if (footer) footer.addEventListener('click', onFooterClick);
    handlersAdded = true;
  }

  function removeListeners() {
    if (!handlersAdded) return;
    window.removeEventListener('scroll', onWindowScroll);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    if (app) app.removeEventListener('scroll', onAppScroll);
    if (footer) footer.removeEventListener('click', onFooterClick);
    handlersAdded = false;
  }

  function setupFooterOnce() {
    footer = document.querySelector('#footer-placeholder .footer') || document.querySelector('.footer');
    if (!footer) {
      removeListeners();
      trackingEnabled = false;
      return;
    }
    if (!footer.__footerInited) {
      footer.__footerInited = true;
      if (!footer.classList.contains('persistent')) footer.classList.add('persistent');
    }
    if (trackingEnabled) addListeners();
  }

  function resetScrollTracking() {
    lastWindowY = window.scrollY || 0;
    lastAppY = app ? (app.scrollTop || 0) : 0;
    touchStartY = null;
  }

  function setIsAnimatingFooter(value) {
    isAnimatingFooter = !!value;
    if (!isAnimatingFooter) {
      resetScrollTracking();
    }
  }

  function enableTracking(enabled) {
    trackingEnabled = !!enabled;
    if (trackingEnabled) {
      footer = document.querySelector('#footer-placeholder .footer') || document.querySelector('.footer');
      addListeners();
      resetScrollTracking();
    } else {
      removeListeners();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFooterOnce);
  } else {
    setTimeout(setupFooterOnce, 0);
  }

  const placeholder = document.getElementById('footer-placeholder') || document.body;
  if (placeholder) {
    const obs = new MutationObserver(() => setupFooterOnce());
    obs.observe(placeholder, { childList: true, subtree: true });
  }

  window.footerBehavior = {
    init: setupFooterOnce,
    resetScrollTracking,
    setIsAnimatingFooter,
    enableTracking
  };
})();


const PAGES_WITH_DYNAMIC_FOOTER = ['menu_principal', 'perso_stats', 'passe_de_combat', 'boutique', 'equipments', 'character-upgrade', 'actualites', 'parametres', 'inventaire', 'quetes'];
const PAGES_WITHOUT_SCROLL_FOOTER = ['menu_principal', 'actualites'];

function loadPage(page) {
  resetApp();

  document.body.className = '';
  ['amelioration', 'characters', 'combat', 'quetes'].forEach(cl => {
    if (page.includes(cl)) document.body.classList.add(cl);
  });
  if (page === 'character-upgrade') document.body.classList.add('amelioration');
  document.body.classList.add(page);

  const PAGES_WITH_CSS = ['intro', 'footer', 'fin_partie', 'equipments', 'ouverture_coffre', 'fin_partie_survie'];
  if (PAGES_WITH_CSS.includes(page)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = page + '.css';
    link.setAttribute('data-dynamic', 'true');
    document.head.appendChild(link);
  }

  const htmlPromise = cache.html.has(page)
    ? Promise.resolve(cache.html.get(page))
    : fetch(page + '.html').then(res => res.text());

  htmlPromise.then(html => {
    const app = document.getElementById('app');
    const container = document.createElement('div');
    container.innerHTML = html;
    app.appendChild(container);

    const footer = document.querySelector('.footer.persistent') || document.querySelector('.footer');
    const currentPageHasFooter = PAGES_WITH_DYNAMIC_FOOTER.includes(page);
    const disableFooterCollapse = PAGES_WITHOUT_SCROLL_FOOTER.includes(page);

    if (footer) {
      if (currentPageHasFooter) {
        footer.style.display = 'flex';
        if (window.footerBehavior) window.footerBehavior.enableTracking(!disableFooterCollapse);

        if (!lastPageHadFooter) {
          if (window.footerBehavior) {
            window.footerBehavior.setIsAnimatingFooter(true);
            window.footerBehavior.resetScrollTracking();
          }
          footer.classList.add('footer-bubble-entry');
          void footer.offsetWidth;
          setTimeout(() => {
            footer.classList.remove('footer-bubble-entry');
            if (window.footerBehavior) window.footerBehavior.setIsAnimatingFooter(false);
          }, 600);
        }

        footer.querySelectorAll('.footer-icon').forEach(iconButton => {
          iconButton.classList.remove('active-footer-icon');
          const alt = iconButton.querySelector('img').alt;
          if ((page === 'characters' || page === 'perso_stats') && alt === "Personnages") iconButton.classList.add('active-footer-icon');
          else if (page === 'menu_principal' && alt === "Menu Principal") iconButton.classList.add('active-footer-icon');
          else if (page === 'passe_de_combat' && alt === "Passe de combat") iconButton.classList.add('active-footer-icon');
          else if (page === 'boutique' && alt === "Boutique") iconButton.classList.add('active-footer-icon');
        });
      } else {
        footer.style.display = 'none';
        if (window.footerBehavior) window.footerBehavior.enableTracking(false);
      }
    }
    lastPageHadFooter = currentPageHasFooter;

    // --- Inject combat-core.js if needed ---
    if (page.startsWith('combat') && page !== 'combat-selection') { // combat, combat-weekend, combat-survie
        const coreScript = document.createElement('script');
        coreScript.src = 'scripts/combat-core.js?v=' + Date.now();
        coreScript.setAttribute('data-dynamic', 'true');
        // We need to ensure core is loaded BEFORE the main script
        // But script loading is async by default unless we use promises or ordered appending
        // Appending synchronously to body usually executes in order for classic scripts, but let's be safe.
        // Actually, we can just append it first.
        document.body.appendChild(coreScript);
        
        // Use onload to load the main script
        coreScript.onload = () => {
            const script = document.createElement('script');
            const baseSrc = (page === 'character-upgrade' || page.endsWith('amelioration')) ? 'scripts/character-upgrade.js' : 'scripts/' + page + '.js';
            script.src = baseSrc + '?v=' + Date.now();
            script.setAttribute('data-dynamic', 'true');
            script.onload = () => {
              if (page === 'equipments' && typeof App.initEquipmentsPage === 'function') App.initEquipmentsPage();
            };
            document.body.appendChild(script);
        };
    } else {
        const script = document.createElement('script');
        const baseSrc = (page === 'character-upgrade' || page.endsWith('amelioration')) ? 'scripts/character-upgrade.js' : 'scripts/' + page + '.js';
        script.src = baseSrc + '?v=' + Date.now();
        script.setAttribute('data-dynamic', 'true');
        script.onload = () => {
          if (page === 'equipments' && typeof App.initEquipmentsPage === 'function') App.initEquipmentsPage();
        };
        document.body.appendChild(script);
    }
  }).catch(err => console.error('Error loading page:', err));
}
