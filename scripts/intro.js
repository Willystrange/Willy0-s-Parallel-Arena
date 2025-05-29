// On s'assure que le namespace App existe
window.App = window.App || {};

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
if (App.touchScreen) {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      App.User = true;
      App.userId = user.uid;
      // S'assurer que userData existe
      let currentUserData = getUserData();
      saveUserData(currentUserData);

      // Lors d'un clic, charger le menu principal
      App.touchScreen.addEventListener('click', function() {
        loadPage('menu_principal'); // Nom de la page sans extension
      });
    } else {
      // Lors d'un clic, charger la page de connexion
      App.touchScreen.addEventListener('click', function() {
        loadPage('connection');
      });
    }
  });
}

// Enregistrement du Service Worker (ceci peut rester global)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  });
}
