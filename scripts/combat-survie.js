// Définition du namespace global
window.App = window.App || {};

// --- Passage de tour adversaire ---
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
    pv_maximum: basePv,
    attaque: Math.round(baseAttaque * scale),
    defense: Math.round(baseDefense * scale),
    spe: 0
  };
};

App.updateUI = function() {
  App.playerCharacter.pv = Math.round(App.playerCharacter.pv);
  App.opponentCharacter.pv = Math.round(App.opponentCharacter.pv);
  document.getElementById('player-name').textContent = App.playerCharacter.name;
  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
  document.getElementById('opponent-pv').textContent = `PV: ${App.opponentCharacter.pv}`;
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
};

App.updateSpecialBar = function(character, elementId) {
  const specialBar = document.getElementById(elementId);
  const fillElement = specialBar.querySelector('.special-fill');
  fillElement.style.width = `${(character.spe / 1) * 100}%`;
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

App.nextWave = function() {
  App.currentWave++;
  const combatLog = document.getElementById('combat-log');
  combatLog.innerHTML += `<p>Adversaire ${App.currentWave} Vaincu.</p>`;
  App.opponentCharacter = App.generateRandomOpponent(App.currentWave);
  App.updateUI();
  App.showUpgradeOptions();
};

App.handleAttack = function(attacker, defender, isPlayerAttacking) {
  const combatLog = document.getElementById('combat-log');
  const logEntry = document.createElement('p');
  logEntry.style.color = '#CC3333';
  const defenseModifier = 0.9 + Math.random() * 0.2;
  const modifiedDefense = Math.round(defender.defense * defenseModifier);
  let damage = Math.max(0, attacker.attaque - modifiedDefense);
  if (attacker.name === "Boompy" && attacker.spe >= 1) {
    damage = Math.max(0, attacker.attaque * 1.5 - modifiedDefense);
    attacker.spe -= 1;
    logEntry.textContent = `${attacker.name} est surchargé, il inflige 150% de ses dégâts de base`;
    combatLog.appendChild(logEntry);
    logEntry.scrollIntoView();
  }


  if (defender.cape) {
    damage = 0;
    logEntry.textContent = `${defender.name} a utilisé une cape de l'ombre, ${attacker.name} ne l'a donc pas atteint !`;
  }

  defender.pv = Math.max(0, defender.pv - damage);

  if (isPlayerAttacking) {
    logEntry.textContent = `Vous attaquez et infligez ${damage} points de dégâts à ${defender.name}.`;
    document.getElementById('opponent-pv').textContent = `PV: ${defender.pv}`;
  } else {
    logEntry.textContent = `${attacker.name} attaque et inflige ${damage} points de dégâts.`;
    document.getElementById('player-pv').textContent = `PV: ${defender.pv}`;
  }

  combatLog.appendChild(logEntry);
  logEntry.scrollIntoView();

  if (defender.pv <= 0 && !isPlayerAttacking) {
    const userData = getUserData();
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
    if (App.currentWave >= 5 && userData.Summer15_active) {
      userData.Summer15_current += 1;
      saveUserData(userData);
    }

    App.calculateRewards(App.currentWave);
  }
};

App.opponentTurn = function() {
  const useSpecialMove = Math.random() < 0.5 && App.opponentCharacter.spe >= 1;
  if (useSpecialMove) {
    App.useSpecialAbility(App.opponentCharacter, App.playerCharacter, false);
  } else {
    App.opponentCharacter.spe += 0.1;
    App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
    App.updateUI();
  }

  if (App.playerCharacter.pv <= 0) {
    const userData = getUserData();
    if (userData.semaine3) {
      userData.semaine3_manches = App.currentWave;
    }
    if (App.currentWave >= userData.manches_max) {
      userData.manches_max = App.currentWave;
    }
    saveUserData(userData);

    const combatLog = document.getElementById('combat-log');
    combatLog.innerHTML += `<p>${App.opponentCharacter.name} vous a vaincu à la vague ${App.currentWave + 1}.</p>`;
    combatLog.lastChild.scrollIntoView();
  }
};

App.useSpecialAbility = function(character, opponent, isPlayer) {
  if (character.spe < 1) return;

  // Décrémente la quantité de la capacité spéciale utilisée
  character.spe -= 1;
  if (isPlayer) {
    character.capacite_partie += 1;
  }

  let specialLogMessage = "";
  const combatLog = document.getElementById('combat-log');

  // Immobilisation
  if (character.immobilisation >= 1) {
    specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'a immobilisé, donc tout échoue.`;
    const entry = document.createElement('p');
    entry.textContent = specialLogMessage;
    entry.style.color = "#9966CC";
    combatLog.appendChild(entry);

    // Protection bouton défense
  } else if (opponent.defense_bouton === 1) {
    opponent.defense_bouton = 0;
    specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'en empêche, donc tout échoue.`;
    const entry = document.createElement('p');
    entry.textContent = specialLogMessage;
    entry.style.color = "#9966CC";
    combatLog.appendChild(entry);

    // Blocage inconnu_super
  } else if (character.inconnu_super >= 1) {
    specialLogMessage = `${character.name} ne peut pas utiliser sa capacité spéciale, bloqué pour encore ${character.inconnu_super} tours.`;
    character.spe += 1;
    const entry = document.createElement('p');
    entry.textContent = specialLogMessage;
    entry.style.color = "#9966CC";
    combatLog.appendChild(entry);
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

      // Adversaires spécifiques
      case "Blitzkrieger": {
        const dmg = Math.max(0, Math.round(character.attaque * 2) - Math.round(opponent.defense * 0.8));
        opponent.pv -= dmg;
        character.degats_partie += dmg;
        specialLogMessage = `${character.name} inflige ${dmg} dégâts en ignorant 20% de défense.`;
        break;
      }
      case "Frostbite": {
        const dmg = Math.round(opponent.pv_maximum * 0.10);
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
        const extra = Math.round(opponent.pv_maximum * 0.05);
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
    const entry = document.createElement('p');
    entry.textContent = specialLogMessage;
    entry.style.color = "#9966CC";
    combatLog.appendChild(entry);

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
      console.log('Objet non reconnu');
  }

  document.getElementById('player-pv').textContent = `PV: ${Math.round(App.playerCharacter.pv)}`;
  App.hideItemSelection();

  const entry = document.createElement('p');
  entry.textContent = `${itemName} utilisé !`;
  document.getElementById('combat-log').appendChild(entry);
  App.scrollToBottom();
};

// --- Chargement initial au onload ---
window.onload = () => {
  const userData = getUserData();
  App.opponentCharacter = App.generateRandomOpponent(App.currentWave);
  App.updateUI();
};

// --- Défilement du journal ---
App.scrollToBottom = function() {
  const log = document.getElementById('combat-log');
  log.scrollTop = log.scrollHeight;
};

// --- Options de montée en niveau ---
App.showUpgradeOptions = function() {
  const div = document.getElementById('upgrade-options');
  div.style.display = 'block';
  App.disableActionButtons(true);
  div.innerHTML = '<h3>Choisissez une amélioration</h3>';

  ['pv', 'attaque', 'defense'].forEach(stat => {
    const btn = document.createElement('button');
    btn.textContent = stat === 'pv' ? 'Augmenter PV' : stat === 'attaque' ? 'Augmenter Attaque' : 'Augmenter Défense';
    btn.onclick = () => App.upgradeStat(stat);
    div.appendChild(btn);
  });
};

App.hideUpgradeOptions = function() {
  document.getElementById('upgrade-options').style.display = 'none';
  App.disableActionButtons(false);
};

App.upgradeStat = function(stat) {
  App.playerCharacter.pv = App.playerCharacter.pv_maximum;
  switch (stat) {
    case 'pv':
      App.playerCharacter.pv_maximum = Math.round(App.playerCharacter.pv_maximum * 1.1);
      App.playerCharacter.pv = App.playerCharacter.pv_maximum;
      break;
    case 'attaque':
      App.playerCharacter.attaque *= 1.15;
      break;
    case 'defense':
      App.playerCharacter.defense *= 1.2;
      break;
  }
  App.updateUI();
  App.hideUpgradeOptions();

  const entry = document.createElement('p');
  entry.textContent = `Amélioration appliquée: ${stat}`;
  document.getElementById('combat-log').appendChild(entry);
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
  if (userData.XP_jour >= 2500) xp = 0;

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
App.ud.partie_commenceeee = true;
saveUserData(App.ud);
App.opponentCharacter = null;
App.currentWave = 0;
App.playerCharacter = sessionStorage.getItem('playerCharacter');
if (App.playerCharacter) {
  App.playerCharacter = JSON.parse(App.playerCharacter);
  App.initializeCharacter(App.playerCharacter);
}
if (App.playerCharacter.name === "Boompy") {
  document.getElementById('special-button').style.display = 'none'
}
App.opponentCharacter = App.generateRandomOpponent(App.currentWave)
App.updateUI();
