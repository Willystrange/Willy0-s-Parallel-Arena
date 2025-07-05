// ------------------------------
// Namespace global
// ------------------------------
window.App = window.App || {};

// ------------------------------
// 1) Démarrage de la partie si déjà commencée
// ------------------------------
App.startGameIfStarted = () => {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// ------------------------------
// 2) Utilitaires de gestion du ban/fraude
// ------------------------------
App.checkBanStatus = (userData) => {
  const now = Date.now();
  if (userData.ban_until && now < userData.ban_until) {
    const rem = userData.ban_until - now;
    const h = Math.floor(rem / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    alert(`Vous êtes bloqué encore ${h}h ${m}m ${s}s.`);
    return false;
  }
  return true;
};

App.updateFraudStatus = (userData) => {
  if (userData.partie_commencee) {
    userData.fraude = (userData.fraude || 0) + 1;
    userData.partie_commencee = false;
    let banDuration = 0;
    switch (userData.fraude) {
      case 2: banDuration = 15 * 60e3; break;
      case 3: banDuration = 45 * 60e3; break;
      case 4: banDuration = 60 * 60e3; break;
      case 5: banDuration = 3 * 60 * 60e3; break;
      case 6: banDuration = 5 * 60 * 60e3; break;
      case 7: banDuration = 10 * 60 * 60e3; break;
      case 8: banDuration = 20 * 60 * 60e3; break;
      case 9: banDuration = 24 * 60 * 60e3; break;
      default:
        if (userData.fraude > 9) {
          banDuration = 24 * 60 * 60e3;
          userData.trophees = (userData.trophees || 0) - 5;
        }
    }
    if (banDuration > 0) {
      userData.ban_until = Date.now() + banDuration;
      saveUserData(userData);
      alert(`Bloqué ${Math.round(banDuration / 60000)} minutes pour fraudes répétées.`);
      return false;
    }
  }
  saveUserData(userData);
  return true;
};

// ------------------------------
// 3) Liste des personnages
// ------------------------------
App.characters = [
  {name: "Willy", pv: 11100, attaque: 463, defense: 86, spe: 0.5, argent: 0, pv_max: 11100, attaque_originale: 463, defense_originale: 86, rarity: 'inhabituel'},
  {name: "Cocobi", pv: 11000, attaque: 440, defense: 115, spe: 0.5, argent: 0, pv_max: 10800, attaque_originale: 440, defense_originale: 115, rarity: 'légendaire'},
  {name: "Oiseau", pv: 9800, attaque: 510, defense: 85, spe: 0.5, argent: 0, pv_max: 9800, attaque_originale: 510, defense_originale: 85, rarity: 'rare'},
  {name: "Grours", pv: 13000, attaque: 430, defense: 68, spe: 0.5, argent: 0, pv_max: 1300, attaque_originale: 430, defense_originale: 68, rarity: 'rare'},
  {name: "Baleine", pv: 10200, attaque: 435, defense: 105, spe: 0.5, argent: 0, pv_max: 10200, attaque_originale: 435, defense_originale: 105, rarity: 'inhabituel'},
  {name: "Doudou", pv: 13800, attaque: 350, defense: 80, spe: 0, argent: 0, pv_max: 13800, attaque_originale: 350, defense_originale: 80, rarity: 'inhabituel'},
  {name: "Coeur", pv: 10000, attaque: 450, defense: 100, spe: 0.5, argent: 0, pv_max: 10000, attaque_originale: 450, defense_originale: 100, rarity: 'rare'},
  {name: "Diva", pv: 11021, attaque: 475, defense: 100, spe: 0.5, argent: 0, pv_max: 11021, attaque_originale: 475, defense_originale: 100, rarity: 'légendaire'},
  {name: "Poulpy", pv: 11500, attaque: 440, defense: 100, spe: 0.5, argent: 0, pv_max: 11500, attaque_originale: 440, defense_originale: 100, rarity: 'epique'},
  {name: "Colorina", pv: 9600, attaque: 420, defense: 80, spe: 0.5, argent: 0, pv_max: 9600, attaque_originale: 420, defense_originale: 80, rarity: 'commun'},
  {name: "Rosalie", pv: 10500, attaque: 460, defense: 85, spe: 0.5, argent: 0, pv_max: 10500, attaque_originale: 460, defense_originale: 85, rarity: 'epique'},
  {name: "Sboonie", pv: 10200, attaque: 410, defense: 95, spe: 0.5, argent: 0, pv_max: 9900, attaque_originale: 410, defense_originale: 95, rarity: 'commun'},
  {name: "Inconnu", pv: 11300, attaque: 435, defense: 83, spe: 0.25, argent: 0, pv_max: 11300, attaque_originale: 435, defense_originale: 83, rarity: "épique"},
  {name: "Boompy", pv: 11800, attaque: 500, defense: 80, spe: 0, argent: 0, pv_max: 11800, attaque_originale: 500, defense_originale: 80, rarity: "légendaire"},
  {name: "Perro", pv: 9700, attaque: 420, defense: 85, spe: 0.5, argent: 0, pv_max: 9700, attaque_originale: 420, defense_originale: 85, rarity: "commun"},
  {name: "Nautilus", pv: 11280, attaque: 470, defense: 74, spe: 0.5, argent: 0, pv_max: 11280, attaque_originale: 470, defense_originale: 74, rarity: "épique"},
];

// ------------------------------
// 4) Rendu de la liste et gestion du choix
// ------------------------------
App.renderCharacterList = (sortType) => {
  const userData = getUserData();
  const listEl = document.getElementById("character-list");
  listEl.innerHTML = '';

  const rarityOrder = { commun:1, inhabituel:2, rare:3, epique:4, legendaire:5 };

  // Séparer débloqués / non
  const [unlocked, locked] = App.characters.reduce((acc, c) => {
    (userData[c.name] === 1 ? acc[0] : acc[1]).push(c);
    return acc;
  }, [[], []]);

  // Fonction de tri
  const sortFn = (a, b) => {
    if (sortType === 'alphabetical') return a.name.localeCompare(b.name);
    if (sortType.includes('level')) {
      const la = userData[a.name + '_Level'] || 1;
      const lb = userData[b.name + '_Level'] || 1;
      return sortType === 'level_asc' ? la - lb : lb - la;
    }
    const ra = rarityOrder[a.rarity] || 0;
    const rb = rarityOrder[b.rarity] || 0;
    return sortType === 'rarity_asc' ? ra - rb : rb - ra;
  };

  [...unlocked.sort(sortFn), ...locked.sort(sortFn)]
    .forEach(character => {
      const btn = document.createElement('button');
      btn.className = 'character-button';
      btn.textContent = character.name;

      if (userData[character.name] === 1) {
        btn.onclick = () => App.displayStats(btn, character);
      } else {
        btn.classList.add('disabled');
        btn.onclick = () => {
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 500);
          if (!btn.nextSibling?.classList?.contains('unlock-message')) {
            const msg = document.createElement('div');
            msg.className = 'unlock-message';
            msg.textContent = "Personnage non débloqué !";
            btn.after(msg);
            msg.classList.add('show');
          }
        };
      }

      listEl.appendChild(btn);
    });
};

App.displayStats = (button, character) => {
  const userData = getUserData();
  document.querySelectorAll('.stats').forEach(el => el.remove());

  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats';

  const lvl = userData[character.name + '_Level'] || 1;
  const pvPts = userData[character.name + '_PV_pts'] || 0;
  const atkPts = userData[character.name + '_attaque_pts'] || 0;
  const defPts = userData[character.name + '_defense_pts'] || 0;

  const pv = Math.round((1 + pvPts * 0.02) * character.pv);
  const atk = Math.round((1 + atkPts * 0.02) * character.attaque);
  const def = Math.round((1 + defPts * 0.02) * character.defense);

  statsDiv.innerHTML = `
    <h3>${character.name} (Niveau ${lvl})</h3>
    <p>Rareté : ${character.rarity}</p>
    <p>PV : ${pv}</p>
    <p>Attaque : ${atk}</p>
    <p>Défense : ${def}</p>
    <button class="choose-button">Choisir</button>
  `;

  button.after(statsDiv);
  statsDiv.offsetHeight;
  statsDiv.classList.add('show');

  statsDiv.querySelector('.choose-button').onclick = () => {
    if (!App.checkBanStatus(userData)) return;
    sessionStorage.setItem('playerCharacter', JSON.stringify({
      name: character.name,
      pv, attaque: atk, defense: def,
      spe: character.spe,
      argent: character.argent,
      pv_max: character.pv_max,
      attaque_originale: Math.round((1 + atkPts * 0.02) * character.attaque),
      defense_originale: Math.round((1 + defPts * 0.02) * character.defense)
    }));
    startMusicC();
    loadPage('combat-survie');
  };
};

// ------------------------------
// 5) Tri dynamique et initialisation
// ------------------------------
document.getElementById('sort')
  .addEventListener('change', e => App.renderCharacterList(e.target.value));

// Affichage initial
App.renderCharacterList('alphabetical');
