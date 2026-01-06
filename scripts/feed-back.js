window.App = window.App || {};

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

if (App.feedbackForm) {
    App.feedbackForm.addEventListener('submit', event => {
      event.preventDefault();
      const category = document.getElementById('category').value;
      // Note: l'input 'importance' n'existe plus dans le HTML fourni, je le garde vide pour compatibilité ou je le retire
      const importance = document.querySelector('input[name="importance"]:checked')?.value || 'N/A';
      const comments = document.getElementById('comments').value;
      
      const t = (key, params) => (App.t && typeof App.t === 'function') ? App.t(key, params) : key;

      const subject = t("feedback.email_subject", {category: category});
      const body = t("feedback.email_body", {
          category: category, 
          importance: importance, 
          comments: comments
      });

      // Afficher le message de confirmation
      if (App.confirmationMessage) {
          App.confirmationMessage.textContent = t("feedback.redirecting");
          App.confirmationMessage.classList.add('show');
      }

      // Appliquer l'animation de fade-out au conteneur
      if (App.container) {
          App.container.style.animation = "fadeOut 0.5s ease-out forwards";
      }

      // Après 600ms (animation terminée), rediriger vers mailto
      setTimeout(() => {
        window.location.href = "mailto:willyxstrange@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      }, 600);
    });
}

// Bouton Retour
const goBackBtn = document.getElementById('goBackButton');
if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      loadPage('parametres');
    });
}
