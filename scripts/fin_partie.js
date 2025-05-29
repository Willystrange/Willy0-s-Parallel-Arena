window.App = window.App || {};

App.afficherDonnees = function() {
  const userData = getUserData();
  userData.partie_commencee = false;
  userData.partie_commencee_weekend = false;
  saveUserData(userData);

  if (userData) {
    // Affichage du message si parties_test < 5
    if (userData.parties_test < 1) {
      document.getElementById('message_test').textContent = 'Pendant votre première partie dans ce mode, l\'XP, les points et les trophées sont désactivés afin que vous puissiez avoir le temps de tester et de découvrir le mode !';
      // Masquer les récompenses
      document.getElementById('gagnant').style.display = 'none';
      document.getElementById('fin_xp').style.display = 'none';
      document.getElementById('fin_argent').style.display = 'none';
      document.getElementById('fin_trophees').style.display = 'none';
    } else {
      // Afficher le gagnant
      document.getElementById('gagnant').textContent = 'Gagnant: ' + userData.gagnant;

      // Afficher les récompenses avec un intervalle d'une seconde
      setTimeout(() => {
        document.getElementById('fin_xp').textContent = 'XP : ' + userData.fin_xp;
        document.getElementById('fin_xp').classList.add('show');
      }, 1000); // 1 seconde de délai pour la première récompense

      setTimeout(() => {
        document.getElementById('fin_argent').textContent = 'Points : ' + userData.fin_argent;
        document.getElementById('fin_argent').classList.add('show');
      }, 2000); // 2 secondes de délai pour la deuxième récompense

      setTimeout(() => {
        document.getElementById('fin_trophees').textContent = 'Trophées : ' + userData.fin_trophee;
        document.getElementById('fin_trophees').classList.add('show');
      }, 3000); // 3 secondes de délai pour la troisième récompense
    }

    // Afficher le bouton de quitter après l'affichage des récompenses
    setTimeout(() => {
      document.getElementById('quit-button').style.display = 'block';
    }, 4000); // 4 secondes de délai total (3 secondes pour les récompenses + 1 secondes supplémentaires)
  } else {
    document.getElementById('content').textContent = 'Aucune donnée trouvée.';
  }
}

App.afficherDonnees();