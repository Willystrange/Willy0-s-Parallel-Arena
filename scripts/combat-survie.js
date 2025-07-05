// Définition du namespace global
window.App = window.App || {};

App.updateSpecialBar = function(character, elementId) {
  const specialBar = document.getElementById(elementId);
  if (!specialBar) return;
  const fillElement = specialBar.querySelector('.special-fill');
  if (!fillElement) return;
  const maxSpecialAbility = 1; // Valeur maximale de la capacité spéciale
  const widthPercentage = (character.spe / maxSpecialAbility) * 100;
  fillElement.style.width = `${widthPercentage}%`;
};
// Déclaration globale des variables dans le namespace app
App.playerCharacter = null;
App.opponentCharacter = null;
App.specialAbility = 0;

App.sauvegarderPartie = function(playerCharacter, opponentCharacter) {
  const wave = {
    currentWave: App.currentWave,
  }
  const sauvegarde = {
    playerCharacter: {
      name: playerCharacter.name,
      pv: playerCharacter.pv,
      pv_max: playerCharacter.pv_max,
      attaque: playerCharacter.attaque,
      defense: playerCharacter.defense,
      spe: playerCharacter.spe,
      attaque_originale: playerCharacter.attaque_originale,
      defense_originale: playerCharacter.defense_originale,
      perte_att: playerCharacter.perte_att || 0,
      Oiseaudefense: playerCharacter.Oiseaudefense,
      perte_defense_colorina: playerCharacter.perte_defense_colorina,
      amulette_soin: playerCharacter.amulette_soin,
      attaque_epee: playerCharacter.attaque_epee,
      attaque_elixir: playerCharacter.attaque_elixir,
      armure: playerCharacter.armure,
      degats_partie: playerCharacter.degats_partie,
      objets_partie: playerCharacter.objets_partie,
      capacite_partie: playerCharacter.capacite_partie,
      degats_partie_base: playerCharacter.degats_partie_base,
      objets_soin: playerCharacter.objets_soin,
      defense_bouton: playerCharacter.defense_bouton,
      defense_droit: playerCharacter.defense_droit,
      defense_solide: playerCharacter.defense_solide,
      defense_partie: playerCharacter.defense_partie,
      immobilisation: playerCharacter.immobilisation || 0,
      sboonie_attaque: playerCharacter.sboonie_attaque || 0,
      poulpy_att: playerCharacter.poulpy_att || 0,
      objets_utilise: playerCharacter.objets_utilise || 0,
      inventaire_objets: playerCharacter.inventaire_objets || false,
      amuletteUses: playerCharacter.amuletteUses || 0,
      armureUses: playerCharacter.armureUses || 0,
      tour: playerCharacter.tour || 1,
      cape: playerCharacter.cape || false,
      capeUses: playerCharacter.capeUses || 0,
      crystalUses: playerCharacter.crystalUses || 0,
      inconnu_super: playerCharacter.inconnu_super || 0,
      last_action: playerCharacter.last_action || 0,
      tourTT: playerCharacter.tourTT || 1,
      Perro: playerCharacter.Perro || 0,
      Soin: playerCharacter.soin || 0,
      MaxDegats: playerCharacter.MaxDegats || 0,
      amulette_heal: playerCharacter.amulette_heal || 0,
      last_upgrade: playerCharacter.last_upgrade || "null",
    },
    opponentCharacter: {
      name: opponentCharacter.name,
      pv: opponentCharacter.pv,
      pv_max: opponentCharacter.pv_max,
      attaque: opponentCharacter.attaque,
      defense: opponentCharacter.defense,
      spe: opponentCharacter.spe,
      attaque_originale: opponentCharacter.attaque_originale,
      defense_originale: opponentCharacter.defense_originale,
      perte_att: opponentCharacter.perte_att || 0,
      Oiseaudefense: opponentCharacter.Oiseaudefense || 0,
      perte_defense_colorina: opponentCharacter.perte_defense_colorina || 0,
      pv_maximum: opponentCharacter.pv,
      immobilisation: opponentCharacter.immobilisation || 0,
      defense_bouton: opponentCharacter.defense_bouton || 0,
      defense_droit: opponentCharacter.defense_droit || 0,
      sboonie_attaque: opponentCharacter.sboonie_attaque || 0,
      poulpy_att: opponentCharacter.poulpy_att || 0,
      degats_subit: opponentCharacter.degats_subit || 0,
      inconnu_super: opponentCharacter.inconnu_super || 0,
      next_choice: opponentCharacter.next_choice || "0",
      isDefending: opponentCharacter.isDefending || false,
      Perro: opponentCharacter.Perro || 0,
      PVAVANT: opponentCharacter.PVAVANT || 0,
      PVAPRES: opponentCharacter.PVAPRES || 0,
    }
  };
  localStorage.setItem("wave", JSON.stringify(wave));
  localStorage.setItem("savepartiesurvie", JSON.stringify(sauvegarde));
};

App.chargerPartie = function() {
  const wave = JSON.parse(localStorage.getItem("wave"));
  const sauvegardeLocal = JSON.parse(localStorage.getItem("savepartiesurvie"));
  if (!sauvegardeLocal) {
    console.warn("Aucune sauvegarde trouvée.");
    return;
  }
  // Affectation directe des objets sauvegardés aux variables globales
  App.currentWave = wave.currentWave;
  App.playerCharacter = sauvegardeLocal.playerCharacter;
  App.opponentCharacter = sauvegardeLocal.opponentCharacter;

  App.updateUI(); // Mise à jour de l'interface après chargement
};

App.updateUI = function() {
  App.playerCharacter.pv = Math.round(App.playerCharacter.pv);
  App.opponentCharacter.pv = Math.round(App.opponentCharacter.pv);
  if (document.getElementById('player-name')) {
    document.getElementById('player-name').textContent = App.playerCharacter.name;
  }
  if (document.getElementById('player-pv')) {
    document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  }
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');

  if (document.getElementById('opponent-name')) {
    document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
  }
  if (document.getElementById('opponent-pv')) {
    document.getElementById('opponent-pv').textContent = `PV: ${App.opponentCharacter.pv}`;
  }
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
};


// Détection du mode d'affichage (standalone ou non)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  document.body.classList.add('web-app');
} else {
  document.body.classList.add('normal-app');
}


App.userData = getUserData();

history.replaceState(null, null, window.location.href);


App.adversairepasser_tour = function() {
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  if (App.opponentCharacter.inconnu_super >= 1) {
    App.opponentCharacter.inconnu_super -= 1;
  }
  if (App.opponentCharacter.immobilisation >= 1) {
    App.opponentCharacter.immobilisation -= 1;
  }
  if (App.opponentCharacter.defense_droit > 0) {
    App.opponentCharacter.defense_droit -= 1;
  }
  if (App.opponentCharacter.perte_att > 0) {
    App.opponentCharacter.perte_att -= 1;
    if (App.opponentCharacter.perte_att === 0) {
      App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque / 0.75);
    }
  }
  if (App.opponentCharacter.poulpy_att > 0) {
    App.opponentCharacter.poulpy_att -= 1;
    if (App.opponentCharacter.poulpy_att === 0) {
      App.opponentCharacter.defense = Math.round(App.opponentCharacter.defense / 0.85);
    }
  }
  if (App.opponentCharacter.Oiseaudefense > 0) {
    App.opponentCharacter.Oiseaudefense -= 1;
    if (App.opponentCharacter.Oiseaudefense === 0) {
      App.opponentCharacter.defense -= 20;
    }
  }
  if (App.opponentCharacter.perte_defense_colorina > 0) {
    App.opponentCharacter.perte_defense_colorina -= 1;
    if (App.opponentCharacter.perte_defense_colorina === 0) {
      App.opponentCharacter.defense = Math.round(App.opponentCharacter.defense / 0.85);
    }
  }
  if (App.opponentCharacter.sboonie_attaque > 0) {
    App.opponentCharacter.sboonie_attaque -= 1;
    if (App.opponentCharacter.sboonie_attaque === 0) {
      App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque / 0.85);
    }
  }
  if (App.opponentCharacter.Perro > 0) {
    App.opponentCharacter.Perro -= 1;
    if (App.opponentCharacter.Perro === 0) {
      App.opponentCharacter.defense = Math.round(App.opponentCharacter.defense / 0.70);
    }
  }
};

