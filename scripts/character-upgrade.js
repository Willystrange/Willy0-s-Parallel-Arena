window.App = window.App || {};

App.characterName = localStorage.getItem('characterToImprove');
App.modificationsTemp = { PV: 0, attaque: 0, defense: 0 };

App.xpPourNiveauSuivant = function(level) { return level * level * 20; };
App.coutPourNiveauSuivant = function(level) { return level * 25; };

// Fonctions de calcul (identiques)
App.loadPv = function(character, pts) { return Math.round((1 + pts * 0.02) * character.pv); };
App.loadAttaque = function(character, pts) { return Math.round((1 + pts * 0.02) * character.attaque); };
App.loadDefense = function(character, pts) { return Math.round((1 + pts * 0.02) * character.defense); };

App.statsConfig = [
    { id: 'PV', label: 'PV', max: 25 },
    { id: 'attaque', label: 'Attaque', max: 25 },
    { id: 'defense', label: 'Défense', max: 15 }
];

// Gestion des requêtes serveur (Level Up / Stats)
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

// --- CORE DISPLAY LOGIC ---

App.afficherDonneesUtilisateur = function() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  const name = App.characterName;
  if (!name) { window.location.href = 'perso_stats.html'; return; }

  if (!App.characters || App.characters.length === 0) {
      setTimeout(App.afficherDonneesUtilisateur, 100);
      return;
  }

  const character = App.characters.find(c => c.name === name);
  if (!character) return;

  const level = userData[name + '_Level'] || 1;
  const ptsDispoTotal = userData[name + '_pts'] || 0;
  const ptsUtilisesTemp = App.totalPointsUtilises();
  const ptsRestants = ptsDispoTotal - ptsUtilisesTemp;
  const xp = userData[name + '_XP'] || 0;
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const argent = userData.argent || 0;
  const isMaxLevel = level >= 11;

  // 1. Update Floating Points Bubble
  const bubble = document.getElementById('points-bubble');
  if (bubble) {
      if (ptsRestants > 0) {
          bubble.style.display = 'block';
          bubble.textContent = `Points dispo: ${ptsRestants}`;
      } else {
          bubble.style.display = 'none';
      }
  }

  // 2. Build Card HTML
  const container = document.getElementById('characters-unlocked');
  if (!container) return;

  let html = `
    <div class="character-card">
        <div class="character-header">
            <h2>${name}</h2>
            <div class="character-subtitle">
                Niveau ${level} ${isMaxLevel ? '(Max)' : ''} | ${character.classe || 'Inconnu'} | ${character.rarete}
            </div>
        </div>
  `;

  // STATS ROWS
  html += `<div class="stats-list">`;
  
  App.statsConfig.forEach(stat => {
      const ptsActuels = userData[name + '_' + stat.id + '_pts'] || 0;
      const ptsTemp = App.modificationsTemp[stat.id] || 0;
      const totalPts = ptsActuels + ptsTemp;

      // Valeurs
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

      const displayValue = (ptsTemp > 0) 
          ? `<span class="stat-val preview">${valPrevue}</span>` 
          : `<span class="stat-val">${valActuelle}</span>`;

      html += `
        <div class="stat-row">
            <div class="stat-info">
                <span class="stat-label">${stat.label}</span>
                ${displayValue}
            </div>
            
            <div class="stat-controls">
                <!-- Mode "Attribution" -->
                ${ptsDispoTotal > 0 ? `
                    <button class="stat-btn" 
                        onclick="App.modifierStat('${stat.id}', -1)"
                        ${ptsTemp <= 0 ? 'disabled' : ''}>-</button>
                    
                    <span style="font-size:0.9em; opacity:0.8; min-width:45px; text-align:center;">
                        ${totalPts}/${stat.max}
                    </span>

                    <button class="stat-btn" 
                        onclick="App.modifierStat('${stat.id}', 1)"
                        ${(ptsRestants <= 0 || totalPts >= stat.max) ? 'disabled' : ''}>+</button>
                ` : `
                    <!-- Mode "Lecture" -->
                    <span style="font-size:0.9em; opacity:0.6;">
                        ${ptsActuels} / ${stat.max}
                    </span>
                `}
            </div>
        </div>
      `;
  });
  html += `</div>`; // End stats-list

  // ACTIONS FOOTER (LEVEL UP / CONFIRM)
  if (ptsDispoTotal > 0) {
      if (ptsUtilisesTemp > 0) {
          html += `<button class="confirm-button" onclick="App.confirmerStats()">Valider les stats</button>`;
      } else {
          html += `<div style="margin-top:15px; color:#7f8c8d; font-size:0.9em;">Attribuez vos points pour valider.</div>`;
      }
  } else if (!isMaxLevel) {
      // Level Up Check
      const canLevelUp = (xp >= xpNeeded && argent >= cost);
      
      html += `
        <div style="margin-top:20px; border-top:1px solid #eee; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9em;">
                <span>XP: ${xp} / ${xpNeeded}</span>
                <span>Or: ${argent} / ${cost}</span>
            </div>
            <button class="level-up-button" 
                onclick="App.levelUp()" 
                ${canLevelUp ? '' : 'disabled style="background:#bdc3c7; cursor:default;"'}>
                ${canLevelUp ? 'Niveau Supérieur' : 'Ressources insuffisantes'}
            </button>
        </div>
      `;
  }

  html += `</div>`; // End character-card
  container.innerHTML = html;
};

App.modifierStat = function(stat, val) {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const name = App.characterName;
    const ptsDispoTotal = userData[name + '_pts'] || 0;
    const ptsActuelsStat = userData[name + '_' + stat + '_pts'] || 0;
    
    const config = App.statsConfig.find(s => s.id === stat);
    const max = config ? config.max : 25;
    const currentTemp = App.modificationsTemp[stat] || 0;
    const ptsUtilises = App.totalPointsUtilises();
    const ptsRestants = ptsDispoTotal - ptsUtilises;

    if (val > 0) {
        if (ptsRestants > 0 && (ptsActuelsStat + currentTemp) < max) {
            App.modificationsTemp[stat] = currentTemp + 1;
        }
    } else {
        if (currentTemp > 0) {
            App.modificationsTemp[stat] = currentTemp - 1;
        }
    }
    App.afficherDonneesUtilisateur();
};

App.totalPointsUtilises = function() {
  return (App.modificationsTemp.PV || 0) + (App.modificationsTemp.attaque || 0) + (App.modificationsTemp.defense || 0);
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(App.afficherDonneesUtilisateur, 100);
});
