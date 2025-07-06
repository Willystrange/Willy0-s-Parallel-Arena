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

// --- Gestion des statistiques du personnage "Oiseau" ---
App.loadPv = function() {
  const userData = getUserData();
  // Récupérer la valeur de stat dynamique
  const pts = userData[`Oiseau_PV_pts`] || 0;
  return Math.round((1 + pts * 0.02) * 9800);
};

App.loadAttaque = function() {
  const userData = getUserData();
  const pts = userData[`Oiseau_attaque_pts`] || 0;
  return Math.round((1 + pts * 0.02) * 510);
};

App.loadDefense = function() {
  const userData = getUserData();
  const pts = userData[`Oiseau_defense_pts`] || 0;
  return Math.round((1 + pts * 0.02) * 85);
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Oiseau_Level'];
  const xp = userData['Oiseau_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Oiseau_Level'] += 1;
    userData['Oiseau_XP'] -= xpNeeded;
    userData.Oiseau_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  // Initialisation des valeurs si absentes
  userData.Oiseau_pts = userData.Oiseau_pts || 0;
  userData.Oiseau_PV_pts = userData.Oiseau_PV_pts || 0;
  userData.Oiseau_attaque_pts = userData.Oiseau_attaque_pts || 0;
  userData.Oiseau_defense_pts = userData.Oiseau_defense_pts || 0;
  saveUserData(userData);

  if (userData['Oiseau'] === 1) {
    const level = userData['Oiseau_Level'];
    const xp = userData['Oiseau_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const points = userData.argent;
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    // Vous pouvez adapter les identifiants HTML (ici "Oiseau-info")
    const persoHTML = `
      <div id="Oiseau-info" class="character-info">
        <strong>Oiseau</strong><br>
        Classe: Assassin Sauvage
        <span id="Oiseau-tooltip-icon" class="tooltip-icon" onclick="App.afficherDetailsPerso()" style="cursor: pointer; margin-left: 10px;">&#x26A0;</span><br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Inflige 2.5x son attaque et gagne 20 défense pour 2 tours.<br>
        Rareté : rare
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;

    document.getElementById('characters-unlocked').innerHTML = persoHTML;
    document.getElementById('Oiseau-info').style.display = 'block';
  }

  

  if (userData.Oiseau_pts > 0 &&
      userData.Oiseau_PV_pts < 25 &&
      userData.Oiseau_attaque_pts < 30 &&
      userData.Oiseau_defense_pts < 10) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

// --- Gestion des modifications temporaires des stats ---
App.modificationsTemp = {};

App.afficherBoutonsStats = function(userData) {
  // Utilisation de l'élément "Oiseau-info" pour afficher les boutons de modification
  const infoElem = document.getElementById('Oiseau-info');
  infoElem.innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach(stat => {
    let maxStat = 0;
    if (stat === 'PV') {
      maxStat = 25;
    } else if (stat === 'attaque') {
      maxStat = 30;
    } else if (stat === 'defense') {
      maxStat = 20;
    }
    const valeurStat = (userData[`Oiseau_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    const affichageBoutonPlus = valeurStat < maxStat && (userData.Oiseau_pts - App.totalPointsUtilises()) > 0;
    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    infoElem.appendChild(statElement);
  });

  let bubble = document.getElementById('Oiseau-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Oiseau-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Oiseau_pts - App.totalPointsUtilises()}`;

  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  infoElem.appendChild(confirmerButton);
};

App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;
  let maxStat = 0;
  if (stat === 'PV') {
    maxStat = 25;
  } else if (stat === 'attaque') {
    maxStat = 30;
  } else if (stat === 'defense') {
    maxStat = 20;
  }
  const valeurActuelle = (userData[`Oiseau_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  if (valeur === 1 && (userData.Oiseau_pts - App.totalPointsUtilises()) > 0 && valeurActuelle < maxStat) {
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
  if (totalPts > userData.Oiseau_pts) {
    alerte("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Oiseau_${stat}_pts`] = (userData[`Oiseau_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Oiseau_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Oiseau-points-bubble');
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
  alert("Assassin Sauvage: expert en attaques rapides, inflige de gros dégâts en chaîne tout en compensant sa défense par des effets bonus activés au fil des frappes.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach(bouton => {
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

// --- Initialisation finale ---
App.afficherDonneesUtilisateur();