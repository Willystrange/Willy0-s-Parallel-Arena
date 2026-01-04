window.App = window.App || {};

// Remplace tout le contenu précédent car tout est maintenant dans App.MasterySystem

App.afficherDonnees = function() {
  const userData = getUserData();
  const gameMode = sessionStorage.getItem("gameMode");
  sessionStorage.removeItem("gameMode");

  if (userData) {
      // Afficher le gagnant
      const winnerName = userData.gagnant || App.t('fin_partie.unknown');
      document.getElementById('gagnant').textContent = App.t('fin_partie.winner', { name: winnerName });

      // Afficher les récompenses avec un intervalle
      setTimeout(() => {
        document.getElementById('fin_xp').textContent = App.t('fin_partie.xp', { amount: userData.fin_xp !== undefined ? userData.fin_xp : 0 });
        document.getElementById('fin_xp').classList.add('show');
      }, 1000);

      setTimeout(() => {
        document.getElementById('fin_argent').textContent = App.t('fin_partie.money', { amount: userData.fin_argent !== undefined ? userData.fin_argent : 0 });
        document.getElementById('fin_argent').classList.add('show');
      }, 2000);

      setTimeout(() => {
        document.getElementById('fin_trophees').textContent = App.t('fin_partie.trophies', { amount: userData.fin_trophee !== undefined ? userData.fin_trophee : 0 });
        document.getElementById('fin_trophees').classList.add('show');
      }, 3000);

    // Utilisation du module centralisé
    let masteryDelay = 0;
    if (App.MasterySystem && App.MasterySystem.displayMasteryInfo) {
        masteryDelay = App.MasterySystem.displayMasteryInfo('content');
    }

    // Afficher le bouton de quitter après l'affichage des récompenses
    setTimeout(() => {
      const quitButton = document.getElementById('quit-button');
      quitButton.textContent = App.t('fin_partie.quit_button');
      quitButton.style.display = 'block';
      // On s'assure que le bouton est bien le dernier élément
      document.getElementById('content').appendChild(quitButton);
    }, 4000 + masteryDelay);

    // Mettre à jour et sauvegarder les données après l'affichage
    userData.partie_commencee = false;
    userData.partie_commencee_weekend = false;
    saveUserData(userData);
  } else {
    document.getElementById('content').textContent = App.t('fin_partie.no_data');
  }
  
  App.translatePage();
}

App.afficherDonnees();
