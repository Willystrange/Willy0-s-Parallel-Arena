window.App = window.App || {};

App.characterName = localStorage.getItem('characterToImprove');
App.modificationsTemp = { PV: 0, attaque: 0, defense: 0 };

App.xpPourNiveauSuivant = function(level) { return level * level * 20; };
App.coutPourNiveauSuivant = function(level) { return level * 25; };

// Fonctions de calcul de stats (inchangées dans la logique, utilisées pour le prévisionnel)
App.loadPv = function(character, pts) { return Math.round((1 + pts * 0.02) * character.pv); };
App.loadAttaque = function(character, pts) { return Math.round((1 + pts * 0.02) * character.attaque); };
App.loadDefense = function(character, pts) { return Math.round((1 + pts * 0.02) * character.defense); };

// Configuration des statistiques (Max points, Labels)
App.statsConfig = [
    { id: 'PV', label: 'PV', max: 25 },
    { id: 'attaque', label: 'Attaque', max: 25 },
    { id: 'defense', label: 'Défense', max: 15 }
];

App.levelUp = function() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  App.getRecaptchaToken('character_levelup').then(recaptchaToken => {
      user.getIdToken().then(token => {
          fetch('/api/character/upgrade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ userId: user.uid, characterName: App.characterName, action: 'levelup', recaptchaToken: recaptchaToken })
          })
          .then(res => res.json())
          .then(data => {
              if (data.success) {
                  localStorage.setItem('userData', JSON.stringify(data.userData));
                  App.afficherDonneesUtilisateur();
              } else { alert(data.error || "Impossible de monter de niveau"); }
          });
      });
  });
};

App.afficherDonneesUtilisateur = function() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  const name = App.characterName;
  if (!name) { 
      // Si pas de perso sélectionné, retour stats ou menu
      window.location.href = 'perso_stats.html'; 
      return; 
  }

  // Attendre que les données JSON (personnages) soient chargées dans App.characters
  if (!App.characters || App.characters.length === 0) {
      setTimeout(App.afficherDonneesUtilisateur, 100);
      return;
  }

  const character = App.characters.find(c => c.name === name);
  if (!character) return;

  // Données de base
  const level = userData[name + '_Level'] || 1;
  const ptsDispo = userData[name + '_pts'] || 0;
  
  // Construction de l'interface
  const container = document.getElementById('characters-unlocked');
  if (!container) return;

  let html = `
    <div class="char-card">
        <div class="char-header">
            <h2>${name}</h2>
            <div class="char-badges">
                Classe: ${character.classe || 'Inconnue'} | Rareté: ${character.rarete}
            </div>
        </div>
  `;

  // --- SECTION STATISTIQUES (AVEC PREVISUALISATION) ---
  html += `<div class="stats-container">`;
  
  const ptsUtilisesTemp = App.totalPointsUtilises();
  const ptsRestants = ptsDispo - ptsUtilisesTemp;

  App.statsConfig.forEach(stat => {
      const ptsActuels = userData[name + '_' + stat.id + '_pts'] || 0;
      const ptsTemp = App.modificationsTemp[stat.id] || 0;
      const totalPts = ptsActuels + ptsTemp;
      
      // Calcul des valeurs réelles
      let valActuelle, valPrevue;
      
      if (stat.id === 'PV') {
          valActuelle = App.loadPv(character, ptsActuels);
          valPrevue = App.loadPv(character, totalPts);
      } else if (stat.id === 'attaque') {
          valActuelle = App.loadAttaque(character, ptsActuels);
          valPrevue = App.loadAttaque(character, totalPts);
      } else if (stat.id === 'defense') {
          valActuelle = App.loadDefense(character, ptsActuels);
          valPrevue = App.loadDefense(character, totalPts);
      }

      // Affichage de la valeur
      // Si on a des points temporaires, on affiche en vert la nouvelle valeur
      const displayValue = (ptsTemp > 0) 
          ? `<span class="stat-preview">${valPrevue}</span>` 
          : `<span>${valActuelle}</span>`;

      html += `
        <div class="stat-row">
            <span class="stat-name">${stat.label}</span>
            <div class="stat-value">${displayValue}</div>
            
            <div class="alloc-controls">
                ${ptsDispo > 0 ? `
                    <button class="stat-btn" 
                        onclick="App.modifierStat('${stat.id}', -1)"
                        ${ptsTemp <= 0 ? 'disabled' : ''}>
                        -
                    </button>
                    <span class="stat-progress">${totalPts} / ${stat.max}</span>
                    <button class="stat-btn" 
                        onclick="App.modifierStat('${stat.id}', 1)"
                        ${(ptsRestants <= 0 || totalPts >= stat.max) ? 'disabled' : ''}>
                        +
                    </button>
                ` : `
                   <!-- Mode Lecture Seule -->
                   <span class="stat-progress">Pts: ${ptsActuels} / ${stat.max}</span>
                `}
            </div>
        </div>
      `;
  });
  html += `</div>`; // Fin stats-container

  // --- SECTION ACTIONS (CONFIRMATION OU LEVEL UP) ---
  
  // Cas 1 : On est en train d'attribuer des points
  if (ptsDispo > 0) {
      html += `
        <div class="level-section">
            <p>Points à attribuer : <strong>${ptsRestants}</strong></p>
            ${ptsUtilisesTemp > 0 
                ? `<button class="level-btn confirm-btn" onclick="App.confirmerStats()">Confirmer les changements</button>` 
                : `<p style="font-size:0.9em; opacity:0.7;">Répartissez vos points pour valider.</p>`
            }
        </div>
      `;
  } 
  // Cas 2 : Pas de points, affichage standard Level Up
  else {
      const xp = userData[name + '_XP'] || 0;
      const xpNeeded = App.xpPourNiveauSuivant(level);
      const cost = App.coutPourNiveauSuivant(level);
      const argent = userData.argent || 0;
      const isMaxLevel = level >= 11;

      html += `
        <div class="level-section">
            <h3>Niveau ${level} ${isMaxLevel ? '(Max)' : ''}</h3>
            ${!isMaxLevel ? `
                <p>XP: ${xp} / ${xpNeeded}</p>
                <p>Pièces: ${argent}</p>
                <div class="cost-info" style="margin-bottom:10px;">Coût: ${cost} pièces</div>
            ` : ''}

            ${(!isMaxLevel && xp >= xpNeeded && argent >= cost) 
                ? `<button class="level-btn" onclick="App.levelUp()">Monter de niveau !</button>` 
                : (!isMaxLevel ? `<button class="level-btn" disabled style="background:#7f8c8d; cursor:default;">Pas assez de ressources</button>` : '')
            }
        </div>
      `;
  }

  html += `</div>`; // Fin char-card
  container.innerHTML = html;
};