// --- Passage de tour joueur ---
App.joueurpasser_tour = function() {
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateUI();
  App.playerCharacter.inventaire_objets = false;
  App.playerCharacter.objets_utilise = 0;
  if (App.playerCharacter.inconnu_use > 4) {
    App.playerCharacter.attaque -= (App.playerCharacter.inconnu_use - 4) * 25;
    App.playerCharacter.defense -= (App.playerCharacter.inconnu_use - 4) * 25;
  }
  if (App.playerCharacter.inconnu_super >= 1) {
    App.playerCharacter.inconnu_super -= 1;
  }
  if (App.playerCharacter.cape) {
    App.playerCharacter.cape = false;
  }
  if (App.playerCharacter.immobilisation >= 1) {
    App.playerCharacter.immobilisation -= 1;
  }
  if (App.playerCharacter.amulette_soin > 0) {
    App.playerCharacter.pv = Math.round(App.playerCharacter.pv + (App.playerCharacter.pv_maximum * 0.02));
  }
  if (App.playerCharacter.defense_droit > 0) {
    App.playerCharacter.defense_droit -= 1;
  }
  if (App.playerCharacter.perte_att > 0) {
    App.playerCharacter.perte_att -= 1;
    if (App.playerCharacter.perte_att === 0) {
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque / 0.75);
    }
  }
  if (App.playerCharacter.poulpy_att > 0) {
    App.playerCharacter.poulpy_att -= 1;
    if (App.playerCharacter.poulpy_att === 0) {
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense / 0.85);
    }
  }
  if (App.playerCharacter.Oiseaudefense > 0) {
    App.playerCharacter.Oiseaudefense -= 1;
    if (App.playerCharacter.Oiseaudefense === 0) {
      App.playerCharacter.defense -= 20;
    }
  }
  if (App.playerCharacter.perte_defense_colorina > 0) {
    App.playerCharacter.perte_defense_colorina -= 1;
    if (App.playerCharacter.perte_defense_colorina === 0) {
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense / 0.85);
    }
  }
  if (App.playerCharacter.sboonie_attaque > 0) {
    App.playerCharacter.sboonie_attaque -= 1;
    if (App.playerCharacter.sboonie_attaque === 0) {
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque / 0.85);
    }
  }
  if (App.playerCharacter.Perro > 0) {
    App.playerCharacter.Perro -= 1;
    if (App.playerCharacter.Perro === 0) {
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense / 0.70);
    }
  }
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
};


// --- Chargement du joueur et initialisation ---

// --- Initialisation communs des personnages ---
App.initializeCharacter = function(character) {
  character.perte_att = 0;
  character.Oiseaudefense = 0;
  character.perte_defense_colorina = 0;
  character.pv_maximum = character.pv;
  character.amulette_soin = 0;
  character.attaque_epee = 0;
  character.attaque_elixir = 0;
  character.armure = 0;
  character.degats_partie = 0;
  character.objets_partie = 0;
  character.capacite_partie = 0;
  character.defense_solide = 0;
  character.immobilisation = 0;
  character.sboonie_attaque = 0;
  character.poulpy_att = 0;
  character.objets_utilise = 0;
  character.inventaire_objets = false;
  character.amuletteUses = 0;
  character.armureUses = 0;
  character.cape = false;
  character.capeUses = 0;
  character.crystalUses = 0;
  character.inconnu_super = 0;
  character.inconnu_use = 0;
  character.Perro = 0;
};

// --- Statistiques adversaires ---
App.opponentStatsRanges = {
  'Blitzkrieger': { minPv: 9000, maxPv: 11500, minAttaque: 250, maxAttaque: 340, minDefense: 70, maxDefense: 90 },
  'Frostbite': { minPv: 8500, maxPv: 11000, minAttaque: 220, maxAttaque: 300, minDefense: 75, maxDefense: 85 },
  'Inferno Beast': { minPv: 8000, maxPv: 10500, minAttaque: 270, maxAttaque: 350, minDefense: 65, maxDefense: 80 },
  'Steel Sentinel': { minPv: 9500, maxPv: 12000, minAttaque: 200, maxAttaque: 270, minDefense: 85, maxDefense: 100 },
  'Shadow Stalker': { minPv: 8600, maxPv: 10800, minAttaque: 240, maxAttaque: 320, minDefense: 60, maxDefense: 75 },
  'Thunderstrike': { minPv: 9000, maxPv: 11500, minAttaque: 280, maxAttaque: 360, minDefense: 55, maxDefense: 70 },
  'Giga Titan': { minPv: 10000, maxPv: 12500, minAttaque: 230, maxAttaque: 310, minDefense: 80, maxDefense: 95 },
  'Venom Warden': { minPv: 8700, maxPv: 11000, minAttaque: 260, maxAttaque: 340, minDefense: 70, maxDefense: 85 },
  'Stormbringer': { minPv: 8800, maxPv: 11200, minAttaque: 250, maxAttaque: 330, minDefense: 65, maxDefense: 80 },
  'Earthshaker': { minPv: 9200, maxPv: 11800, minAttaque: 210, maxAttaque: 290, minDefense: 90, maxDefense: 105 },
};

App.getRandomElement = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};


App.generateRandomOpponent = function(wave) {
  const names = Object.keys(App.opponentStatsRanges);
  const name = App.getRandomElement(names);
  const stats = App.opponentStatsRanges[name];
  const basePv = Math.floor(Math.random() * (stats.maxPv - stats.minPv + 1)) + stats.minPv;
  const baseAttaque = Math.floor(Math.random() * (stats.maxAttaque - stats.minAttaque + 1)) + stats.minAttaque;
  const baseDefense = Math.floor(Math.random() * (stats.maxDefense - stats.minDefense + 1)) + stats.minDefense;
  const scale = 1 + (wave - 1) * 0.1;

  return {
    name: name,
    pv: Math.round(basePv * scale),
    pv_max: Math.round(basePv * scale),
    attaque: Math.round(baseAttaque * scale),
    attaque_originale: Math.round(baseAttaque * scale),
    defense: Math.round(baseDefense * scale),
    defense_originale: Math.round(baseDefense * scale),
    spe: 0
  };
};



App.updateSpecialButton = function() {
  const specialButton = document.getElementById('special-button');
  const maxSpecialAbility = 1;
  if (App.playerCharacter.spe > maxSpecialAbility) {
    App.playerCharacter.spe = maxSpecialAbility;
  }
  if (App.playerCharacter.spe >= maxSpecialAbility) {
    specialButton.classList.add('bright', 'grow');
    specialButton.textContent = 'Capacité spéciale';
  } else {
    specialButton.classList.remove('bright', 'grow');
    specialButton.textContent = `${App.playerCharacter.spe.toFixed(1)} / 1`;
  }
};

App.playerAttack = function() {
  if (App.playerCharacter.name !== "Boompy") {
    App.playerCharacter.spe += 0.25;
  } else if (App.playerCharacter.name === "Boompy") {
    App.playerCharacter.spe += 0.34;
  }
  App.updateSpecialButton();
  App.handleAttack(App.playerCharacter, App.opponentCharacter, true);
  if (App.opponentCharacter.pv <= 0) {
    App.nextWave();
    App.joueurpasser_tour();
    App.adversairepasser_tour();
  } else {
    App.opponentTurn();
    App.joueurpasser_tour();
    App.adversairepasser_tour();
  }
};

