window.App = window.App || {};

App.characterName = localStorage.getItem('characterToImprove');
App.modificationsTemp = { PV: 0, attaque: 0, defense: 0 };

App.xpPourNiveauSuivant = function(level) { return level * level * 20; };
App.coutPourNiveauSuivant = function(level) { return level * 25; };
App.loadPv = function(character, pts) { return Math.round((1 + pts * 0.02) * character.pv); };
App.loadAttaque = function(character, pts) { return Math.round((1 + pts * 0.02) * character.attaque); };
App.loadDefense = function(character, pts) { return Math.round((1 + pts * 0.02) * character.defense); };

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
  if (!name) { window.location.href = 'perso_stats.html'; return; }

  if (!App.characters || App.characters.length === 0) {
      setTimeout(App.afficherDonneesUtilisateur, 100);
      return;
  }

  const character = App.characters.find(c => c.name === name);
  if (!character) return;

  const level = userData[name + '_Level'] || 1;
  const ptsDispo = userData[name + '_pts'] || 0;
  const ptsUtilises = App.totalPointsUtilises();
  const ptsRestants = ptsDispo - ptsUtilises;
  
  const container = document.getElementById('characters-unlocked');
  if (!container) return;

  // Construction du HTML "Base mais Propre"
  let html = `
    <div class="character-info" style="display:block; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px;">
      <h2 style="margin-top:0;">${name}</h2>
      <p style="opacity:0.8;">Classe: ${character.classe || 'Inconnue'} | Rareté: ${character.rarete}</p>
      
      <div style="margin: 20px 0;">
  `;

  App.statsConfig.forEach(stat => {
      const ptsActuels = userData[name + '_' + stat.id + '_pts'] || 0;
      const temp = App.modificationsTemp[stat.id] || 0;
      const totalPts = ptsActuels + temp;
      
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

      const diff = valPrevue - valActuelle;
      const color = diff > 0 ? '#2ecc71' : 'inherit';

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;">
            <div style="flex: 1;">
                <strong>${stat.label}</strong>: 
                <span style="font-size: 1.2em; color: ${color}">${valPrevue}</span>
                ${diff > 0 ? `<small style="color:#2ecc71; margin-left:5px;">(+${diff})</small>` : ''}
                <div style="font-size: 0.8em; opacity: 0.6;">Points: ${totalPts} / ${stat.max}</div>
            </div>
            ${ptsDispo > 0 ? `
                <div style="display: flex; gap: 10px;">
                    <button style="width: 30px; height: 30px; border-radius: 50%; border: none; background: #e74c3c; color: white; cursor: pointer;" 
                            onclick="App.modifierStat('${stat.id}', -1)" ${temp <= 0 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>-</button>
                    <button style="width: 30px; height: 30px; border-radius: 50%; border: none; background: #2ecc71; color: white; cursor: pointer;" 
                            onclick="App.modifierStat('${stat.id}', 1)" ${(ptsRestants <= 0 || totalPts >= stat.max) ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>+</button>
                </div>
            ` : ''}
        </div>
      `;
  });

  html += `</div>`;

  // Section Actions
  if (ptsDispo > 0) {
      html += `
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p>Points à attribuer : <strong>${ptsRestants}</strong></p>
            ${ptsUtilises > 0 ? `
                <button onclick="App.confirmerStats()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Confirmer les points
                </button>
            ` : ''}
        </div>
      `;
  } else {
      const xp = userData[name + '_XP'] || 0;
      const xpNeeded = App.xpPourNiveauSuivant(level);
      const cost = App.coutPourNiveauSuivant(level);
      const points = userData.argent || 0;
      const isMaxLevel = level >= 11;

      html += `
        <div class="level-info" style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p>Niveau: ${level}${isMaxLevel ? ' (Maximum !)' : ''}</p>
            ${!isMaxLevel ? `
                <p>XP: ${xp} / ${xpNeeded}</p>
                <p>Pièces: ${points}</p>
                <p style="font-size: 0.9em; opacity: 0.8;">Coût passage niveau: ${cost} pièces</p>
                ${(xp >= xpNeeded && points >= cost) ? `
                    <button class="level-up-button" onclick="App.levelUp()" style="padding: 10px 20px; background: #2ecc71; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        Monter de niveau
                    </button>
                ` : `<button disabled style="padding: 10px 20px; background: #7f8c8d; color: white; border: none; border-radius: 5px; opacity: 0.5;">Ressources insuffisantes</button>`}
            ` : ''}
        </div>
      `;
  }

  html += `</div>`;
  container.innerHTML = html;
};

App.modifierStat = function(stat, val) {
    App.modificationsTemp[stat] = (App.modificationsTemp[stat] || 0) + val;
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
              body: JSON.stringify({ userId: user.uid, characterName: App.characterName, action: 'stats', stats: App.modificationsTemp, recaptchaToken: recaptchaToken })
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
setTimeout(App.afficherDonneesUtilisateur, 100);
App.afficherDonneesUtilisateur();