App.modifierStat = function(stat, val) {
    // Vérifications de sécurité
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const name = App.characterName;
    const ptsDispoTotal = userData[name + '_pts'] || 0;
    const ptsActuelsStat = userData[name + '_' + stat + '_pts'] || 0;
    
    // Config max
    const config = App.statsConfig.find(s => s.id === stat);
    const max = config ? config.max : 25;

    const currentTemp = App.modificationsTemp[stat] || 0;
    const ptsUtilises = App.totalPointsUtilises();
    const ptsRestants = ptsDispoTotal - ptsUtilises;

    // Logique d'ajout (+)
    if (val > 0) {
        if (ptsRestants > 0 && (ptsActuelsStat + currentTemp) < max) {
            App.modificationsTemp[stat] = currentTemp + 1;
        }
    } 
    // Logique de retrait (-)
    else {
        if (currentTemp > 0) {
            App.modificationsTemp[stat] = currentTemp - 1;
        }
    }
    
    // Mise à jour immédiate de l'affichage
    App.afficherDonneesUtilisateur();
};

App.totalPointsUtilises = function() {
  return (App.modificationsTemp.PV || 0) + (App.modificationsTemp.attaque || 0) + (App.modificationsTemp.defense || 0);
};

App.confirmerStats = function() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  App.getRecaptchaToken('character_stats').then(recaptchaToken => {
      user.getIdToken().then(token => {
          fetch('/api/character/upgrade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                  userId: user.uid, 
                  characterName: App.characterName, 
                  action: 'stats', 
                  stats: App.modificationsTemp, 
                  recaptchaToken: recaptchaToken 
              })
          })
          .then(res => res.json())
          .then(data => {
              if (data.success) {
                  localStorage.setItem('userData', JSON.stringify(data.userData));
                  App.modificationsTemp = { PV: 0, attaque: 0, defense: 0 };
                  App.afficherDonneesUtilisateur();
              } else { alert(data.error || "Erreur lors de l'attribution des points"); }
          });
      });
  });
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour s'assurer que app.js a chargé les characters si nécessaire
    setTimeout(App.afficherDonneesUtilisateur, 100);
});