App.addCombatLog = function(message, color, isPlayer) {
  const combatLog = document.getElementById('combat-log');
  const logEntry = document.createElement('p');
  logEntry.textContent = message;
  logEntry.style.color = color;
  if (isPlayer === true) {
    logEntry.style.textAlign = "left"; // Action du joueur → à gauche
  } else if (isPlayer === false) {
    logEntry.style.textAlign = "right"; // Action de l'adversaire → à droite
  } else {
    logEntry.style.textAlign = "center"; // Sinon → au centre
  }
  combatLog.appendChild(logEntry);
};

App.nextWave = function() {
  App.currentWave++;
  App.playerCharacter.perte_att = 0;
  App.playerCharacter.Oiseaudefense = 0;
  App.playerCharacter.perte_defense_colorina = 0;
  App.playerCharacter.perte_att = 0;
  App.playerCharacter.amulette_soin = 0;
  App.playerCharacter.immobilisation = 0;
  App.playerCharacter.sboonie_attaque = 0;
  App.playerCharacter.poulpy_att = 0;
  App.playerCharacter.objets_utilise = 0;
  App.playerCharacter.inventaire_objets = false;

  App.playerCharacter.cape = false;

  App.playerCharacter.inconnu_super = 0;

  App.playerCharacter.Perro = 0;
  const combatLog = document.getElementById('combat-log');
  combatLog.innerHTML += `<p>Adversaire ${App.currentWave} Vaincu.</p>`;
  App.opponentCharacter = App.generateRandomOpponent(App.currentWave);
  App.updateUI();
  App.showUpgradeOptions();
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
};

App.handleAttack = function(attacker, defender, isPlayerAttacking) {
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }
  let specialLogMessage = "";

  const defenseModifier = 0.9 + Math.random() * 0.2;
  const modifiedDefense = Math.round(defender.defense * defenseModifier);
  let damage = Math.max(0, attacker.attaque - modifiedDefense);

  if (attacker.name === "Boompy" && attacker.spe >= 1) {
    damage = Math.max(0, attacker.attaque * 1.5 - modifiedDefense);
    attacker.spe -= 1;
    specialLogMessage = `${attacker.name} est surchargé, il inflige 150% de ses dégâts de base`;
    App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
    App.scrollToBottom();
  }

  if (defender.defense_bouton === 1) {
    defender.defense_bouton = 0;
    damage = Math.round(attacker.attaque * 0.2);
  }


  if (defender.cape) {
    damage = 0;
    specialLogMessage = `${defender.name} a utilisé une cape de l'ombre, ${attacker.name} ne l'a donc pas atteint !`;
  }

  defender.pv = Math.max(0, defender.pv - damage);

  if (isPlayerAttacking) {
    attacker.last_action = 1;
    specialLogMessage = `Vous attaquez et infligez ${damage} points de dégâts à ${defender.name}.`;
    document.getElementById('opponent-pv').textContent = `PV: ${defender.pv}`;
  } else {
    specialLogMessage = `${attacker.name} attaque et inflige ${damage} points de dégâts.`;
    document.getElementById('player-pv').textContent = `PV: ${defender.pv}`;
  }

  App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
  App.scrollToBottom();

  if (defender.pv <= 0 && !isPlayerAttacking) {
    const userData = getUserData();
    userData.partie_commencee_survie = false;
    saveUserData(userData);
    if (userData.quete1_type === "manches_survie") {
      userData.quete1_current += App.currentWave;
      saveUserData(userData);
    }
    if (userData.quete2_type === "manches_survie") {
      userData.quete2_current += App.currentWave;
      saveUserData(userData);
    }
    if (userData.quete3_type === "manches_survie") {
      userData.quete3_current += App.currentWave;
      saveUserData(userData);
    }

    for (let week = 1; week <= 10; week++) {
      if (userData[`semaine${week}`]) {
        for (let quest = 1; quest <= 5; quest++) {
          const questKey = `Semaine${week}_${quest}`;
          const questCompletedKey = `${questKey}_completed`;
          const questTypeKey = `${questKey}_type`;
          const questCurrentKey = `${questKey}_current`;
          const questCharacterKey = `${questKey}_character`;

          if (!userData[questCompletedKey]) {
            switch (userData[questTypeKey]) {
              case 'SPS':
                if (App.playerCharacter.name === userData[questCharacterKey]) {
                  userData[questCurrentKey] += App.currentWave;
                }
                break;
              case 'DS':
                userData[questCurrentKey] += App.playerCharacter.degats_partie;
                break;
              case 'CS':
                userData[questCurrentKey] += App.playerCharacter.capacite_partie;
                break;
              case 'SS':
                userData[questCurrentKey] += App.currentWave;
                break;
              case 'O':
                userData[questCurrentKey] += App.playerCharacter.objets_partie;
                break;
            }
            saveUserData(userData);
          }
        }
      }
    }

    App.calculateRewards(App.currentWave);
  }
};



