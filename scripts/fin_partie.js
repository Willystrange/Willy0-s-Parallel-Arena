window.App = window.App || {};

// Remplace tout le contenu précédent car tout est maintenant dans App.MasterySystem

App.afficherDonnees = function() {
  // Traduire la page d'abord pour les éléments statiques et l'état initial
  App.translatePage();

  const userData = getUserData();
  const gameMode = sessionStorage.getItem("gameMode");
  sessionStorage.removeItem("gameMode");

  if (userData) {
      // Afficher le gagnant
      const winnerName = userData.gagnant || App.t('fin_partie.unknown');
      const gagnantEl = document.getElementById('gagnant');
      // On enlève l'attribut data-i18n pour éviter qu'une future traduction ne l'écrase
      gagnantEl.removeAttribute('data-i18n');
      gagnantEl.textContent = App.t('fin_partie.winner', { name: winnerName });

      // Afficher les récompenses avec un intervalle
      setTimeout(() => {
        const el = document.getElementById('fin_xp');
        el.removeAttribute('data-i18n');
        el.textContent = App.t('fin_partie.xp', { amount: userData.fin_xp !== undefined ? userData.fin_xp : 0 });
        el.classList.add('show');
      }, 1000);

      setTimeout(() => {
        const el = document.getElementById('fin_argent');
        el.removeAttribute('data-i18n');
        el.textContent = App.t('fin_partie.money', { amount: userData.fin_argent !== undefined ? userData.fin_argent : 0 });
        el.classList.add('show');
      }, 2000);

      setTimeout(() => {
        const el = document.getElementById('fin_trophees');
        el.removeAttribute('data-i18n');
        el.textContent = App.t('fin_partie.trophies', { amount: userData.fin_trophee !== undefined ? userData.fin_trophee : 0 });
        el.classList.add('show');
      }, 3000);

    // Utilisation du module centralisé
    let masteryDelay = 0;
    if (App.MasterySystem && App.MasterySystem.displayMasteryInfo) {
        masteryDelay = App.MasterySystem.displayMasteryInfo('content');
    }

    // Afficher le bouton de quitter après l'affichage des récompenses
    setTimeout(() => {
      const quitButton = document.getElementById('quit-button');
      // Le texte est déjà géré par data-i18n mais on peut le forcer si besoin, 
      // ici on laisse App.translatePage s'en charger au début, ou on le réapplique si on veut être sûr.
      // Comme c'est statique, pas besoin de toucher au texte ici sauf si on veut changer dynamiquement.
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
}

App.afficherDonnees();
