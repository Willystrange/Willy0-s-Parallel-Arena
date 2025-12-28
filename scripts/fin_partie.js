window.App = window.App || {};

// Remplace tout le contenu précédent car tout est maintenant dans App.MasterySystem

App.afficherDonnees = function() {
  const userData = getUserData();
  const gameMode = sessionStorage.getItem("gameMode");
  sessionStorage.removeItem("gameMode");

  if (userData) {
    // Affichage du message si parties_test < 1
    if (gameMode === "weekend" ? userData.parties_weekend_test < 1 : userData.parties_test < 1) {
      document.getElementById('message_test').textContent = 'Pendant votre première partie dans ce mode, \'XP, les points et les trophées sont désactivés afin que vous puissiez avoir le temps de tester et de découvrir le mode !';
      // Masquer les récompenses
      document.getElementById('gagnant').style.display = 'none';
      document.getElementById('fin_xp').style.display = 'none';
      document.getElementById('fin_argent').style.display = 'none';
      document.getElementById('fin_trophees').style.display = 'none';
    } else {
      // Afficher le gagnant
      document.getElementById('gagnant').textContent = 'Gagnant: ' + userData.gagnant;

      // Afficher les récompenses avec un intervalle
      setTimeout(() => {
        document.getElementById('fin_xp').textContent = 'XP : ' + userData.fin_xp;
        document.getElementById('fin_xp').classList.add('show');
      }, 1000);

      setTimeout(() => {
        document.getElementById('fin_argent').textContent = 'Points : ' + userData.fin_argent;
        document.getElementById('fin_argent').classList.add('show');
      }, 2000);

      setTimeout(() => {
        document.getElementById('fin_trophees').textContent = 'Trophées : ' + userData.fin_trophee;
        document.getElementById('fin_trophees').classList.add('show');
      }, 3000);
    }

    // Utilisation du module centralisé
    let masteryDelay = 0;
    if (App.MasterySystem && App.MasterySystem.displayMasteryInfo) {
        masteryDelay = App.MasterySystem.displayMasteryInfo('content');
    }

    // Afficher le bouton de quitter après l'affichage des récompenses
    setTimeout(() => {
      const quitButton = document.getElementById('quit-button');
      quitButton.style.display = 'block';
      // On s'assure que le bouton est bien le dernier élément
      document.getElementById('content').appendChild(quitButton);
    }, 4000 + masteryDelay);

    // Mettre à jour et sauvegarder les données après l'affichage
    userData.partie_commencee = false;
    userData.partie_commencee_weekend = false;
    saveUserData(userData);
  } else {
    document.getElementById('content').textContent = 'Aucune donnée trouvée.';
  }
}

App.afficherDonnees();
