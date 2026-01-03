// On s'assure que le namespace App existe
window.App = window.App || {};

// Création de l'indicateur de connexion
App.connectionStatus = document.createElement('div');
App.connectionStatus.id = 'connection-status-indicator';
App.connectionStatus.style.position = 'fixed';
App.connectionStatus.style.bottom = '5px';
App.connectionStatus.style.left = '10px';
App.connectionStatus.style.fontSize = '12px';
App.connectionStatus.style.zIndex = '9999';
App.connectionStatus.style.fontFamily = 'sans-serif';
document.body.appendChild(App.connectionStatus);

App.introLocalization = null;

// Charger la localisation pour l'intro
const userDataStr = localStorage.getItem('userData');
let lang = 'fr';
if (userDataStr) {
    try {
        lang = JSON.parse(userDataStr).language || 'fr';
    } catch(e) {}
}

fetch(`/api/data/localization/${lang}`)
    .then(res => res.json())
    .then(data => {
        App.introLocalization = data;
        // Rafraîchir si déjà affiché
        if (App.connectionStatus.style.display === 'block') {
             const isOnline = App.connectionStatus.style.color === 'green';
             App.setConnectionStatus(isOnline);
        }
    })
    .catch(() => {}); // Silencieux si échec

App.setConnectionStatus = function(online) {
  if (!App.connectionStatus) return;
  
  let text = online ? 'En ligne' : 'Hors ligne - échec de connexion au serveur';
  if (App.introLocalization && App.introLocalization.connectionStatus) {
      text = online ? App.introLocalization.connectionStatus.online : App.introLocalization.connectionStatus.offline;
  }
  
  App.connectionStatus.textContent = text;
  App.connectionStatus.style.color = online ? 'green' : 'red';
  App.connectionStatus.style.display = 'block';
};

App.clearConnectionStatus = function() {
  if (App.connectionStatus) {
    App.connectionStatus.style.display = 'none';
  }
};



// --- Récupération des éléments du DOM ---
App.rulesContainer = document.getElementById('rules-container');
App.startGameButton = document.getElementById('start-game');
App.acceptRulesCheckbox = document.getElementById('accept-rules');
App.gameContainer = document.getElementById('container');
App.touchScreen = document.getElementById('touch-screen');

// Vérifier si les règles ont déjà été acceptées
App.rulesAccepted = localStorage.getItem('rulesAccepted');
if (App.rulesAccepted === 'true') {
  // Les règles ont été acceptées : on s'assure que le container des règles reste caché
  if (App.rulesContainer) App.rulesContainer.style.display = 'none';
  if (App.gameContainer) App.gameContainer.style.display = 'flex';
} else {
  // Les règles n'ont pas encore été acceptées : on affiche le container des règles
  if (App.rulesContainer) App.rulesContainer.style.display = 'flex';
  if (App.gameContainer) App.gameContainer.style.display = 'none';

  // Permettre d'activer le bouton "Commencer" lorsque la checkbox est cochée
  if (App.acceptRulesCheckbox && App.startGameButton) {
    App.acceptRulesCheckbox.addEventListener('change', function() {
      App.startGameButton.disabled = !this.checked;
    });
  }
}

// Au clic sur "Commencer", enregistrer l'acceptation et lancer l'animation
if (App.startGameButton) {
  App.startGameButton.addEventListener('click', function() {
    localStorage.setItem('rulesAccepted', 'true');
    if (App.rulesContainer) App.rulesContainer.style.display = 'none';
    if (App.gameContainer) App.gameContainer.style.display = 'flex';
  });
}

// Lorsque l'animation "fadeAndLift" du conteneur se termine, afficher l'écran "Toucher pour commencer"
if (App.gameContainer) {
  App.gameContainer.addEventListener('animationend', function(event) {
    if (event.animationName === 'fadeAndLift') {
      App.showTouchScreen();
    }
  });
}

// Fonction pour afficher l'écran de démarrage
App.showTouchScreen = function() {
  if (App.touchScreen) {
    App.touchScreen.style.display = 'flex';
  }
};

// Au clic sur l'écran "Toucher pour commencer", charger la page appropriée selon l'état d'authentification
App.connectToGameServer = function(userId) {
  const serverUrl = window.location.origin;

  App.socket = io(serverUrl, {
    transports: ["websocket"],
  });

  App.socket.on('connect', () => {
    App.setConnectionStatus(true);
    App.socket.emit('register', { userId: userId });
    App.socket.emit('ping_test', { message: 'salut serveur' });
  });

  App.socket.on('register_success', data => {
  });

  App.socket.on('register_error', data => {
  });

  App.socket.on('pong_test', data => {
  });

  App.socket.on('disconnect', reason => {
    App.setConnectionStatus(false);
  });

  App.socket.on('connect_error', err => {
    App.setConnectionStatus(false);
  });
};



// --- Gestion des données utilisateurs ---
if (!firebase.apps.length) {
    const config = window.firebaseConfig || {
        apiKey: "AIzaSyAwIIKfoYwdtFD63yKhVggZOAnooQion-M",
        authDomain: "willy0s-parallel-arena.firebaseapp.com",
        projectId: "willy0s-parallel-arena",
        appId: "1:683284732830:web:ef7fb4cf1c88f73eead48f"
    };
    firebase.initializeApp(config);
}

firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    
    // Chargement initial depuis le serveur local
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/user/${user.uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.userData) {
            localStorage.setItem('userData', JSON.stringify(data.userData));
        }
    } catch (e) {}

    let currentUserData = getUserData();
    saveUserData(currentUserData);
    //App.connectToGameServer(App.userId);
  } else {
    // Aucun utilisateur authentifié
  }
});

if (App.touchScreen) {
  App.touchScreen.addEventListener('click', function() {
    App.clearConnectionStatus();
    if (firebase.auth().currentUser) {
      loadPage('menu_principal'); // Nom de la page sans extension
    } else {
      loadPage('connection');
    }
  });
}


// Enregistrement du Service Worker (ceci peut rester global)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  });
}
