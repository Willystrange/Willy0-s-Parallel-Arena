window.app = window.app || {};

App.StartedGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-survie');
  }
}
App.StartedGame();

// Gestion de l'envoi du formulaire avec animation et feedback visuel
App.feedbackForm = document.getElementById('feedbackForm');
App.container = document.querySelector('.container');
App.confirmationMessage = document.getElementById('confirmationMessage');

feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  const category = document.getElementById('category').value;
  const importance = document.querySelector('input[name="importance"]:checked')?.value || '';
  const comments = document.getElementById('comments').value;
  const subject = "Feedback sur " + category;
  const body = `Bonjour,

Je souhaite partager les commentaires suivants :

Catégorie : ${category}
Importance : ${importance}
Remarques : ${comments}`;

  // Afficher le message de confirmation
  confirmationMessage.textContent = "Redirection vers votre client mail...";
  confirmationMessage.classList.add('show');

  // Appliquer l'animation de fade-out au conteneur
  App.container.style.animation = "fadeOut 0.5s ease-out forwards";

  // Après 600ms (animation terminée), rediriger vers mailto
  setTimeout(() => {
    window.location.href = "mailto:willyxstrange@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }, 600);
});

// Bouton Retour
document.getElementById('goBackButton').addEventListener('click', () => {
  loadPage('parametres');
});