App.useSpecialAbility = function(character, opponent, isPlayer) {
  let specialLogMessage = "";
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }
  if (character.spe < 1) return;

  // Décrémente la quantité de la capacité spéciale utilisée
  character.spe -= 1;
  if (isPlayer) {
    character.capacite_partie += 1;
    character.last_action = 2;
  }


  // Immobilisation
  if (character.immobilisation >= 1) {
    specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'a immobilisé, donc tout échoue.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);

    // Protection bouton défense
  } else if (opponent.defense_bouton === 1) {
    opponent.defense_bouton = 0;
    specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'en empêche, donc tout échoue.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);

    // Blocage inconnu_super
  } else if (character.inconnu_super >= 1) {
    specialLogMessage = `${character.name} ne peut pas utiliser sa capacité spéciale, bloqué pour encore ${character.inconnu_super} tours.`;
    character.spe += 1;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    App.handleAttack(character, opponent, isPlayer);

    // Effets spécifiques selon le personnage
  } else {
    switch (character.name) {
      case "Diva":
        opponent.attaque *= 0.75;
        opponent.perte_att += 3 + (isPlayer ? 1 : 0);
        specialLogMessage = `${character.name} utilise sa capacité spéciale ! L'attaque de ${opponent.name} est réduite pour 3 tours.`;
        break;

      case "Willy": {
        const defMod = Math.round(opponent.defense * (0.9 + Math.random() * 0.2));
        const dmg = 2 * (character.attaque - defMod);
        opponent.pv -= dmg;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} effectue une double attaque et inflige ${Math.max(0, dmg)} dégâts.`;
        break;
      }

      case "Baleine":
        if (character.defense < 29) {
          specialLogMessage = "Baleine manque de défense, attaque normalement.";
        } else {
          character.defense -= 15;
          character.pv += 1000;
          specialLogMessage = "Baleine perd 15 de défense et gagne 1000 PV !";
        }
        break;

      case "Doudou": {
        const max = character.pv_max;
        const perc = character.pv < max / 2 ? 0.15 : 0.05;
        const regen = Math.ceil(character.pv * perc);
        character.pv = Math.min(max, character.pv + regen);
        specialLogMessage = `${character.name} régénère ${regen} PV.`;
        break;
      }

      case "Cocobi": {
        const red = Math.ceil(opponent.pv_maximum * 0.12);
        opponent.pv = Math.max(0, opponent.pv - red);
        character.degats_partie += red;
        specialLogMessage = `${character.name} fait perdre ${red} PV à ${opponent.name}.`;
        break;
      }

      case "Coeur": {
        const dmg = Math.round(character.attaque * 1.5);
        const heal = Math.round(dmg * (character.pv > character.pv_max / 2 ? 0.1 : 0.15));
        opponent.pv = Math.max(0, opponent.pv - dmg);
        character.pv = Math.min(character.pv_max, character.pv + heal);
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts et récupère ${heal} PV.`;
        break;
      }

      case "Grours": {
        const dmg = 500 + character.attaque - Math.round(opponent.defense * 0.5);
        opponent.pv -= dmg;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} ignore le bouclier et inflige ${dmg} dégâts.`;
        break;
      }

      case "Poulpy": {
        const poulDmg = Math.round(character.attaque * 1.75);
        const effDef = Math.round(opponent.defense * 0.6);
        const net = Math.max(0, poulDmg - effDef);
        opponent.pv -= net;
        opponent.defense *= 0.85;
        opponent.poulpy_att += 3;
        character.degats_partie += net;
        specialLogMessage = `${character.name} inflige ${net} dégâts et réduit la défense pour 2 tours.`;
        break;
      }

      case "Oiseau": {
        const dmg = Math.round(character.attaque * 2.5);
        opponent.pv -= dmg;
        character.defense += 20;
        character.Oiseaudefense += 2;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts et gagne 20 défense.`;
        break;
      }

      case "Colorina": {
        const dmg = Math.round(character.attaque * 0.85);
        opponent.pv -= dmg;
        opponent.defense *= 0.85;
        opponent.perte_defense_colorina += 4;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts et réduit la défense de 15% pour 3 tours.`;
        break;
      }

      case "Rosalie": {
        const dmg = Math.round(character.attaque * 2);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        if (Math.random() < 0.25) opponent.immobilisation = 1;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts${opponent.immobilisation ? " et immobilise pour 1 tour." : "."}`;
        break;
      }

      case "Sboonie": {
        const heal = Math.round(character.pv_max * 0.05);
        character.pv += heal;
        opponent.pv -= 50;
        opponent.sboonie_attaque += isPlayer ? 2 : 1;
        character.degats_partie += 50;
        specialLogMessage = `${character.name} régénère ${heal} PV, inflige 50 dégâts et réduit l'attaque pour 1 tour.`;
        break;
      }

      case "Inconnu":
        opponent.inconnu_super += 3 + (isPlayer ? 1 : 0);
        character.attaque += 25;
        character.defense += 25;
        character.inconnu_use += 1;
        specialLogMessage = `${character.name} augmente attaque/défense et bloque ${opponent.name} pour 3 tours.`;
        break;

      case "Perro":
        character.spe = 0;
        opponent.defense *= 0.70;
        character.attaquee = character.attaque * 0.85;
        opponent.pv -= character.attaque;
        opponent.Perro += 3;
        specialLogMessage = `${character.name} utilise sa capacité spéciale, il inflige ${character.attaquee} dégâts et réduit la défense de ${opponent.name} de 30% pour les deux prochains touts !`;
        break;
      case "Nautilus":
        character.spe = 0;
        let attack = character.attaque;
        character.attaque *= 0.6;

        specialLogMessage = `${character.name} utilise sa capacité spéciale, il effectue 3 attaques à 60% de son attaque normale.`;

        const opponentDefenseModifieee = 0.9 + Math.random() * 0.2;
        const opponentDefenseee = Math.round(opponent.defense * opponentDefenseModifieee);
        opponent.pv += (2 * (opponentDefenseee - character.attaque));

        character.degats_partie += (2 * (character.attaque - opponentDefenseee));

        let totalDefenseLost = 0;
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.5) {
            opponent.defense -= 10;
            totalDefenseLost += 10;
          }
        }

        if (totalDefenseLost > 0) {
          specialLogMessage += ` De plus, la défense de ${opponent.name} diminue de ${totalDefenseLost} points !`;
        }

        App.addCombatLog(specialLogMessage, logColor, isPlayer);
        App.handleAttack(character, opponent, isPlayer);
        character.attaque = attack;
        character.spe = 0;
        break;


      // Adversaires spécifiques
      case "Blitzkrieger": {
        const dmg = Math.max(0, Math.round(character.attaque * 2) - Math.round(opponent.defense * 0.8));
        opponent.pv -= dmg;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts en ignorant 20% de défense.`;
        break;
      }
      case "Frostbite": {
        const dmg = Math.round(opponent.pv_max * 0.10);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        character.defense += 15;
        opponent.defense = Math.max(0, opponent.defense - 20);
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} fait perdre ${dmg} PV et réduit sa défense de 20.`;
        break;
      }
      case "Inferno Beast": {
        const dmg = Math.round(character.attaque * 1.5);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        opponent.attaque = Math.max(0, opponent.attaque - 30);
        const self = Math.round(character.pv_maximum * 0.05);
        character.pv = Math.max(0, character.pv - self);
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} PV, réduit l'attaque de 30 et s'inflige ${self} PV.`;
        break;
      }
      case "Steel Sentinel": {
        const dmg = Math.round(character.attaque * 1.25);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        character.defense += 25;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} PV et gagne 25 de défense.`;
        break;
      }
      case "Shadow Stalker": {
        const base = Math.round(character.attaque * 1.4);
        const extra = Math.round(opponent.pv_max * 0.05);
        const total = base + extra;
        opponent.pv = Math.max(0, opponent.pv - total);
        character.defense += 10;
        character.degats_partie += base;
        specialLogMessage = `${character.name} inflige ${total} PV et gagne 10 de défense.`;
        break;
      }
      case "Thunderstrike": {
        const dmg = Math.round(character.attaque * 1.6);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        if (Math.random() < 0.3) {
          opponent.attaque = Math.max(0, opponent.attaque - 40);
          specialLogMessage = `${character.name} inflige ${dmg} PV et étourdit, -40 atk.`;
        } else {
          specialLogMessage = `${character.name} inflige ${dmg} PV.`;
        }
        character.degats_partie += dmg;
        break;
      }
      case "Giga Titan": {
        const dmg = Math.round(character.attaque * 1.5);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        character.defense += 20;
        const boost = Math.round(character.attaque * 0.25);
        character.attaque += boost;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} PV, +20 def et +${boost} atk.`;
        break;
      }
      case "Venom Warden": {
        const dmg = Math.round(character.attaque * 1.4);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        let poison = 0;
        if (Math.random() < 0.3) {
          poison = Math.round(opponent.pv * (0.01 + Math.random() * 0.12));
          opponent.pv = Math.max(0, opponent.pv - poison);
        }
        character.degats_partie += dmg + poison;
        specialLogMessage = `${character.name} inflige ${dmg} PV${poison ? ` +${poison} poison` : ''}.`;
        break;
      }
      case "Stormbringer": {
        const dmg = Math.round(character.attaque * 1.5);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        const defLoss = Math.floor(10 + Math.random() * 16);
        opponent.defense = Math.max(0, opponent.defense - defLoss);
        character.defense += 15;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} PV, -${defLoss} def et +15 def.`;
        break;
      }
      case "Earthshaker": {
        const dmg = Math.round(character.attaque * 1.4);
        opponent.pv = Math.max(0, opponent.pv - dmg);
        const defLoss = Math.floor(20 + Math.random() * 16);
        opponent.defense = Math.max(0, opponent.defense - defLoss);
        character.defense += 20;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} PV, -${defLoss} def et +20 def.`;
        break;
      }
      default:
        specialLogMessage = `${character.name} utilise sa capacité spéciale ! Effet à définir.`;
    }

    // Journal et mise à jour UI
    App.addCombatLog(specialLogMessage, logColor, isPlayer);

    App.handleAttack(character, opponent, isPlayer);
    App.updateUI();
    App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
    App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
    App.updateSpecialButton();
    App.scrollToBottom();

    if (isPlayer) {
      App.opponentTurn();
    }
  }
};


// --------------------------
// Fonctions utilitaires déjà existantes (intégrées dans app)
// --------------------------


App.loadPlayerActionHistory = function() {
  let history = localStorage.getItem("playerActionHistorySurvie");
  App.playerActionHistory = history ? JSON.parse(history) : [];
};

App.savePlayerActionHistory = function(history) {
  localStorage.setItem("playerActionHistory", JSON.stringify(history));
};

// Charger l'historique au démarrage
App.loadPlayerActionHistory();

App.manhattanDistance = function(arr1, arr2) {
  let distance = 0;
  for (let i = 0; i < arr1.length; i++) {
    distance += Math.abs(arr1[i] - arr2[i]);
  }
  return distance;
};

App.weightedRandomAction = function(actionCounts) {
  const total = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
  let rand = Math.random() * total;
  for (let action in actionCounts) {
    rand -= actionCounts[action];
    if (rand <= 0) {
      return action;
    }
  }
  return null;
};



// -----------------------------
// Gestion de l'IA et de l'historique de combat
// -----------------------------

App.actionMapping = {
  "attacker": 0,
  "se défendre": 1,
  "utiliser capacité spéciale": 2
};

App.transformState = function(state) {
  // Copie de l'état
  let newState = state.slice();
  // Remplacer l'action (index 3) par sa valeur numérique si possible
  if (typeof newState[3] === "string" && App.actionMapping[newState[3]] !== undefined) {
    newState[3] = App.actionMapping[newState[3]];
  } else {
    newState[3] = 0; // valeur par défaut en cas de problème
  }
  return newState;
};

App.findSimilarData = function(currentState, data, similarityThreshold = 2) {
  const stateToMatch = App.transformState(currentState);
  return data.filter(row => {
    const rowState = App.transformState(row);
    // On suppose que la fonction manhattanDistance existe ailleurs dans le code
    return App.manhattanDistance(stateToMatch, rowState) <= similarityThreshold;
  });
};

App.mostProbableAction = function(data) {
  // Prédiction par séquence (ordre 2, ajustable)
  let sequencePrediction = App.predictPlayerNextActionBySequence(2);
  if (sequencePrediction !== null) {
    return sequencePrediction;
  }
  // Si aucun résultat, on analyse les actions dans les données similaires
  if (data.length === 0) return null;
  const actions = data.map(row => row[3]);
  const counts = actions.reduce((acc, action) => {
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});
  // On suppose que weightedRandomAction est définie ailleurs
  return App.weightedRandomAction(counts);
};

App.saveHistoricalData = function(data) {
  localStorage.setItem("historicalDataSurvie", JSON.stringify(data));
};

App.loadHistoricalData = function() {
  const data = localStorage.getItem("historicalDataSurvie");
  return data ? JSON.parse(data) : [];
};

// Chargement initial de l'historique
App.historicalData = App.loadHistoricalData();

// Variables pour la gestion adaptative par situation
App.situationStats = {}; // { situationKey: { action: { totalDelta, count } } }
App.lastState = null;
App.lastAIAction = null;
App.lastSituationKey = null;
App.lastPlayerHP = null;
App.lastAIHP = null;

// Construit une clé de situation à partir de l'état et d'une info sur la défense du joueur
App.getSituationKey = function(state, playerIsDefending) {
  // state = [Jcs, Jdefense, Jpv, Jaction, IAcs, IAdefense, IApv]
  return `Jcs:${state[0]}_Jdef:${state[1]}_activeDef:${playerIsDefending ? 1 : 0}_IAcs:${state[4]}_IAdef:${state[5]}`;
};

App.evaluateAction = function(state, action, predictedPlayerAction, difficultyModifier, playerIsDefending) {
  const [Jcs, Jdefense, Jpv, JlastAction, IAcs, IAdefense, IApv] = state;
  let score = 0;

  const JpvPrecise = Math.round((App.playerCharacter.pv / App.playerCharacter.pv_max) * 100);
  const IApvPrecise = Math.round((App.opponentCharacter.pv / App.opponentCharacter.pv_max) * 100);
  const playerAttack = App.playerCharacter.attaque;
  const opponentAttack = App.opponentCharacter.attaque;
  const playerSpecialCharge = App.playerCharacter.spe;
  const opponentSpecialCharge = App.opponentCharacter.spe;

  // --- Évaluation de l'action "attacker" ---
  if (action === "attacker") {
    score += (100 - JpvPrecise) * 0.2;
    if (predictedPlayerAction === "attacker") {
      score += 5;
      score -= playerAttack * 0.1;
    }
    if (predictedPlayerAction === "utiliser capacité spéciale") {
      score -= 15;
    }
    if (difficultyModifier > 0) {
      if (Jdefense === 1) score -= 10;
      if (predictedPlayerAction === "se défendre" && IApv > 50) score += 5;
      if (JlastAction === "utiliser capacité spéciale") score += 5;
    }
    score += opponentAttack * 0.05;
  }
  // --- Évaluation de l'action "utiliser capacité spéciale" ---
  else if (action === "utiliser capacité spéciale") {
    score += (100 - JpvPrecise) * 0.35;
    score += opponentSpecialCharge * 10;
    if (playerSpecialCharge < 0.2) {
      score += 5;
    } else {
      score -= playerSpecialCharge * 5;
    }
    if (predictedPlayerAction === "se défendre") {
      score -= 20;
    }
    if (difficultyModifier > 0) {
      if (Jdefense === 1 || predictedPlayerAction === "se défendre") score -= 25;
      if (App.playerCharacter.specialCharge && App.playerCharacter.specialCharge > 0.25) score -= 15;
      if (JlastAction === "utiliser capacité spéciale") score -= 5;
    }
    score += opponentAttack * 0.2;
  }
  // --- Évaluation de l'action "se défendre" ---
  else if (action === "se défendre") {
    if (predictedPlayerAction === "attacker") {
      score += 12;
      score += playerAttack * 0.2;
    }
    if (predictedPlayerAction === "utiliser capacité spéciale") {
      score += 35;
    }
    // Bonus : si le joueur peut utiliser sa capacité spéciale
    if (Jcs === 1) {
      score += 30;
    }
    score += JpvPrecise * 0.1;
    if (difficultyModifier > 0) {
      if (Jcs === 0 && App.playerCharacter.specialCharge && App.playerCharacter.specialCharge > 0.5 && IApv > 30) score -= 20;
      if (JlastAction === "attacker" && Jpv > 60) score -= 10;
      if (IApv < 30) score += 15;
      if (JlastAction === "se défendre") score -= 5;
    }
  }

  score += difficultyModifier * 10;
  if (IApv < 50 && action === "se défendre") {
    score += 12;
  }


  // Bonus adaptatif selon les statistiques de la situation
  const situationKey = App.getSituationKey(state, playerIsDefending);
  if (App.situationStats[situationKey] &&
    App.situationStats[situationKey][action] &&
    App.situationStats[situationKey][action].count > 0) {
    let avgDelta = App.situationStats[situationKey][action].totalDelta / App.situationStats[situationKey][action].count;
    score += avgDelta * 0.5;
  }
  if (App.opponentCharacter.defense_droit > 0 && action === "se défendre") {
    score = -9999;
  }

  return score;
};

App.chooseBestAction = function(IA, state, predictedPlayerAction, difficultyModifier, playerIsDefending) {
  const possibleActions = ["attacker"];
  if (App.opponentCharacter.spe >= 1) {
    possibleActions.push("utiliser capacité spéciale");
  }
  if (!App.opponentCharacter.defenseCooldown || App.opponentCharacter.defenseCooldown === 0 && App.opponentCharacter.spe >= 0.1) {
    possibleActions.push("se défendre");
  }

  let bestAction = possibleActions[0];
  let bestScore = -Infinity;
  possibleActions.forEach(action => {
    const score = App.evaluateAction(state, action, predictedPlayerAction, difficultyModifier, playerIsDefending);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  });

  if (userData.difficulty === "Easy" && Math.random() < 0.3) {
    bestAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
  }

  return bestAction;
};

App.executeAITurn = function(chosenAction) {
  const delay = Math.floor(Math.random() * 1800) + 200; // délai entre 1s et 3s
  setTimeout(() => {
    if (chosenAction === "attacker") {
      App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
      App.opponentCharacter.spe += 0.1;
    } else if (chosenAction === "utiliser capacité spéciale") {
      App.useSpecialAbility(App.opponentCharacter, App.playerCharacter, false);
    } else if (chosenAction === "se défendre") {
      App.opponentDefense();
      App.opponentCharacter.defenseCooldown = 3;
    } else {
      App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
      App.opponentCharacter.spe += 0.1;
    }
    document.getElementById('attack-button').disabled = false;
    document.getElementById('special-button').disabled = false;
    document.getElementById('defense-button').disabled = false;
    document.getElementById('items-button').disabled = false;
    App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
  }, delay);
};

App.arraysEqual = function(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

App.predictPlayerNextActionBySequence = function(order = 2) {
  if (App.playerActionHistory.length < order) return null;
  const sequence = App.playerActionHistory.slice(-order);
  const counts = {};

  for (let i = 0; i <= App.historicalData.length - order - 1; i++) {
    let histSequence = [];
    for (let j = 0; j < order; j++) {
      histSequence.push(App.historicalData[i + j][3]);
    }
    if (App.arraysEqual(histSequence, sequence)) {
      if (i + order < App.historicalData.length) {
        let nextAction = App.historicalData[i + order][3];
        counts[nextAction] = (counts[nextAction] || 0) + 1;
      }
    }
  }

  if (Object.keys(counts).length === 0) return null;
  return App.weightedRandomAction(counts);
};

App.opponentTurn = function() {
  // Désactivation des boutons d'action
  if (App.opponentCharacter.spe >= 1) {
    App.opponentCharacter.spe = 1;
  }
  App.opponentCharacter.defenseCooldown = 3;
  userData = getUserData();
  document.getElementById('attack-button').disabled = true;
  document.getElementById('special-button').disabled = true;
  document.getElementById('defense-button').disabled = true;
  document.getElementById('items-button').disabled = true;

  // Gestion du cooldown de défense pour l'IA
  if (typeof App.opponentCharacter.defenseCooldown === 'undefined') {
    App.opponentCharacter.defenseCooldown = 0;
  } else if (App.opponentCharacter.defenseCooldown > 0) {
    App.opponentCharacter.defenseCooldown--;
  }

  // Construction de l'état courant
  let Jdefense = (App.playerCharacter.defense_droit >= 1) ? 1 : 0;
  let Jcs = (App.playerCharacter.spe >= 1) ? 1 : 0;
  let Jpv = Math.min(Math.ceil((App.playerCharacter.pv / App.playerCharacter.pv_max) * 100 / 20) * 20, 100);
  let Jaction = App.playerCharacter.last_action;
  let IAdefense = (App.opponentCharacter.defense_droit >= 1) ? 1 : 0;
  let IAcs = (App.opponentCharacter.spe >= 1) ? 1 : 0;
  let IApv = Math.min(Math.ceil((App.opponentCharacter.pv / App.opponentCharacter.pv_max) * 100 / 20) * 20, 100);


  App.playerActionHistory.push(Jaction);
  if (App.playerActionHistory.length > 30) {
    App.playerActionHistory = App.playerActionHistory.slice(-30);
  }
  App.savePlayerActionHistory(App.playerActionHistory);

  const currentState = [Jcs, Jdefense, Jpv, Jaction, IAcs, IAdefense, IApv];

  const playerIsDefending = (App.playerCharacter.defense_droit === 4);
  const currentSituationKey = App.getSituationKey(currentState, playerIsDefending);

  // Mise à jour des statistiques de la situation précédente
  let currentPlayerHP = App.playerCharacter.pv;
  let currentAIHP = App.opponentCharacter.pv;
  if (
    App.lastSituationKey !== null &&
    App.lastAIAction !== null &&
    App.lastState !== null &&
    App.lastPlayerHP !== null &&
    App.lastAIHP !== null
  ) {
    let deltaPlayer = App.lastPlayerHP - currentPlayerHP;
    let deltaAI = App.lastAIHP - currentAIHP;
    let effectiveDelta = deltaPlayer - deltaAI;
    if (Math.abs(effectiveDelta) < 100) {
      effectiveDelta = 0;
    }
    if (!App.situationStats[App.lastSituationKey]) {
      App.situationStats[App.lastSituationKey] = {
        "attacker": { totalDelta: 0, count: 0 },
        "utiliser capacité spéciale": { totalDelta: 0, count: 0 },
        "se défendre": { totalDelta: 0, count: 0 }
      };
    }
    App.situationStats[App.lastSituationKey][App.lastAIAction].totalDelta += effectiveDelta;
    App.situationStats[App.lastSituationKey][App.lastAIAction].count++;
  }

  // Choix de l'action pour ce tour
  let currentAction = App.opponentCharacter.nextAction;
  if (!currentAction) {
    const possibleActions = ["attacker"];
    if (App.opponentCharacter.spe >= 0.8) possibleActions.push("utiliser capacité spéciale");
    if (!App.opponentCharacter.defenseCooldown || App.opponentCharacter.defenseCooldown === 0) possibleActions.push("se défendre");
    currentAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
  }
  App.executeAITurn(currentAction);

  // Mise à jour de l'historique
  App.historicalData.push(currentState);
  App.saveHistoricalData(App.historicalData);

  // Paramètres de difficulté
  let difficultyModifier = 0;
  let predictionAccuracy = 0.75;
  if (userData.difficulty === "Easy") {
    difficultyModifier = -0.2;
    predictionAccuracy = 0.5;
  } else {
    difficultyModifier = 0.2;
    predictionAccuracy = 1;
  }

  // Prédiction de l'action du joueur
  const similarData = App.findSimilarData(currentState, App.historicalData);
  let predictedPlayerAction = App.mostProbableAction(similarData);
  if (Math.random() > predictionAccuracy) {
    predictedPlayerAction = null;
  }

  // Planification du prochain coup de l'IA
  const nextAction = App.chooseBestAction(App.opponentCharacter, currentState, predictedPlayerAction, difficultyModifier, playerIsDefending);
  App.opponentCharacter.nextAction = nextAction;

  // Stockage de l'état pour la prochaine mise à jour
  App.lastState = currentState;
  App.lastAIAction = currentAction;
  App.lastSituationKey = currentSituationKey;
  App.lastPlayerHP = currentPlayerHP;
  App.lastAIHP = currentAIHP;

  // Passage au tour suivant
  App.adversairepasser_tour();
  App.joueurpasser_tour();
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
};

App.opponentDefense = function() {
  let specialLogMessage = "";
  let logColor = 'null';
  App.opponentCharacter.isDefending = true;
  App.opponentCharacter.spe -= 0.1;
  const isPlayer = false;
  App.opponentCharacter.defense_droit = 4;

  const soin = Math.round(App.opponentCharacter.degats_subit * 0.8);
  let attaque = App.opponentCharacter.attaque;
  App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque * 0.8);
  App.opponentCharacter.pv += soin;

  specialLogMessage = `${App.opponentCharacter.name} se defend de la dernière attaque de ${App.playerCharacter.name}.`;
  App.addCombatLog(specialLogMessage, logColor, isPlayer);

  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.scrollToBottom();

  App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
  App.opponentCharacter.attaque = attaque;
};

App.handleDefense = function(character, opponent, isPlayer) {
  let specialLogMessage = "";
  let logColor = 'null';
  if (character.defense_droit === 0) {
    if (character.spe >= 0.1) {
      character.spe -= 0.1;
      character.defense_bouton = 1;
      character.defense_droit = 4;
      specialLogMessage = `${character.name} se defend contre la prochaine attaque de ${opponent.name}.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      if (isPlayer) {
        character.last_action = 1;
        character.defense_partie += 1;

        App.scrollToBottom();
        App.opponentTurn();
      }
    } else {
      specialLogMessage = `${character.name} n'a pas assez d'énergie spéciale pour se défendre !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, true);
    }
  } else if (isPlayer) {
    specialLogMessage = `${character.name} ne peut pas se défendre avant dans ${character.defense_droit} tours.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    App.handleAttack(character, opponent, true);
  } else if (!isPlayer) {
    specialLogMessage = `${character.name} ne peut pas se défendre avant dans ${character.defense_droit} tours.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    combatLog.appendChild(entry);
  }
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.scrollToBottom();
};

// --- Sélection d’objets ---
App.showItemSelection = function() {
  const userData = getUserData();
  const itemSelectionDiv = document.getElementById('item-selection');
  itemSelectionDiv.style.display = 'block';
  itemSelectionDiv.innerHTML = '<h3>Choisissez un objet à utiliser</h3>';

  const availableItems = [];
  if (userData.crystal_acheté > 0 && App.playerCharacter.crystalUses < 2) {
    availableItems.push({ name: 'Crystal de renouveau', count: userData.crystal_acheté });
  }
  if (userData.Cape_acheté > 0 && App.playerCharacter.capeUses < 2) {
    availableItems.push({ name: "Cape de l'ombre", count: userData.Cape_acheté });
  }
  if (userData.bouclier_solide_acheté > 0) {
    availableItems.push({ name: 'Bouclier solide', count: userData.bouclier_solide_acheté });
  }
  if (userData.Potion_de_Santé_acheté > 0) {
    availableItems.push({ name: 'Potion de Santé', count: userData.Potion_de_Santé_acheté });
  }
  if (userData.armure_fer_acheté > 0 && App.playerCharacter.armureUses < 2) {
    availableItems.push({ name: 'Armure de Fer', count: userData.armure_fer_acheté });
  }
  if (userData.Amulette_de_Régénération_acheté > 0 && App.playerCharacter.amuletteUses < 1) {
    availableItems.push({ name: 'Amulette de Régénération', count: userData.Amulette_de_Régénération_acheté });
  }
  if (userData.epee_tranchante_acheté > 0) {
    availableItems.push({ name: 'Épée Tranchante', count: userData.epee_tranchante_acheté });
  }
  if (userData.elixir_puissance_acheté > 0) {
    availableItems.push({ name: 'Elixir de Puissance', count: userData.elixir_puissance_acheté });
  }

  if (App.playerCharacter.objets_utilise === 0) {
    if (!App.playerCharacter.inventaire_objets) {
      const shuffled = availableItems.sort(() => 0.5 - Math.random());
      App.playerCharacter.selectedItems = shuffled.slice(0, 3);
      App.playerCharacter.inventaire_objets = true;
    }
    App.playerCharacter.selectedItems.forEach(item => {
      const btn = document.createElement('button');
      btn.textContent = `${item.name} (${item.count})`;
      btn.onclick = () => App.useItem(item.name);
      itemSelectionDiv.appendChild(btn);
    });
    const cancel = document.createElement('button');
    cancel.textContent = 'Annuler';
    cancel.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancel);

  } else {
    const cancel = document.createElement('button');
    cancel.textContent = 'Annuler';
    cancel.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancel);
  }
};

App.hideItemSelection = function() {
  document.getElementById('item-selection').style.display = 'none';
};

App.useItem = function(itemName) {
  const userData = getUserData();
  App.playerCharacter.objets_utilise = 1;

  switch (itemName) {
    case 'Crystal de renouveau':
      userData.crystal_acheté -= 1;
      App.playerCharacter.crystalUses += 1;
      App.playerCharacter.spe = Math.min(1, App.playerCharacter.spe + 0.8);
      saveUserData(userData);
      App.updateUI();
      break;
    case "Cape de l'ombre":
      userData.Cape_acheté -= 1;
      App.playerCharacter.capeUses += 1;
      App.playerCharacter.cape = true;
      saveUserData(userData);
      break;
    case 'Potion de Santé':
      userData.Potion_de_Santé_acheté -= 1;

      App.playerCharacter.pv = Math.min(App.playerCharacter.pv_maximum, App.playerCharacter.pv + 1100);
      App.playerCharacter.objets_partie += 1;
      App.playerCharacter.objets_soin += 1;
      saveUserData(userData);
      break;
    case 'Amulette de Régénération':
      userData.Amulette_de_Régénération_acheté -= 1;
      App.playerCharacter.amuletteUses += 1;
      App.playerCharacter.amulette_soin = 1;
      App.playerCharacter.objets_partie += 1;
      App.playerCharacter.objets_soin += 1;
      saveUserData(userData);
      break;
    case 'Épée Tranchante':
      userData.epee_tranchante_acheté -= 1;
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque * 1.05);
      App.playerCharacter.objets_partie += 1;
      saveUserData(userData);
      App.updateUI();
      break;
    case 'Elixir de Puissance':
      userData.elixir_puissance_acheté -= 1;
      App.playerCharacter.attaque += 50;
      App.playerCharacter.objets_partie += 1;
      saveUserData(userData);
      break;
    case 'Armure de Fer':
      userData.armure_fer_acheté -= 1;
      App.playerCharacter.armureUses += 1;
      App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque * 0.90);
      App.playerCharacter.objets_partie += 1;
      saveUserData(userData);
      break;
    case 'Bouclier solide':
      userData.bouclier_solide_acheté -= 1;
      App.playerCharacter.defense += 15;
      App.playerCharacter.objets_partie += 1;
      saveUserData(userData);
      break;
    default:

  }

  document.getElementById('player-pv').textContent = `PV: ${Math.round(App.playerCharacter.pv)}`;
  App.hideItemSelection();

  App.addCombatLog(specialLogMessage, logColor, isPlayer);
  App.scrollToBottom();
};

// --- Chargement initial au onload ---
// --- Défilement du journal ---
App.scrollToBottom = function() {
  const log = document.getElementById('combat-log');
  log.scrollTop = log.scrollHeight;
};

// --- Options de montée en niveau ---
// Affiche les options d’amélioration en fonction de last_upgrade
App.showUpgradeOptions = function() {
  const div = document.getElementById('upgrade-options');
  const last = App.playerCharacter.last_upgrade; // "null", "pv", "attaque" ou "defense"

  div.style.display = 'block';
  App.disableActionButtons(true);
  div.innerHTML = '<h3>Choisissez une amélioration</h3>';

  ['pv', 'attaque', 'defense'].forEach(stat => {
    if (last === stat) return;  // n’affiche pas la stat déjà upgradeée

    const btn = document.createElement('button');
    btn.textContent = stat === 'pv'
      ? 'Augmenter PV'
      : stat === 'attaque'
        ? 'Augmenter Attaque'
        : 'Augmenter Défense';
    btn.onclick = () => App.upgradeStat(stat);
    div.appendChild(btn);
  });
};

// Cache les options et réactive les boutons d’action
App.hideUpgradeOptions = function() {
  document.getElementById('upgrade-options').style.display = 'none';
  App.disableActionButtons(false);
};

// Applique l’amélioration et met à jour last_upgrade
App.upgradeStat = function(stat) {
  // Restaure les valeurs avant amélioration
  let specialLogMessage = "";
  let logColor = 'null';
  App.playerCharacter.pv = App.playerCharacter.pv_max;
  App.playerCharacter.attaque = App.playerCharacter.attaque_originale;
  App.playerCharacter.defense = App.playerCharacter.defense_originale;

  switch (stat) {
    case 'pv':
      App.playerCharacter.pv_max = Math.round(App.playerCharacter.pv_max * 1.09);
      App.playerCharacter.pv = App.playerCharacter.pv_max;
      break;
    case 'attaque':
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque_originale * 1.13);
      App.playerCharacter.attaque_originale = App.playerCharacter.attaque;
      break;
    case 'defense':
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense_originale * 1.2);
      App.playerCharacter.defense_originale = App.playerCharacter.defense;
      break;
  }

  specialLogMessage = `${App.playerCharacter.name} a amélioré la stat ${stat}.`

  // Stocke la stat upgradeée pour la prochaine ouverture
  App.playerCharacter.last_upgrade = stat;
  App.updateUI();
  App.hideUpgradeOptions();

  App.addCombatLog(specialLogMessage, logColor, "center");
  App.scrollToBottom();
};


App.disableActionButtons = function(disable) {
  document.querySelectorAll('.combat-actions button').forEach(b => b.disabled = disable);
};

// --- Calcul des récompenses ---
App.calculateRewards = function(wave) {
  const userData = getUserData();
  const name = App.playerCharacter.name;
  const argent = Math.round((Math.floor(Math.random() * 7) + 3) * wave * 0.8);
  let xp = Math.round(25 * wave * 0.7);
  if (userData.Double_XP > 0) {
    xp *= 2;
    userData.Double_XP -= 1;
  }
  if (userData.XP_jour >= 5000) xp = 0;

  userData.argent = (userData.argent || 0) + argent;
  userData[`${name}_XP`] = (userData[`${name}_XP`] || 0) + xp;
  userData.pass_XP = (userData.pass_XP || 0) + xp;

  if (Math.random() < 0.1) {
    userData.recompense = (userData.recompense || 0) + 1;
  }
  userData.fin_manche = wave;
  userData.fin_xp = xp;
  userData.fin_argent = argent;
  saveUserData(userData);

  const log = document.getElementById('combat-log');
  log.innerHTML += `<p>Vous avez été vaincu à la vague ${wave}. Voici vos récompenses :</p>
                    <p>Argent gagné: ${argent}</p>
                    <p>XP gagné: ${xp}</p>`;
  App.scrollToBottom();

  setTimeout(() => {
    sessionStorage.removeItem('playerCharacter');
    sessionStorage.removeItem('opponentCharacter');
    loadPage('fin_partie_survie');
  }, 2000);
};




// --- Marquer la partie comme commencée ---
App.ud = getUserData();
App.opponentCharacter = null;
App.currentWave = 0;

// Lecture préalable
App.sauvegarde = null;
try {
  App.sauvegarde = JSON.parse(localStorage.getItem("savepartiesurvie"));
}
catch (e) {
}

if (App.sauvegarde && App.ud.partie_commencee_survie) {
  App.chargerPartie();
  App.updateUI();
} else {
  // nouvelle partie (votre code existant)
  const storedPlayer = sessionStorage.getItem('playerCharacter');
  if (storedPlayer) {
    App.playerCharacter = JSON.parse(storedPlayer);

    // Initialisation des nouvelles propriétés
    App.playerCharacter.perte_att = 0;
    App.playerCharacter.Oiseaudefense = 0;
    App.playerCharacter.perte_defense_colorina = 0;
    App.playerCharacter.pv_maximum = App.playerCharacter.pv;
    App.playerCharacter.amulette_soin = 0;
    App.playerCharacter.attaque_epee = 0;
    App.playerCharacter.attaque_elixir = 0;
    App.playerCharacter.armure = 0;
    App.playerCharacter.degats_partie = 0;
    App.playerCharacter.objets_partie = 0;
    App.playerCharacter.capacite_partie = 0;
    App.playerCharacter.degats_partie_base = 0;
    App.playerCharacter.objets_soin = 0;
    App.playerCharacter.defense_bouton = 0;
    App.playerCharacter.defense_droit = 0;
    App.playerCharacter.defense_solide = 0;
    App.playerCharacter.defense_partie = 0;
    App.playerCharacter.immobilisation = 0;
    App.playerCharacter.sboonie_attaque = 0;
    App.playerCharacter.poulpy_att = 0;
    App.playerCharacter.objets_utilise = 0;
    App.playerCharacter.inventaire_objets = false;
    App.playerCharacter.amuletteUses = 0;
    App.playerCharacter.armureUses = 0;
    App.playerCharacter.tour = 1;
    App.playerCharacter.cape = false;
    App.playerCharacter.capeUses = 0;
    App.playerCharacter.crystalUses = 0;
    App.playerCharacter.inconnu_super = 0;
    App.playerCharacter.last_action = 0;
    App.playerCharacter.tourTT = 0;
    App.playerCharacter.Perro = 0;
    App.playerCharacter.soin = 0;
    App.playerCharacter.MaxDegats = 0;
    App.playerCharacter.amulette_heal = 0;
    App.playerCharacter.last_upgrade = "null";
  } else {
    // Redirection vers index.html via loadPage si les données du joueur ne sont pas trouvées
    loadPage('index');
  }

  // Récupération et initialisation du personnage adverse
  if (storedPlayer) {
    App.opponentCharacter = App.generateRandomOpponent(App.currentWave);

    App.opponentCharacter.perte_att = 0;
    App.opponentCharacter.Oiseaudefense = 0;
    App.opponentCharacter.perte_defense_colorina = 0;
    App.opponentCharacter.pv_maximum = App.opponentCharacter.pv;
    App.opponentCharacter.immobilisation = 0;
    App.opponentCharacter.defense_bouton = 0;
    App.opponentCharacter.defense_droit = 0;
    App.opponentCharacter.sboonie_attaque = 0;
    App.opponentCharacter.poulpy_att = 0;
    App.opponentCharacter.degats_subit = 0;
    App.opponentCharacter.inconnu_super = 0;
    App.opponentCharacter.next_choice = "0";
    App.opponentCharacter.isDefending = false;
    App.opponentCharacter.Perro = 0;
    App.opponentCharacter.PVAVANT = App.opponentCharacter.pv;
    App.opponentCharacter.PVAPRES = App.opponentCharacter.pv;
  } else {
    // Redirection vers index.html via loadPage si les données de l'adversaire ne sont pas trouvées
    loadPage('index');
  }
  // création de la première sauvegarde
  App.specialAbility = App.playerCharacter.spe || 0;
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
  userData = getUserData();
  userData.partie_commencee_survie = true;
  saveUserData(userData);
  App.updateUI();
}
function initStatsPanelState() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  panel.classList.remove('active');
  panel.classList.add('inactive');
}

// 2) Fonction de rendu (inchangée)
App.renderDetailedStats = function() {
  const container = document.getElementById('detailed-stats-content');
  if (!container) return;
  container.innerHTML = '';
  if (!App.playerCharacter || !App.opponentCharacter) {
    container.innerHTML = '<p>Aucune partie chargée…</p>';
    return;
  }
  container.innerHTML = `
    <div class="stats-block">
      <h5>${App.playerCharacter.name}</h5>
      <ul>
        PV : ${App.playerCharacter.pv} / ${App.playerCharacter.pv_max}<br><br>
        Attaque : ${App.playerCharacter.attaque} / ${App.playerCharacter.attaque_originale}<br><br>
        Défense : ${App.playerCharacter.defense} / ${App.playerCharacter.defense_originale}
    </div>
    <div class="stats-block">
      <h5>${App.opponentCharacter.name}</h5>
      <ul>
        PV : ${App.opponentCharacter.pv} / ${App.opponentCharacter.pv_max}<br><br>
        Attaque : ${App.opponentCharacter.attaque} / ${App.opponentCharacter.attaque_originale}<br><br>
        Défense : ${App.opponentCharacter.defense} / ${App.opponentCharacter.defense_originale}
    </div>
  `;
};
if (App.playerCharacter.name === "Boompy") {
  document.getElementById('special-button').style.display = 'none';
}

// 3) Toggle (inchangé)
App.toggleStatsPanel = function() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  if (panel.classList.contains('inactive')) {
    panel.classList.replace('inactive', 'active');
    document.getElementById('attack-button').disabled = true;
    document.getElementById('special-button').disabled = true;
    document.getElementById('defense-button').disabled = true;
    document.getElementById('items-button').disabled = true;
    App.renderDetailedStats();
  } else {
    panel.classList.replace('active', 'inactive');
    document.getElementById('attack-button').disabled = false;
    document.getElementById('special-button').disabled = false;
    document.getElementById('defense-button').disabled = false;
    document.getElementById('items-button').disabled = false;
  }
};

// 4) Écouteur délégué
document.body.addEventListener('click', function(e) {
  // Si on clique sur l'élément (ou un de ses enfants) qui a l'id toggle-stats
  if (e.target.closest('#toggle-stats')) {
    App.toggleStatsPanel();
  }
});

initStatsPanelState();