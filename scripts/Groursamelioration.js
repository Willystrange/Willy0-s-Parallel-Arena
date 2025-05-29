// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion du démarrage de partie ---
App.startGameIfStarted = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    // Navigation vers la page de combat en mode SPA
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// --- Fonctions utilitaires de progression ---
App.xpPourNiveauSuivant = function(level) {
  return level * level * 20;
};

App.coutPourNiveauSuivant = function(level) {
  return level * 25;
};

// --- Authentification Firebase ---
App.User = false;
App.userId = null;

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log("Utilisateur authentifié avec UID :", user.uid);
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe et le sauvegarder
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
    console.log("Aucun utilisateur authentifié");
  }
});

// --- Fonctions de calculs des statistiques pour Grours ---
App.loadPv = function() {
  const userData = getUserData();
  const Perso = userData[`Grours_PV_pts`] || 0;
  // Calcul du PV selon la formule donnée
  return Math.round((1 + Perso * 0.02) * 13000);
};

App.loadAttaque = function() {
  const userData = getUserData();
  const perso = userData[`Grours_attaque_pts`] || 0;
  return Math.round((1 + perso * 0.02) * 430);
};

App.loadDefense = function() {
  const userData = getUserData();
  const perso = userData[`Grours_defense_pts`] || 0;
  return Math.round((1 + perso * 0.02) * 68);
};

// --- Gestion de l'augmentation de niveau pour Grours ---
App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Grours_Level'];
  const xp = userData['Grours_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Grours_Level'] += 1;
    userData['Grours_XP'] -= xpNeeded;
    userData.Grours_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

// --- Affichage des données utilisateur pour Grours ---
App.afficherDonneesUtilisateur = function() {
  console.log('Données utilisateur chargées');
  const userData = getUserData();
  // Initialisation des stats si absentes
  userData.Grours_pts = userData.Grours_pts || 0;
  userData.Grours_PV_pts = userData.Grours_PV_pts || 0;
  userData.Grours_attaque_pts = userData.Grours_attaque_pts || 0;
  userData.Grours_defense_pts = userData.Grours_defense_pts || 0;
  saveUserData(userData);
  const points = userData.argent;

  if (userData['Grours'] === 1) {
    const level = userData['Grours_Level'];
    const xp = userData['Grours_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const groursHTML = `
      <div id="Grours-info" class="character-info">
        <strong>Grours</strong><br>
        Classe: Colosse Invinsible
        <span id="Grours-tooltip-icon" class="tooltip-icon" onclick="App.afficherDetailsPerso()" style="cursor: pointer; margin-left: 10px;">&#x26A0;</span>
        <br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Inflige 500 + son attaque, en ignorant 50% de la défense.<br>
        Rareté : rare<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;
    document.getElementById('characters-unlocked').innerHTML = groursHTML;
    document.getElementById('Grours-info').style.display = 'block';
  }

  console.log(userData.Grours_pts);

  if (userData.Grours_pts > 0 &&
      userData.Grours_PV_pts < 30 &&
      userData.Grours_attaque_pts < 10 &&
      userData.Grours_defense_pts < 20) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

// --- Gestion de l'attribution des points aux stats ---
App.modificationsTemp = {}; // Stocke les modifications temporaires

App.afficherBoutonsStats = function(userData) {
  document.getElementById('Grours-info').innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach(stat => {
    const valeurStat = (userData[`Grours_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = 0;
    if (stat === 'PV') {
      maxStat = 30;
    } else if (stat === 'attaque') {
      maxStat = 10;
    } else if (stat === 'defense') {
      maxStat = 20;
    }
    const affichageBoutonPlus = valeurStat < maxStat && ((userData.Grours_pts - App.totalPointsUtilises()) > 0);
    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    document.getElementById('Grours-info').appendChild(statElement);
  });

  // Mise à jour ou création de la bulle des points restants
  let bubble = document.getElementById('Grours-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Grours-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Grours_pts - App.totalPointsUtilises()}`;

  // Bouton de confirmation
  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  document.getElementById('Grours-info').appendChild(confirmerButton);
};

App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;
  let maxStat = 0;
  if (stat === 'PV') {
    maxStat = 30;
  } else if (stat === 'attaque') {
    maxStat = 10;
  } else if (stat === 'defense') {
    maxStat = 20;
  }
  const valeurActuelle = (userData[`Grours_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (valeur === 1 && ((userData.Grours_pts - App.totalPointsUtilises()) > 0) && valeurActuelle < maxStat) {
    App.modificationsTemp[stat] = (App.modificationsTemp[stat] || 0) + 1;
  } else if (valeur === -1 && (App.modificationsTemp[stat] || 0) > 0) {
    App.modificationsTemp[stat]--;
  }
  App.afficherBoutonsStats(userData);
};

App.totalPointsUtilises = function() {
  return Object.values(App.modificationsTemp).reduce((sum, val) => sum + (val || 0), 0);
};

App.confirmerStats = function() {
  const userData = getUserData();
  if (!userData) {
    console.error("Impossible de confirmer les stats : données utilisateur introuvables.");
    return;
  }

  App.modificationsTemp.PV = App.modificationsTemp.PV || 0;
  App.modificationsTemp.attaque = App.modificationsTemp.attaque || 0;
  App.modificationsTemp.defense = App.modificationsTemp.defense || 0;

  const totalPts = App.totalPointsUtilises();
  if (totalPts > userData.Grours_pts) {
    console.error("Erreur : points à attribuer supérieurs aux points disponibles.");
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Grours_${stat}_pts`] = (userData[`Grours_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Grours_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Grours-points-bubble');
  if (bubble) {
    bubble.remove();
  }

  try {
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
    console.log("Modifications confirmées avec succès !");
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des données utilisateur :", error);
  }
};

App.afficherDetailsPerso = function() {
  alert("Colosse Invinsible : Axé sur les PV et la défense, c’est le mur infranchissable des batailles.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach(bouton => {
    bouton.disabled = desactiver;
  });
};

// --- Navigation SPA pour les autres pages ---
App.showMainMenu = function() {
  loadPage('menu_principal');
};

App.goToPasse = function() {
  loadPage('passe_de_combat');
};

App.viewCharacters = function() {
  loadPage('perso_stats');
};

App.viewShop = function() {
  loadPage('boutique');
};

App.viewUpgrades = function() {
  // Placeholder pour d'éventuelles améliorations
};

App.afficherDonneesUtilisateur();
