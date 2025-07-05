// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Démarrage de la partie ---
App.startGameIfStarted = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// --- Fonctions utilitaires pour le leveling ---
App.xpPourNiveauSuivant = function(level) {
  return level * level * 20;
};

App.coutPourNiveauSuivant = function(level) {
  return level * 25;
};

// --- Initialisation de l'authentification Firebase ---
App.initFirebaseAuth = function() {
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
};
App.initFirebaseAuth();

// --- Gestion des statistiques de Willy ---
App.loadWillyPv = function() {
  const userData = getUserData();
  const points = userData[`Willy_PV_pts`] || 0;
  return Math.round((1 + points * 0.02) * 11100);
};

App.loadWillyAttaque = function() {
  const userData = getUserData();
  const points = userData[`Willy_attaque_pts`] || 0;
  return Math.round((1 + points * 0.02) * 463);
};

App.loadWillyDefense = function() {
  const userData = getUserData();
  const points = userData[`Willy_defense_pts`] || 0;
  return Math.round((1 + points * 0.02) * 86);
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Willy_Level'];
  const xp = userData['Willy_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Willy_Level'] += 1;
    userData['Willy_XP'] -= xpNeeded;
    userData.Willy_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  userData.Willy_PV_pts = userData.Willy_PV_pts || 0;
  userData.Willy_attaque_pts = userData.Willy_attaque_pts || 0;
  userData.Willy_defense_pts = userData.Willy_defense_pts || 0;
  saveUserData(userData);

  if (userData['Willy'] === 1) {
    const level = userData['Willy_Level'];
    const xp = userData['Willy_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const points = userData.argent;
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadWillyPv();
    const attaque = App.loadWillyAttaque();
    const defense = App.loadWillyDefense();

    const willyHTML = `
      <div id="Willy-info" class="character-info">
        <strong>Willy</strong><br>
        Classe: Lame de l’Ombre
        <span id="Willy-tooltip-icon" class="tooltip-icon" onclick="App.afficherDetailsWilly()" style="cursor: pointer; margin-left: 10px;">&#x26A0;</span>
        <br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Il effectue trois attaques.<br>
        Rareté : inhabituel<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;

    document.getElementById('characters-unlocked').innerHTML = willyHTML;
    document.getElementById('Willy-info').style.display = 'block';
  }

  // Gestion de l'affichage des boutons pour modification des stats
  if (userData.Willy_pts > 0 &&
    userData.Willy_PV_pts < 25 &&
    userData.Willy_attaque_pts < 20 &&
    userData.Willy_defense_pts < 20) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

// --- Gestion des modifications temporaires des stats ---
App.modificationsTemp = {};

App.afficherBoutonsStats = function(userData) {
  const willyInfoElem = document.getElementById('Willy-info');
  willyInfoElem.innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach((stat) => {
    const valeurStat = (userData[`Willy_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    const maxStat = stat === 'PV' ? 25 : 20;
    const affichageBoutonPlus = valeurStat < maxStat && (userData.Willy_pts - App.totalPointsUtilises()) > 0;
    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    willyInfoElem.appendChild(statElement);
  });

  let bubble = document.getElementById('Willy-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Willy-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Willy_pts - App.totalPointsUtilises()}`;

  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  willyInfoElem.appendChild(confirmerButton);
};

App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;
  const maxStat = stat === 'PV' ? 25 : 20;
  const valeurActuelle = (userData[`Willy_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  if (valeur === 1 && (userData.Willy_pts - App.totalPointsUtilises()) > 0 && valeurActuelle < maxStat) {
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
  if (totalPts > userData.Willy_pts) {
    alerte("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Willy_${stat}_pts`] = (userData[`Willy_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Willy_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Willy-points-bubble');
  if (bubble) {
    bubble.remove();
  }
  try {
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  } catch (error) {
  }
};

App.afficherDetailsWilly = function() {
  alert("Lame de l’Ombre : Combattant polyvalent et stratégique, équilibré dans toutes ses statistiques.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach((bouton) => {
    bouton.disabled = desactiver;
  });
};

// --- Fonctions de navigation (format SPA) ---
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
App.afficherDonneesUtilisateur();
