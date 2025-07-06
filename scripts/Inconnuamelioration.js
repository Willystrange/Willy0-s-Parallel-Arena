// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion de la navigation et démarrage de la partie ---
App.startGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGame();

// --- Fonctions de calcul ---
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

// --- Fonctions de statistiques ---
App.loadPv = function() {
  const userData = getUserData();
  const Perso = userData[`Inconnu_PV_pts`] || 0;
  let persopv = Math.round((1 + Perso * 0.02) * 11300);
  return persopv;
};

App.loadAttaque = function() {
  const userData = getUserData();
  const perso = userData[`Inconnu_attaque_pts`] || 0;
  let persoattaque = Math.round((1 + perso * 0.02) * 435);
  return persoattaque;
};

App.loadDefense = function() {
  const userData = getUserData();
  const perso = userData[`Inconnu_defense_pts`] || 0;
  let persodefense = Math.round((1 + perso * 0.02) * 83);
  return persodefense;
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Inconnu_Level'];
  const xp = userData['Inconnu_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Inconnu_Level'] += 1;
    userData['Inconnu_XP'] -= xpNeeded;
    userData.Inconnu_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);

    App.afficherDonneesUtilisateur();
  }
};

App.afficherDonneesUtilisateur = function() {
  const userData = getUserData();
  userData.Inconnu_pts = userData.Inconnu_pts || 0;
  userData.Inconnu_PV_pts = userData.Inconnu_PV_pts || 0;
  userData.Inconnu_attaque_pts = userData.Inconnu_attaque_pts || 0;
  userData.Inconnu_defense_pts = userData.Inconnu_defense_pts || 0;
  saveUserData(userData);

  const points = userData.argent;

  if (userData['Inconnu'] === 1) {
    const level = userData['Inconnu_Level'];
    const xp = userData['Inconnu_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const inconnuHTML = `
      <div id="Inconnu-info" class="character-info">
        <strong>Inconnu</strong><br>
        Classe: Maître des Arcanes
        <span 
          id="Inconnu-tooltip-icon" 
          class="tooltip-icon" 
          onclick="App.afficherDetailsPerso()"
          style="cursor: pointer; margin-left: 10px;"
        >&#x26A0;</span>
        <br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Bloque la capacité adverse pour 3 tours et gagne +25 attaque et défense.<br>
        Rareté : rare<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
      `;

    document.getElementById('characters-unlocked').innerHTML = inconnuHTML;
    document.getElementById('Inconnu-info').style.display = 'block';
  }

  if (userData.Inconnu_pts > 0 && userData.Inconnu_PV_pts < 25 && userData.Inconnu_attaque_pts < 25 && userData.Inconnu_defense_pts < 15) {
    App.afficherBoutonsStats(userData);
    App.desactiverBoutons(true);
  } else {
    App.desactiverBoutons(false);
  }
};

App.modificationsTemp = {}; // Objet pour stocker les modifications temporaires

App.afficherBoutonsStats = function(userData) {
  const infoContainer = document.getElementById('Inconnu-info');
  infoContainer.innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];

  stats.forEach((stat) => {
    const valeurStat = (userData[`Inconnu_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = (stat === 'defense') ? 15 : 25;
    const affichageBoutonPlus = valeurStat < maxStat && (userData.Inconnu_pts - App.totalPointsUtilises()) > 0;

    const statElement = document.createElement('div');
    statElement.innerHTML = `
      <span>${stat} : ${valeurStat}</span>
      ${affichageBoutonPlus ? `<button class="stat-button" onclick="App.modifierStat('${stat}', 1)">+</button>` : ''}
      ${(App.modificationsTemp[stat] || 0) > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat}', -1)">-</button>` : ''}
    `;
    infoContainer.appendChild(statElement);
  });

  // Bulle des points restants
  let bubble = document.getElementById('Inconnu-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Inconnu-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Inconnu_pts - App.totalPointsUtilises()}`;

  // Bouton "Confirmer"
  const confirmerButton = document.createElement('button');
  confirmerButton.textContent = 'Confirmer';
  confirmerButton.className = 'stat-button confirm-button';
  confirmerButton.onclick = App.confirmerStats;
  infoContainer.appendChild(confirmerButton);
};

App.modifierStat = function(stat, valeur) {
  const userData = getUserData();
  if (!userData) return;
  let maxStat = (stat === 'defense') ? 15 : 25;
  const valeurActuelle = (userData[`Inconnu_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (valeur === 1 && (userData.Inconnu_pts - App.totalPointsUtilises()) > 0 && valeurActuelle < maxStat) {
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

  if (totalPts > userData.Inconnu_pts) {
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Inconnu_${stat}_pts`] = (userData[`Inconnu_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }

  userData.Inconnu_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Inconnu-points-bubble');
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
  alert("Maître des Arcanes: Spécialiste des capacités spéciales, il perturbe les adversaires tout en restant équilibré.");
};

App.desactiverBoutons = function(desactiver) {
  const boutons = document.querySelectorAll('.footer-icon');
  boutons.forEach((bouton) => {
    bouton.disabled = desactiver;
  });
};

// --- Fonctions de navigation SPA ---
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