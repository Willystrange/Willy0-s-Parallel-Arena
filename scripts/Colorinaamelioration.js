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
    console.log("Utilisateur authentifié avec UID :", user.uid);
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
    console.log("Aucun utilisateur authentifié");
  }
});

// --- Fonctions de statistiques pour Colorina ---
App.loadPv = function() {
  const userData = getUserData();
  const bonus = userData[`Colorina_PV_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 9600);
};

App.loadAttaque = function() {
  const userData = getUserData();
  const bonus = userData[`Colorina_attaque_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 420);
};

App.loadDefense = function() {
  const userData = getUserData();
  const bonus = userData[`Colorina_defense_pts`] || 0;
  return Math.round((1 + bonus * 0.02) * 80);
};

App.levelUp = function() {
  const userData = getUserData();
  const level = userData['Colorina_Level'];
  const xp = userData['Colorina_XP'];
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;

  if (level < 11 && xp >= xpNeeded && points >= cost) {
    userData['Colorina_Level'] += 1;
    userData['Colorina_XP'] -= xpNeeded;
    userData.Colorina_pts += 4;
    userData.argent -= cost;
    saveUserData(userData);
    App.afficherDonneesUtilisateur();
  }
};

App.afficherDonneesUtilisateur = function() {
  console.log('Données utilisateur chargées');
  const userData = getUserData();
  userData.Colorina_pts = userData.Colorina_pts || 0;
  userData.Colorina_PV_pts = userData.Colorina_PV_pts || 0;
  userData.Colorina_attaque_pts = userData.Colorina_attaque_pts || 0;
  userData.Colorina_defense_pts = userData.Colorina_defense_pts || 0;
  saveUserData(userData);
  const points = userData.argent;

  if (userData['Colorina'] === 1) {
    const level = userData['Colorina_Level'];
    const xp = userData['Colorina_XP'];
    const xpNeeded = App.xpPourNiveauSuivant(level);
    const cost = App.coutPourNiveauSuivant(level);
    const canLevelUp = xp >= xpNeeded && points >= cost;
    const pv = App.loadPv();
    const attaque = App.loadAttaque();
    const defense = App.loadDefense();

    const colorinaHTML = `
      <div id="Colorina-info" class="character-info">
        <strong>Colorina</strong><br>
        Classe: Briseur de Défense
        <span 
          id="Colorina-tooltip-icon" 
          class="tooltip-icon" 
          onclick="App.afficherDetailsPerso()"
          style="cursor: pointer; margin-left: 10px;"
        >&#x26A0;</span>
        <br>
        PV : ${pv}<br>
        Attaque : ${attaque}<br>
        Défense : ${defense}<br>
        Spécialité : Inflige 85% de son attaque et réduit la défense adverse de 15% pour 3 tours.<br>
        Rareté : rare<br>
      </div>
      Niveau: ${level}${level >= 11 ? ' (Niveau Maximum atteint !)' : ''}<br>
      ${level < 11 ? `Points d'XP: ${xp} / ${xpNeeded}<br>` : ''}
      ${level < 11 ? `Points disponibles: ${points}<br>` : ''}
      ${level < 11 ? `<div class="cost-info">Coût pour monter au niveau suivant: ${cost} points</div>` : ''}
      ${canLevelUp && level < 11 ? `<button class="level-up-button" id="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    `;

    document.getElementById('characters-unlocked').innerHTML = colorinaHTML;
    document.getElementById('Colorina-info').style.display = 'block';
  }

  console.log(userData.Colorina_pts);

  if (
    userData.Colorina_pts > 0 &&
    userData.Colorina_PV_pts < 20 &&
    userData.Colorina_attaque_pts < 30 &&
    userData.Colorina_defense_pts < 15
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
  const infoElement = document.getElementById('Colorina-info');
  infoElement.innerHTML = ''; // Réinitialiser l'affichage

  const stats = ['PV', 'attaque', 'defense'];
  stats.forEach((stat) => {
    const valeurStat =
      (userData[`Colorina_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
    let maxStat = 0;
    if (stat === 'PV') {
      maxStat = 20;
    } else if (stat === 'attaque') {
      maxStat = 30;
    } else if (stat === 'defense') {
      maxStat = 15;
    }
    const boutonPlusVisible =
      valeurStat < maxStat &&
      (userData.Colorina_pts - App.totalPointsUtilises()) > 0;

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
  let bubble = document.getElementById('Colorina-points-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'Colorina-points-bubble';
    bubble.className = 'points-bubble';
    document.body.appendChild(bubble);
  }
  bubble.textContent = `Points restants : ${userData.Colorina_pts - App.totalPointsUtilises()}`;

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
    maxStat = 20;
  } else if (stat === 'attaque') {
    maxStat = 30;
  } else if (stat === 'defense') {
    maxStat = 15;
  }
  const valeurActuelle =
    (userData[`Colorina_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);

  if (
    valeur === 1 &&
    (userData.Colorina_pts - App.totalPointsUtilises()) > 0 &&
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
    console.error("Impossible de confirmer les stats : données utilisateur introuvables.");
    return;
  }

  App.modificationsTemp.PV = App.modificationsTemp.PV || 0;
  App.modificationsTemp.attaque = App.modificationsTemp.attaque || 0;
  App.modificationsTemp.defense = App.modificationsTemp.defense || 0;
  const totalPts = App.totalPointsUtilises();

  if (totalPts > userData.Colorina_pts) {
    console.error("Erreur : points à attribuer supérieurs aux points disponibles.");
    alert("Erreur : points à attribuer supérieurs aux points disponibles.");
    return;
  }

  for (const stat of ["PV", "attaque", "defense"]) {
    userData[`Colorina_${stat}_pts`] =
      (userData[`Colorina_${stat}_pts`] || 0) + (App.modificationsTemp[stat] || 0);
  }
  userData.Colorina_pts -= totalPts;
  App.modificationsTemp = {};

  const bubble = document.getElementById('Colorina-points-bubble');
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
  alert("Briseur de Défense: Capable de réduire les défenses adverses tout en infligeant des dégâts conséquents.");
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
