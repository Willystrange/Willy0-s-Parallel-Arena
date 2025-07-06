window.App = window.App || {};

App.afficherDonnees = function() {
  const userData = getUserData();
  if (!userData) {
    document.getElementById('content').textContent = 'Aucune donnée trouvée.';
    return;
  }

  userData.partie_commencee = false;
  saveUserData(userData);

  // Afficher le gagnant
  document.getElementById('fin_manche').textContent =
    'Défaite à la manche : ' + (userData.fin_manche + 1);

  // Afficher les récompenses avec un intervalle d'une seconde
  setTimeout(() => {
    document.getElementById('fin_xp').textContent =
      'XP : ' + userData.fin_xp;
    document.getElementById('fin_xp').classList.add('show');
  }, 1000);

  setTimeout(() => {
    document.getElementById('fin_argent').textContent =
      'Points : ' + userData.fin_argent;
    document.getElementById('fin_argent').classList.add('show');
  }, 2000);

  // Afficher le bouton quitter après les récompenses
  setTimeout(() => {
    document.getElementById('quit-button').style.display = 'block';
  }, 4000);
};

// Initialisation au chargement de la page

App.afficherDonnees();
