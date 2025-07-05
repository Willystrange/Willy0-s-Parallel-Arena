// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion de la navigation et démarrage de la partie ---
App.startGameIfStarted = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// --- Fonctions utilitaires internes ---
App.xpPourNiveauSuivant = function(level) {
  return level * level * 20;
};

App.coutPourNiveauSuivant = function(level) {
  return level * 25;
};

// --- Gestion de l'authentification Firebase ---
App.User = false;
App.userId = null;

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
  }
});

// --- Calculs des statistiques et montée de niveau ---
App.loadPv = function() {
  const userData = getUserData();
  const persoPts = userData['Cocobi_PV_pts'] || 0;
  return Math.round((1 + persoPts * 0.02) * 11000);
};

App.loadAttaque = function() {
  const userData = getUserData();
  const persoPts = userData['Cocobi_attaque_pts'] || 0;
  return Math.round((1 + persoPts * 0.02) * 440);
};

App.loadDefense = function() {
  const userData = getUserData();
  const persoPts = userData['Cocobi_defense_pts'] || 0;
  return Math.round((1 + persoPts * 0.02) * 115);
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Cocobi_Level'];
  const xp = userData['Cocobi_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Cocobi_Level'] += 1;
    userData['Cocobi_XP'] -= xpNeeded;
    userData.Cocobi_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

// --- Affichage des données utilisateur et gestion des stats ---
App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  userData.Cocobi_pts = userData.Cocobi_pts || 0;
  userData.Cocobi_PV_pts = userData.Cocobi_PV_pts || 0;
  userData.Cocobi_attaque_pts = userData.Cocobi_attaque_pts || 0;
  userData.Cocobi_defense_pts = userData.Cocobi_defense_pts || 0;
  saveUserData(userData);

  if (userData['Cocobi'] === 1) {
    const level = userData['Cocobi_Level'];
    const xp = userData['Cocobi_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && (userData.argent || 0) >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const willyHTML = `
      <div id="Willy-info" class="character-info">
        <strong>Cocobi</strong><br>
        Classe: Briseur de défense
        <span id="Willy-tooltip-icon" class="tooltip-icon" onclick="App.afficherDetailsPerso()" style="cursor: pointer; margin-left: 10px;">&#x26A0;</span><br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Réduit les PV adverses de 12% de ses PV max.<br>
        Rareté : rare<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${userData.argent || 0}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;
    document.getElementById('characters-unlocked').innerHTML = willyHTML;
    document.getElementById('Willy-info').style.display = 'block';
  }

  if (
    userData.Cocobi_pts > 0 &&
    userData.Cocobi_PV_pts < 20 &&
    userData.Cocobi_attaque_pts < 30 &&
    userData.Cocobi_defense_pts < 15
  ) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

// --- Initialisation de App.modificationsTemp ---
App.modificationsTemp = {};

// --- Affichage des boutons d'attribution de stats ---
App.afficherBoutonsStats = function(userData) {
  document.getElementById('Willy-info').innerHTML = '';
  const stats = ['PV', 'attaque', 'defense'];

  stats.forEach((stat) => {
    const valeurStat = (userData[`Cocobi_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = 0;
    if (stat === 'PV') maxStat = 20;
    else if (stat === 'attaque') maxStat = 30;
    else if (stat === 'defense') maxStat = 15;

    const affichageBoutonPlus = valeurStat < maxStat && (userData.Cocobi_pts - App.totalPointsUtilises()) > 0;
    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    document.getElementById('Willy-info').appendChild(statElement);
  });

  let bubble = document.getElementById('Willy-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Willy-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Cocobi_pts - App.totalPointsUtilises()}`;

  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  document.getElementById('Willy-info').appendChild(confirmerButton);
};

// --- Modification des stats provisoires ---
App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;
  let maxStat = 0;
  if (stat === 'PV') maxStat = 20;
  else if (stat === 'attaque') maxStat = 30;
  else if (stat === 'defense') maxStat = 15;
  const valeurActuelle = (userData[`Cocobi_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (valeur === 1 && (userData.Cocobi_pts - App.totalPointsUtilises()) > 0 && valeurActuelle < maxStat) {
    App.modificationsTemp[stat] = (App.modificationsTemp[stat] || 0) + 1;
  } else if (valeur === -1 && (App.modificationsTemp[stat] || 0) > 0) {
    App.modificationsTemp[stat]--;
  }
  App.afficherBoutonsStats(userData);
};

// --- Calcul du total des points utilisés ---
App.totalPointsUtilises = function() {
  return Object.values(App.modificationsTemp).reduce((sum, val) => sum + (val || 0), 0);
};

// --- Confirmation et sauvegarde des stats ---
App.confirmerStats = function() {
  const userData = getUserData();
  if (!userData) {
    return;
  }

  App.modificationsTemp.PV = App.modificationsTemp.PV || 0;
  App.modificationsTemp.attaque = App.modificationsTemp.attaque || 0;
  App.modificationsTemp.defense = App.modificationsTemp.defense || 0;

  const totalPts = App.totalPointsUtilises();
  if (totalPts > userData.Cocobi_pts) {
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Cocobi_${stat}_pts`] = (userData[`Cocobi_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Cocobi_pts -= totalPts;

  // Réinitialisation des modifs temporaires
  App.modificationsTemp = {};

  const bubble = document.getElementById('Willy-points-bubble');
  if (bubble) bubble.remove();

  try {
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  } catch (error) {
  }
};

// --- Détail du personnage ---
App.afficherDetailsPerso = function() {
  alert("Briseur de Défense: Capable de réduire les défenses adverses tout en infligeant des dégâts conséquents.");
};

// --- Activation/désactivation des boutons de navigation ---
App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach(bouton => bouton.disabled = desactiver);
};

// --- Fonctions de navigation (SPA) ---
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
  loadPage('amelioration');
};

// --- Initialisation finale ---
App.afficherDonneesUtilisateur();
