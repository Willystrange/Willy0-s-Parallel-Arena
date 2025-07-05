// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion de la navigation et démarrage de la partie ---
App.startGameIfStarted = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    // Navigation vers la page de combat (format SPA)
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// --- Fonctions de calcul ---
App.xpPourNiveauSuivant = function(level) {
  return level * level * 20;
};

App.coutPourNiveauSuivant = function(level) {
  return level * 25;
};

// --- Variables globales utilisateur ---
App.User = false;
App.userId = null;

// Gestion de l'authentification Firebase
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else { 
  }
});

// --- Fonctions de calcul des statistiques ---
App.loadPv = function() {
  const userData = getUserData();
  // Utilisation dynamique de la stat pour Baleine
  const Perso = userData[`Baleine_PV_pts`] || 0;
  let persopv = Math.round((1 + Perso * 0.02) * 10200);
  return persopv;
};

App.loadAttaque = function() {
  const userData = getUserData();
  const perso = userData[`Baleine_attaque_pts`] || 0;
  let persoattaque = Math.round((1 + perso * 0.02) * 435);
  return persoattaque;
};

App.loadDefense = function() {
  const userData = getUserData();
  const perso = userData[`Baleine_defense_pts`] || 0;
  let persodefense = Math.round((1 + perso * 0.02) * 105);
  return persodefense;
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Baleine_Level'];
  const xp = userData['Baleine_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Baleine_Level'] += 1;
    userData['Baleine_XP'] -= xpNeeded;
    userData.Baleine_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

// --- Gestion de l'affichage des statistiques ---
App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  // Initialiser les statistiques si elles sont absentes
  userData.Baleine_pts = userData.Baleine_pts || 0;
  userData.Baleine_PV_pts = userData.Baleine_PV_pts || 0;
  userData.Baleine_attaque_pts = userData.Baleine_attaque_pts || 0;
  userData.Baleine_defense_pts = userData.Baleine_defense_pts || 0;
  saveUserData(userData);

  const PersoPoints = userData.Baleine_pts || 0;
  const points = userData.argent;

  if (userData['Baleine'] === 1) {
    const level = userData['Baleine_Level'];
    const xp = userData['Baleine_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const baleineHTML = `
      <div id="Baleine-info" class="character-info">
        <strong>Baleine</strong><br>
        Classe: Gardien Résolu
        <span 
          id="Baleine-tooltip-icon" 
          class="tooltip-icon" 
          onclick="App.afficherDetailsPerso()"
          style="cursor: pointer; margin-left: 10px;"
        >&#x26A0;</span>
        <br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Si défense ≥ 29, perd 15 défense, gagne 1000 PV, puis attaque.<br>
        Rareté : rare<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;

    document.getElementById('characters-unlocked').innerHTML = baleineHTML;
    document.getElementById('Baleine-info').style.display = 'block';
  }

  

  if (userData.Baleine_pts > 0 && userData.Baleine_PV_pts < 20 && userData.Baleine_attaque_pts < 10 && userData.Baleine_defense_pts < 30) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

App.modificationsTemp = {}; // Stockage des modifications temporaires

App.afficherBoutonsStats = function(userData) {
  // Réinitialiser l'affichage
  document.getElementById('Baleine-info').innerHTML = '';

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach((stat) => {
    const valeurStat = (userData[`Baleine_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = 0;
    if (stat === 'PV') {
      maxStat = 20;
    } else if (stat === 'attaque') {
      maxStat = 10;
    } else if (stat === 'defense') {
      maxStat = 30;
    }
    // Vérifier si un bouton "+" doit être affiché
    const affichageBoutonPlus = valeurStat < maxStat && (userData.Baleine_pts - App.totalPointsUtilises()) > 0;

    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    document.getElementById('Baleine-info').appendChild(statElement);
  });

  // Bulle des points restants
  let bubble = document.getElementById('Baleine-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Baleine-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Baleine_pts - App.totalPointsUtilises()}`;

  // Bouton "Confirmer"
  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  document.getElementById('Baleine-info').appendChild(confirmerButton);
};

App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;

  let maxStat = 0;
  if (stat === 'PV') {
    maxStat = 20;
  } else if (stat === 'attaque') {
    maxStat = 10;
  } else if (stat === 'defense') {
    maxStat = 30;
  }
  const valeurActuelle = (userData[`Baleine_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (valeur === 1 && (userData.Baleine_pts - App.totalPointsUtilises()) > 0 && valeurActuelle < maxStat) {
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
    return;
  }
  App.modificationsTemp.PV = App.modificationsTemp.PV || 0;
  App.modificationsTemp.attaque = App.modificationsTemp.attaque || 0;
  App.modificationsTemp.defense = App.modificationsTemp.defense || 0;

  const totalPts = App.totalPointsUtilises();

  if (totalPts > userData.Baleine_pts) {
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  // Appliquer les modifications
  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Baleine_${stat}_pts`] = (userData[`Baleine_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Baleine_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Baleine-points-bubble');
  if (bubble) {
    bubble.remove();
  }

  try {
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  } catch (error) {
  }
};

App.afficherDetailsPerso = function() {
  alert("Gardien Résolu: Défense solide et stats équilibrées, parfait pour résister dans des batailles prolongées.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach(bouton => {
    bouton.disabled = desactiver;
  });
};

// --- Fonctions de navigation pour les autres pages ---
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
  // Fonction placeholder pour d'éventuelles améliorations
};

// --- Initialisation au chargement du DOM ---
  // Afficher automatiquement les données utilisateur
  App.afficherDonneesUtilisateur();