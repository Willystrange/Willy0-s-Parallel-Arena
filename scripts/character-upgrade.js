window.App = window.App || {};

App.characterName = localStorage.getItem('characterToImprove');
App.modificationsTemp = { PV: 0, attaque: 0, defense: 0 };

App.xpPourNiveauSuivant = function(level) { return level * level * 20; };
App.coutPourNiveauSuivant = function(level) { return level * 25; };
App.loadPv = function(character, pts) { return Math.round((1 + pts * 0.02) * character.pv); };
App.loadAttaque = function(character, pts) { return Math.round((1 + pts * 0.02) * character.attaque); };
App.loadDefense = function(character, pts) { return Math.round((1 + pts * 0.02) * character.defense); };

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
  if (!name) { loadPage('perso_stats'); return; }

  if (!App.characters || App.characters.length === 0) {
      setTimeout(App.afficherDonneesUtilisateur, 100);
      return;
  }

  const character = App.characters.find(c => c.name === name);
  if (!character) return;

  const level = userData[name + '_Level'] || 1;
  const xp = userData[name + '_XP'] || 0;
  const ptsDispo = userData[name + '_pts'] || 0;
  const xpNeeded = App.xpPourNiveauSuivant(level);
  const cost = App.coutPourNiveauSuivant(level);
  const points = userData.argent || 0;
  
  const pv = App.loadPv(character, userData[name + '_PV_pts'] || 0);
  const attaque = App.loadAttaque(character, userData[name + '_attaque_pts'] || 0);
  const defense = App.loadDefense(character, userData[name + '_defense_pts'] || 0);

  const persoHTML = `
    <div id="character-info-display" class="character-info" style="display:block;">
      <strong>${name}</strong><br>
      Classe: ${character.classe || 'Inconnue'}<br>
      PV : ${pv}<br>
      Attaque : ${attaque}<br>
      Défense : ${defense}<br>
      Rareté : ${character.rarete}<br>
      <div id="points-allocation-area"></div>
    </div>
    <div class="level-info">
        Niveau: ${level}${level >= 11 ? ' (Maximum !)' : ''}<br>
        ${level < 11 ? `XP: ${xp} / ${xpNeeded}<br>` : ''}
        ${level < 11 ? `Pièces: ${points}<br>` : ''}
        ${level < 11 ? `<div class="cost-info">Coût passage niveau: ${cost} pièces</div>` : ''}
        ${(xp >= xpNeeded && points >= cost && level < 11) ? `<button class="level-up-button" onclick="App.levelUp()">Monter de niveau</button>` : ''}
    </div>
  `;
  
  const container = document.getElementById('characters-unlocked');
  if (container) container.innerHTML = persoHTML;

  if (ptsDispo > 0) {
    App.renderAllocationButtons(userData, ptsDispo);
  }
};

App.renderAllocationButtons = function(userData, ptsTotal) {
  const name = App.characterName;
  const area = document.getElementById('points-allocation-area');
  if (!area) return;

  const ptsUtilises = App.totalPointsUtilises();
  const ptsRestants = ptsTotal - ptsUtilises;

  area.innerHTML = `<h3>Points à attribuer (${ptsRestants})</h3>`;

  const statsCfg = [
      { id: 'PV', label: 'PV', max: 25 },
      { id: 'attaque', label: 'Attaque', max: 25 },
      { id: 'defense', label: 'Défense', max: 15 }
  ];

  statsCfg.forEach(stat => {
    const ptsActuels = userData[name + '_' + stat.id + '_pts'] || 0;
    const temp = App.modificationsTemp[stat.id] || 0;
    const total = ptsActuels + temp;
    
    const div = document.createElement('div');
    div.className = 'stat-row';
    div.innerHTML = `
      <span>${stat.label} : ${total} (${ptsActuels})</span>
      ${total < stat.max && ptsRestants > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat.id}', 1)">+</button>` : ''}
      ${temp > 0 ? `<button class="stat-button" onclick="App.modifierStat('${stat.id}', -1)">-</button>` : ''}
    `;
    area.appendChild(div);
  });

  if (ptsUtilises > 0) {
      const btn = document.createElement('button');
      btn.textContent = 'Confirmer les points';
      btn.className = 'stat-button confirm-button';
      btn.onclick = App.confirmerStats;
      area.appendChild(btn);
  }
};

App.modifierStat = function(stat, val) {
    App.modificationsTemp[stat] = (App.modificationsTemp[stat] || 0) + val;
    App.afficherDonneesUtilisateur();
};

App.totalPointsUtilises = function() {
  return App.modificationsTemp.PV + App.modificationsTemp.attaque + App.modificationsTemp.defense;
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

// Initialisation au chargement
setTimeout(App.afficherDonneesUtilisateur, 100);
App.afficherDonneesUtilisateur();
