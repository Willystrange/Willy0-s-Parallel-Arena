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

App.setConnectionStatus = function(online) {
  if (!App.connectionStatus) return;
  App.connectionStatus.textContent = online
    ? 'En ligne'
    : 'Hors ligne - échec de connexion au serveur';
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
  const serverUrl = "https://1ea7-2a01-cb08-814b-6100-aa42-50a6-fb21-9441.ngrok-free.app";

  App.socket = io(serverUrl, {
    transports: ["websocket"],
  });

  App.socket.on('connect', () => {
    console.log(`[SocketIO] connect : SID=${App.socket.id}`);
    App.setConnectionStatus(true);
    App.socket.emit('register', { userId: userId });
    App.socket.emit('ping_test', { message: 'salut serveur' });
  });

  App.socket.on('register_success', data => {
    console.log('[SocketIO] register_success :', data.message);
  });

  App.socket.on('register_error', data => {
    console.error('[SocketIO] register_error :', data.message);
  });

  App.socket.on('pong_test', data => {
    console.log('[CLIENT] pong_test reçu :', data.message);
  });

  App.socket.on('disconnect', reason => {
    console.warn(`[SocketIO] disconnect : raison=${reason}`);
    App.setConnectionStatus(false);
  });

  App.socket.on('connect_error', err => {
    console.error('[SocketIO] connect_error :', err.message);
    App.setConnectionStatus(false);
  });
};



// --- Gestion des données utilisateurs ---
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    let currentUserData = getUserData();
    saveUserData(currentUserData);
    //App.connectToGameServer(App.userId);
  } else {
    //App.setConnectionStatus(false);
    // Aucun utilisateur authentifié
  }
});

if (App.touchScreen) {
  App.touchScreen.addEventListener('click', function() {
    App.clearConnectionStatus();
    loadPage('menu_principal'); // Nom de la page sans extension
  });
} else {
  // Lors d'un clic, charger la page de connexion
  App.clearConnectionStatus();
  App.touchScreen.addEventListener('click', function() {
    loadPage('connection');
  });
};


// Enregistrement du Service Worker (ceci peut rester global)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  });
}
