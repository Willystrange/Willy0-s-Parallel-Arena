// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion du démarrage de la partie ---
App.startGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGame();

// --- Fonctions de calcul pour l'expérience et le coût ---
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
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
  }
});

// --- Fonctions de statistiques pour Coeur ---
App.loadPv = function() {
  const userData = getUserData();
  const bonus = userData[`Coeur_PV_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 10000);
};

App.loadAttaque = function() {
  const userData = getUserData();
  const bonus = userData[`Coeur_attaque_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 450);
};

App.loadDefense = function() {
  const userData = getUserData();
  const bonus = userData[`Coeur_defense_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 100);
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Coeur_Level'];
  const xp = userData['Coeur_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Coeur_Level'] += 1;
    userData['Coeur_XP'] -= xpNeeded;
    userData.Coeur_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  userData.Coeur_pts = userData.Coeur_pts || 0;
  userData.Coeur_PV_pts = userData.Coeur_PV_pts || 0;
  userData.Coeur_attaque_pts = userData.Coeur_attaque_pts || 0;
  userData.Coeur_defense_pts = userData.Coeur_defense_pts || 0;
  saveUserData(userData);
  const points = userData.argent;

  if (userData['Coeur'] === 1) {
    const level = userData['Coeur_Level'];
    const xp = userData['Coeur_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const coeurHTML = `
      <div id="Coeur-info" class="character-info">
        <strong>Coeur</strong><br>
        Classe: Soigneur d'Élite
        <span 
          id="Coeur-tooltip-icon" 
          class="tooltip-icon" 
          onclick="App.afficherDetailsPerso()"
          style="cursor: pointer; margin-left: 10px;"
        >&#x26A0;</span>
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

    document.getElementById('characters-unlocked').innerHTML = coeurHTML;
    document.getElementById('Coeur-info').style.display = 'block';
  }

  

  if (
    userData.Coeur_pts > 0 &&
    userData.Coeur_PV_pts < 30 &&
    userData.Coeur_attaque_pts < 10 &&
    userData.Coeur_defense_pts < 20
  ) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

// Déclaration de modificationsTemp dans App
App.modificationsTemp = {};

// --- Gestion des boutons de modification de stats ---
App.afficherBoutonsStats = function(userData) {
  const infoElement = document.getElementById('Coeur-info');
  infoElement.innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach((stat) => {
    const valeurStat =
      (userData[`Coeur_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = 0;
    if (stat === 'PV') {
      maxStat = 30;
    } else if (stat === 'attaque') {
      maxStat = 10;
    } else if (stat === 'defense') {
      maxStat = 20;
    }
    const boutonPlusVisible =
      valeurStat < maxStat &&
      (userData.Coeur_pts - App.totalPointsUtilises()) > 0;

    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${
        boutonPlusVisible
          ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>`
          : ''
      }
      ${
        (App.modificationsTemp[stat] || 0) > 0
          ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>`
          : ''
      }
    `;
    infoElement.appendChild(statElement);
  });

  // Bulle indiquant les points restants
  let bubble = document.getElementById('Coeur-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Coeur-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Coeur_pts - App.totalPointsUtilises()}`;

  // Bouton "Confirmer"
  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  infoElement.appendChild(confirmerButton);
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
  const valeurActuelle =
    (userData[`Coeur_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (
    valeur === 1 &&
    (userData.Coeur_pts - App.totalPointsUtilises()) > 0 &&
    valeurActuelle < maxStat
  ) {
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

  if (totalPts > userData.Coeur_pts) {
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Coeur_${stat}_pts`] =
      (userData[`Coeur_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Coeur_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Coeur-points-bubble');
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
  alert("Soigneur d’Élite: Combine des capacités de soin et une bonne défense pour maintenir l’équipe en vie.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach(bouton => {
    bouton.disabled = desactiver;
  });
};

// --- Navigation SPA ---
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

// --- Initialisation des données utilisateur ---
App.afficherDonneesUtilisateur();
