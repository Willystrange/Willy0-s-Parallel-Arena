// Assurez-vous que le namespace App existe
window.App = window.App || {};
userData = getUserData();

App.applyEvent = () => {
  const ev = localStorage.getItem("currentEvent");
  switch (ev) {
    case "PV égaux":
      alert(ev);
      if (App.playerCharacter.pv > App.opponentCharacter.pv) {
        App.opponentCharacter.pv = App.playerCharacter.pv;
      } else {
        App.playerCharacter.pv = App.opponentCharacter.pv;
      }
      break;
    case "Chargement /2":
      alert(ev);
      App.playerCharacter.chargement2 = true;
      App.opponentCharacter.chargement2 = true;
      App.playerCharacter.partie_mode = 1;
      break;
    case "Sans défense":
      alert(ev);
      App.playerCharacter.nodefense = true;
      App.opponentCharacter.nodefense = true;
      App.playerCharacter.partie_mode = 2;
      document.getElementById('defense-button').style.display = 'none';
      break;
    case "Sans objet":
      alert(ev);
      App.playerCharacter.noobject = true;
      App.playerCharacter.partie_mode = 3;
      document.getElementById('items-button').style.display = 'none';
      break;
    case "Points X2":
      alert(ev);
      App.playerCharacter.points2 = true;
      App.playerCharacter.partie_mode = 4;
      break;
    case "XP X2":
      alert(ev);
      App.playerCharacter.xp2 = true;
      App.playerCharacter.partie_mode = 5;
      break;
  }
  App.updateUI();
};

// --- Mise à jour de l’UI générale ---
App.updateUI = () => {
  App.playerCharacter.pv = Math.round(App.playerCharacter.pv);
  App.opponentCharacter.pv = Math.round(App.opponentCharacter.pv);

  document.getElementById('player-name').textContent = App.playerCharacter.name;
  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
  document.getElementById('opponent-pv').textContent = `PV: ${App.opponentCharacter.pv}`;

  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
};

// --- Barre de capacité spéciale ---
App.updateSpecialBar = (char, barId) => {
  const bar = document.getElementById(barId);
  const fill = bar.querySelector('.special-fill');
  fill.style.width = `${(char.spe / 1) * 100}%`;
};

// --- Bouton capacité spéciale ---
App.updateSpecialButton = () => {
  const btn = document.getElementById('special-button');
  if (App.specialAbility >= 1) {
    btn.classList.add('bright', 'grow');
    btn.textContent = 'Capacité spéciale';
  } else {
    btn.classList.remove('bright', 'grow');
    btn.textContent = `${App.specialAbility.toFixed(1)} / 1`;
  }
};

// --- Variables globales sous App ---
App.playerCharacter = null;
App.opponentCharacter = null;
App.specialAbility = 0;
App.events = [
  "PV égaux",
  "Chargement /2",
  "Sans défense",
  "Sans objet",
  "Points X2",
  "XP X2"
];
App.sauvegarde = null;

// --- Détection du mode (PWA vs navigateur) ---
; (function() {
  if (window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true) {
    document.body.classList.add('web-app');
  } else {
    document.body.classList.add('normal-app');
  }
})();

// --- Fonction de tirage de l’événement ---
App.spinEventWheel = () => {
  const wheel = document.getElementById("event-wheel");
  const label = document.getElementById("event-name");
  let spinCount = 0;
  const totalSpins = 17;
  const spinDuration = 150;

  wheel.style.display = "block";

  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * App.events.length);
    label.innerText = App.events[idx];
    spinCount++;

    if (spinCount > totalSpins) {
      clearInterval(interval);
      const selIdx = Math.floor(Math.random() * App.events.length);
      const ev = App.events[selIdx];
      label.innerText = ev;
      localStorage.setItem("currentEvent", ev);

      setTimeout(() => {
        wheel.style.display = "none";
        App.applyEvent();
      }, 2000);
    }
  }, spinDuration);
};

// --- Initialisation depuis sessionStorage (joueur + adversaire) ---
App.initFromSession = () => {
  const p = sessionStorage.getItem('playerCharacter');
  const o = sessionStorage.getItem('opponentCharacter');
  if (!p || !o) {

    return;
  }

  App.playerCharacter = JSON.parse(p);
  App.opponentCharacter = JSON.parse(o);

  // Initialisation des propriétés du joueur
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
  App.playerCharacter.chargement2 = false;
  App.playerCharacter.nodefense = false;
  App.playerCharacter.points2 = false;
  App.playerCharacter.xp2 = false;
  App.playerCharacter.noobject = false;
  App.playerCharacter.tourTT = 0;
  App.playerCharacter.Perro = 0;
  App.playerCharacter.soin = 0;
  App.playerCharacter.MaxDegats = 0;
  App.playerCharacter.amulette_heal = 0;

  // Initialisation des propriétés de l’adversaire
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
  App.opponentCharacter.chargement2 = false;
  App.opponentCharacter.nodefense = false;
  App.opponentCharacter.isDefending = false;
  App.opponentCharacter.Perro = 0;
  App.opponentCharacter.PVAVANT = App.opponentCharacter.pv;
  App.opponentCharacter.PVAPRES = App.opponentCharacter.pv;

  // Après init, mise à jour de l’UI
  App.specialAbility = App.playerCharacter.spe;
  App.updateUI();
  App.updateSpecialButton();
};

App.loadSavedGame = function() {
  const s = App.sauvegarde;
  App.playerCharacter = s.playerCharacter;
  App.opponentCharacter = s.opponentCharacter;

  if (App.playerCharacter.chargement2) {
    localStorage.setItem("currentEvent", "Chargement /2");
    App.applyEvent();
  }
  if (App.playerCharacter.nodefense) {
    localStorage.setItem("currentEvent", "Sans défense");
    App.applyEvent();
  }
  if (App.playerCharacter.noobject) {
    localStorage.setItem("currentEvent", "Sans objet");
    App.applyEvent();
  }

  App.updateUI();
  alert("Vous ne pouvez pas abandonner une partie !");
};

// --- Chargement de la sauvegarde 

// --- Chargement d’une partie sauvegardée ---


// --- Application de l’événement courant ---


// --- Gestion des tours ---
App.updateTour = () => {
  App.playerCharacter.tourTT++;
  App.addCombatLog(`Tour ${App.playerCharacter.tourTT}`, "grey", "milieu");
};

App.adversairePasserTour = () => {
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.opponentCharacter.PVAPRES = App.opponentCharacter.pv;
  const perte = App.opponentCharacter.PVAVANT - App.opponentCharacter.PVAPRES;
  if (perte > App.playerCharacter.MaxDegats) {
    App.playerCharacter.MaxDegats = perte;
  }
  if (App.opponentCharacter.inconnu_super >= 1) {
    App.opponentCharacter.inconnu_super--;
  }
  if (App.opponentCharacter.immobilisation >= 1) {
    App.opponentCharacter.immobilisation--;
  }
  if (App.opponentCharacter.defense_droit > 0) {
    App.opponentCharacter.defense_droit--;
  }
  if (App.opponentCharacter.perte_att > 0) {
    App.opponentCharacter.perte_att--;
    if (App.opponentCharacter.perte_att === 0) {
      App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque / 0.75);
    }
  }
  if (App.opponentCharacter.poulpy_att > 0) {
    App.opponentCharacter.poulpy_att--;
    if (App.opponentCharacter.poulpy_att === 0) {
      App.opponentCharacter.defense = Math.round(App.opponentCharacter.defense / 0.85);
    }
  }
  if (App.opponentCharacter.Oiseaudefense > 0) {
    App.opponentCharacter.Oiseaudefense--;
    if (App.opponentCharacter.Oiseaudefense === 0) {
      App.opponentCharacter.defense -= 20;
    }
  }
  if (App.opponentCharacter.perte_defense_colorina > 0) {
    App.opponentCharacter.perte_defense_colorina--;
    if (App.opponentCharacter.perte_defense_colorina === 0) {
      App.opponentCharacter.defense = Math.round(App.opponentCharacter.defense / 0.85);
    }
  }
  if (App.opponentCharacter.sboonie_attaque > 0) {
    App.opponentCharacter.sboonie_attaque--;
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
  App.opponentCharacter.PVAVANT = App.opponentCharacter.pv;
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
};

App.joueurPasserTour = () => {
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateUI();

  App.playerCharacter.tour++;
  App.playerCharacter.inventaire_objets = false;
  App.playerCharacter.objets_utilise = 0;

  if (App.playerCharacter.inconnu_super >= 1) {
    App.playerCharacter.inconnu_super--;
  }
  if (App.playerCharacter.cape) {
    App.playerCharacter.cape = false;
  }
  if (App.playerCharacter.immobilisation >= 1) {
    App.playerCharacter.immobilisation--;
  }
  if (App.playerCharacter.amulette_soin > 0) {
    App.playerCharacter.pv = Math.round(App.playerCharacter.pv + (App.playerCharacter.pv_maximum * 0.02));
    App.playerCharacter.soin += (App.playerCharacter.pv_maximum * 0.02);
    App.playerCharacter.amulette_heal += 1;
  }
  if (App.playerCharacter.defense_droit > 0) {
    App.playerCharacter.defense_droit--;
  }
  if (App.playerCharacter.perte_att > 0) {
    App.playerCharacter.perte_att--;
    if (App.playerCharacter.perte_att === 0) {
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque / 0.75);
    }
  }
  if (App.playerCharacter.poulpy_att > 0) {
    App.playerCharacter.poulpy_att--;
    if (App.playerCharacter.poulpy_att === 0) {
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense / 0.85);
    }
  }
  if (App.playerCharacter.Oiseaudefense > 0) {
    App.playerCharacter.Oiseaudefense--;
    if (App.playerCharacter.Oiseaudefense === 0) {
      App.playerCharacter.defense -= 20;
    }
  }
  if (App.playerCharacter.perte_defense_colorina > 0) {
    App.playerCharacter.perte_defense_colorina--;
    if (App.playerCharacter.perte_defense_colorina === 0) {
      App.playerCharacter.defense = Math.round(App.playerCharacter.defense / 0.85);
    }
  }
  if (App.playerCharacter.sboonie_attaque > 0) {
    App.playerCharacter.sboonie_attaque--;
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

// --- Affichage de la sélection d'objets ---
App.showItemSelection = function() {
  const itemSelectionDiv = document.getElementById('item-selection');
  itemSelectionDiv.style.display = 'block';

  // Réinitialisation du contenu
  itemSelectionDiv.innerHTML = '<h3>Choisissez un objet à utiliser</h3>';

  const userData = getUserData();
  const availableItems = [];

  // Construction de la liste des objets disponibles
  if (userData.crystal_acheté > 0 && App.playerCharacter.crystalUses < 2) {
    availableItems.push({ name: 'Crystal de renouveau', count: userData.crystal_acheté });
  }
  if (userData.bouclier_solide_acheté > 0) {
    availableItems.push({ name: 'Bouclier solide', count: userData.bouclier_solide_acheté });
  }
  if (userData.Cape_acheté > 0 && App.playerCharacter.capeUses < 2) {
    availableItems.push({ name: "Cape de l'ombre", count: userData.Cape_acheté });
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

  // Si aucun objet n'a encore été utilisé ce tour
  if (App.playerCharacter.objets_utilise === 0) {
    if (!App.playerCharacter.inventaire_objets) {
      // Mélanger et choisir 3 objets
      const shuffled = availableItems.sort(() => 0.5 - Math.random());
      App.playerCharacter.selectedItems = shuffled.slice(0, 3);
      App.playerCharacter.inventaire_objets = true;
    }

    // Affichage des objets sélectionnés
    App.playerCharacter.selectedItems.forEach(item => {
      const btn = document.createElement('button');
      btn.textContent = `${item.name} (${item.count})`;
      btn.onclick = () => App.useItem(item.name);
      itemSelectionDiv.appendChild(btn);
    });

    // Bouton Annuler
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancelBtn);

  } else {
    // Si un objet a déjà été utilisé : seul le bouton Annuler
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancelBtn);
  }
};

// --- Masquer la sélection d'objets ---
App.hideItemSelection = function() {
  document.getElementById('item-selection').style.display = 'none';
};

// --- Utilisation d'un objet ---
App.useItem = function(itemName) {
  const userData = getUserData();
  App.playerCharacter.objets_utilise = 1;

  switch (itemName) {
    case 'Crystal de renouveau':
      userData.crystal_acheté--;
      App.playerCharacter.crystalUses++;
      App.playerCharacter.spe = Math.min(1, App.playerCharacter.spe + 0.8);
      saveUserData(userData);
      App.updateUI();
      break;

    case "Cape de l'ombre":
      userData.Cape_acheté--;
      App.playerCharacter.capeUses++;
      App.playerCharacter.cape = true;
      saveUserData(userData);
      break;

    case 'Potion de Santé':
      userData.Potion_de_Santé_acheté--;
      App.playerCharacter.pv = Math.min(App.playerCharacter.pv_maximum, App.playerCharacter.pv + 1100);
      App.playerCharacter.objets_partie++;
      App.playerCharacter.objets_soin++;
      saveUserData(userData);
      break;

    case 'Amulette de Régénération':
      userData.Amulette_de_Régénération_acheté--;
      App.playerCharacter.amuletteUses++;
      App.playerCharacter.amulette_soin = 1;
      App.playerCharacter.objets_partie++;
      App.playerCharacter.objets_soin++;
      saveUserData(userData);
      break;

    case 'Épée Tranchante':
      userData.epee_tranchante_acheté--;
      App.playerCharacter.attaque = Math.round(App.playerCharacter.attaque * 1.05);
      App.playerCharacter.objets_partie++;
      saveUserData(userData);
      break;

    case 'Elixir de Puissance':
      userData.elixir_puissance_acheté--;
      App.playerCharacter.attaque += 50;
      App.playerCharacter.objets_partie++;
      saveUserData(userData);
      break;

    case 'Armure de Fer':
      userData.armure_fer_acheté--;
      App.playerCharacter.armureUses++;
      App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque * 0.90);
      App.playerCharacter.objets_partie++;
      saveUserData(userData);
      break;

    case 'Bouclier solide':
      userData.bouclier_solide_acheté--;
      App.playerCharacter.defense += 15;
      App.playerCharacter.objets_partie++;
      saveUserData(userData);
      break;

    default:
  }

  // Mise à jour de l’UI et du journal
  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  App.hideItemSelection();
  App.addCombatLog(`${itemName} utilisé !`, 'white', null);
  App.updateDisplay(true, App.playerCharacter);
};

// --- Ajout d'un message dans le journal de combat ---
App.addCombatLog = function(message, color, isPlayer) {
  const log = document.getElementById('combat-log');
  const entry = document.createElement('p');
  entry.textContent = message;
  entry.style.color = color;
  if (isPlayer === true) entry.style.textAlign = 'left';
  else if (isPlayer === false) entry.style.textAlign = 'right';
  else entry.style.textAlign = 'center';
  log.appendChild(entry);
};

// --- Mise à jour générale de l’affichage ---
App.updateDisplay = function(isPlayer, character) {
  const id = isPlayer ? 'player-pv' : 'opponent-pv';
  document.getElementById(id).textContent = `PV: ${character.pv}`;
  if (isPlayer) App.updateSpecialButton();
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.scrollToBottom();
};

// --- Utilisation de la capacité spéciale complète ---
App.useSpecialAbility = function(character, opponent, isPlayer) {
  if (character.spe < 1) {
    App.addCombatLog(
      `${character.name} a tenté d'utiliser sa capacité spéciale, mais n'avait pas assez d'énergie.`,
      'white',
      isPlayer
    );
    App.handleAttack(character, opponent, isPlayer);
    return;
  }

  // Consommation de l'énergie
  character.spe -= 1;
  if (isPlayer) {
    App.specialAbility -= 1;
    character.capacite_partie++;
    character.last_action = 2;
  }

  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }

  let specialLogMessage = '';

  // Blocages et effets existants
  if (character.immobilisation >= 1) {
    specialLogMessage = `${character.name} est immobilisé·e, la capacité échoue.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    return;
  }
  if (opponent.defense_bouton === 1) {
    opponent.defense_bouton = 0;
    specialLogMessage = `${opponent.name} a paré la capacité spéciale !`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    return;
  }
  if (character.inconnu_super >= 1) {
    specialLogMessage = `${character.name} est bloqué·e, la capacité spéciale est annulée.`;
    character.spe += 1;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    App.handleAttack(character, opponent, isPlayer);
    return;
  }

  // Effets spécifiques selon le personnage
  switch (character.name) {
    case 'Diva':
      opponent.attaque = Math.round(opponent.attaque * 0.75);
      specialLogMessage = `Diva réduit l'attaque de ${opponent.name} pendant 3 tours.`;
      opponent.perte_att += 3;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, isPlayer);
      break;

    case 'Willy':
      character.spe -= 0.25;
      specialLogMessage = `Willy effectue une attaque spéciale !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, isPlayer);
      character.last_action = 2;
      break;

    case 'Baleine':
      if (character.defense < 29) {
        specialLogMessage = "Baleine n'a plus assez de défense, attaque normale.";
        App.addCombatLog(specialLogMessage, logColor, isPlayer);
        App.handleAttack(character, opponent, isPlayer);
      } else {
        specialLogMessage = "Baleine perd 15 de défense et gagne 1000 PV !";
        App.addCombatLog(specialLogMessage, logColor, isPlayer);
        character.defense -= 15;
        character.pv += 1000;
        App.handleAttack(character, opponent, isPlayer);
      }
      break;

    case 'Doudou':
      character.spe -= 0.25;
      let regen;
      const halfMax = character.pv_maximum / 2;
      if (character.pv < halfMax) {
        regen = Math.ceil(character.pv * 0.15);
      } else {
        regen = Math.ceil(character.pv * 0.05);
      }
      character.pv = Math.min(character.pv_maximum, character.pv + regen);
      specialLogMessage = `Doudou régénère ${regen} PV.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, isPlayer);
      App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
      App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
      break;

    case 'Cocobi':
      const red = Math.ceil(opponent.pv_maximum * 0.12);
      opponent.pv = Math.max(0, opponent.pv - red);
      specialLogMessage = `Cocobi inflige ${red} PV à ${opponent.name}.`;
      character.degats_partie += red;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Coeur':
      const dmg = Math.round(character.attaque * 1.5);
      const heal = Math.round(dmg * (character.pv > halfMax ? 0.1 : 0.15));
      opponent.pv = Math.max(0, opponent.pv - dmg);
      character.pv = Math.min(character.pv_maximum, character.pv + heal);
      specialLogMessage = `${character.name} inflige ${dmg} dégâts et récupère ${heal} PV.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Grours':
      const base = 500 + character.attaque;
      const defGr = Math.round(opponent.defense * 0.5);
      const net = base - defGr;
      opponent.pv -= net;
      specialLogMessage = `Grours inflige ${net} dégâts, ignorant le bouclier.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Poulpy':
      const pd = Math.round(character.attaque * 1.75);
      const ed = Math.round(opponent.defense * 0.6);
      const netd = Math.max(0, pd - ed);
      opponent.pv -= netd;
      opponent.defense *= 0.85;
      opponent.poulpy_att += 3;
      specialLogMessage = `Poulpy inflige ${netd} dégâts et ignore 50% de la défense.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Oiseau':
      const ods = character.attaque * 2.5;
      character.defense += 20;
      opponent.pv -= ods;
      character.Oiseaudefense += 2;
      specialLogMessage = `Oiseau inflige ${Math.round(ods)} dégâts et gagne 20 de défense.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Colorina':
      const cd = Math.round(character.attaque * 0.85);
      opponent.pv -= cd;
      opponent.defense *= 0.85;
      opponent.perte_defense_colorina += 4;
      specialLogMessage = `Colorina inflige ${cd} dégâts et réduit la défense de 15%.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Rosalie':
      const rd = Math.round(character.attaque * 2);
      if (Math.random() < 0.25) {
        opponent.immobilisation = 1;
        specialLogMessage = `Rosalie inflige ${rd} dégâts et immobilise ${opponent.name}.`;
      } else {
        specialLogMessage = `Rosalie inflige ${rd} dégâts.`;
      }
      opponent.pv = Math.max(0, opponent.pv - rd);
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Sboonie':
      const supp = Math.round(character.pv_maximum * 0.08);
      character.pv += supp;
      opponent.pv -= 50;
      opponent.attaque = Math.round(opponent.attaque * 0.85);
      opponent.sboonie_attaque += 1;
      specialLogMessage = `Sboonie régénère ${supp} PV, inflige 50 dégâts et réduit l'attaque adverse.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      break;

    case 'Inconnu':
      character.spe -= 0.25;
      opponent.inconnu_super += 3;
      specialLogMessage = `Inconnu augmente son ATK/DEF et bloque l'adversaire.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, isPlayer);
      break;

    case "Perro":
      character.spe = 0;
      opponent.defense *= 0.70;
      character.attaquee = character.attaque * 0.85;
      opponent.pv -= character.attaque;
      opponent.Perro += 3;
      specialLogMessage = `${character.name} utilise sa capacité spéciale, il inflige ${character.attaquee} dégâts et réduit la défense de ${opponent.name} de 30% pour les deux prochains touts !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
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

    default:
      specialLogMessage = `${character.name} utilise sa capacité spéciale (effet par défaut).`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
  }

  // Mise à jour après usage
  document.getElementById(isPlayer ? 'player-pv' : 'opponent-pv')
    .textContent = `PV: ${character.pv}`;
  App.updateDisplay(isPlayer, character);
  App.updateSpecialButton();
  App.scrollToBottom();

  // Si c'est un joueur non-spécifique, passe au tour de l'adversaire
  if (isPlayer && !['Diva', 'Willy', 'Baleine', 'Doudou', 'Nautilus'].includes(character.name)) {
    opponentTurn();
  }
};
// --- Historique des actions du joueur ---
App.loadPlayerActionHistory = function() {
  const data = localStorage.getItem("playerActionHistoryWeekend");
  return data ? JSON.parse(data) : [];
};

App.savePlayerActionHistory = function(history) {
  localStorage.setItem("playerActionHistoryWeekend", JSON.stringify(history));
};

// Initialisation de l’historique
App.playerActionHistory = App.loadPlayerActionHistory();

// --- Distance de Manhattan entre deux états ---
App.manhattanDistance = function(arr1, arr2) {
  let distance = 0;
  for (let i = 0; i < arr1.length; i++) {
    distance += Math.abs(arr1[i] - arr1[i]);
  }
  return distance;
};

// --- Sélection aléatoire pondérée ---
App.weightedRandomAction = function(actionCounts) {
  const total = Object.values(actionCounts).reduce((sum, c) => sum + c, 0);
  let rand = Math.random() * total;
  for (let action in actionCounts) {
    rand -= actionCounts[action];
    if (rand <= 0) return action;
  }
  return null;
};

// --- Mapping des actions pour transformation d’état ---
App.actionMapping = {
  "attacker": 0,
  "se défendre": 1,
  "utiliser capacité spéciale": 2
};

// --- Transformation d’un état pour comparaison ---
App.transformState = function(state) {
  const newState = state.slice();
  if (typeof newState[3] === "string" && App.actionMapping[newState[3]] !== undefined) {
    newState[3] = App.actionMapping[newState[3]];
  } else {
    newState[3] = 0;
  }
  return newState;
};

// --- Recherche d’états similaires ---
App.findSimilarData = function(currentState, data, threshold = 2) {
  const s0 = App.transformState(currentState);
  return data.filter(row => {
    const r0 = App.transformState(row);
    return App.manhattanDistance(s0, r0) <= threshold;
  });
};

// --- Détermination de l’action la plus probable ---
App.mostProbableAction = function(data) {
  // Essai de prédiction par séquence
  const seqPred = App.predictPlayerNextActionBySequence(2);
  if (seqPred !== null) return seqPred;

  if (data.length === 0) return null;
  const counts = data.map(r => r[3]).reduce((acc, a) => {
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});
  return App.weightedRandomAction(counts);
};

// --- Sauvegarde / chargement de l’historique complet ---
App.saveHistoricalData = function(data) {
  localStorage.setItem("historicalData_weekend", JSON.stringify(data));
};

App.loadHistoricalData = function() {
  const d = localStorage.getItem("historicalData_weekend");
  return d ? JSON.parse(d) : [];
};

App.historicalData = App.loadHistoricalData();

// --- Statistiques adaptatives par situation/action ---
App.situationStats = {};
App.lastState = null;
App.lastAIAction = null;
App.lastSituationKey = null;
App.lastPlayerHP = null;
App.lastAIHP = null;

// --- Construction de la clé de situation ---
App.getSituationKey = function(state, playerIsDefending) {
  // state = [Jcs, Jdefense, Jpv, Jaction, IAcs, IAdefense, IApv]
  return `Jcs:${state[0]}_Jdef:${state[1]}_activeDef:${playerIsDefending ? 1 : 0}_IAcs:${state[4]}_IAdef:${state[5]}`;
};

// --- Évaluation d’une action par l’IA ---
App.evaluateAction = function(state, action, predictedPlayerAction, difficultyModifier, playerIsDefending) {
  const [Jcs, Jdef, Jpv, Jlast, IAcs, IAdef, IApv] = state;
  let score = 0;

  const JpvPrecise = Math.round((App.playerCharacter.pv / App.playerCharacter.pv_maximum) * 100);
  const IApvPrecise = Math.round((App.opponentCharacter.pv / App.opponentCharacter.pv_maximum) * 100);
  const pAtk = App.playerCharacter.attaque;
  const oAtk = App.opponentCharacter.attaque;
  const pSpe = App.playerCharacter.spe;
  const oSpe = App.opponentCharacter.spe;

  if (action === "attacker") {
    score += (100 - JpvPrecise) * 0.2;
    if (predictedPlayerAction === "attacker") { score += 5; score -= pAtk * 0.1; }
    if (predictedPlayerAction === "utiliser capacité spéciale") score -= 15;
    if (difficultyModifier > 0) {
      if (Jdef === 1) score -= 10;
      if (predictedPlayerAction === "se défendre" && IApv > 50) score += 5;
      if (Jlast === "utiliser capacité spéciale") score += 5;
    }
    score += oAtk * 0.05;
  }
  else if (action === "utiliser capacité spéciale") {
    score += (100 - JpvPrecise) * 0.35 + oSpe * 10;
    score += pSpe < 0.2 ? 5 : -pSpe * 5;
    if (predictedPlayerAction === "se défendre") score -= 20;
    if (difficultyModifier > 0) {
      if (Jdef === 1 || predictedPlayerAction === "se défendre") score -= 25;
      if (Jlast === "utiliser capacité spéciale") score -= 5;
    }
    score += oAtk * 0.2;
  }
  else if (action === "se défendre") {
    if (predictedPlayerAction === "attacker") score += 12 + pAtk * 0.2;
    if (predictedPlayerAction === "utiliser capacité spéciale") score += 35;
    if (Jcs === 1) { score += 30; }
    score += JpvPrecise * 0.1;
    if (difficultyModifier > 0) {
      if (Jcs === 0 && pSpe > 0.5 && IApv > 30) score -= 20;
      if (Jlast === "attacker" && Jpv > 60) score -= 10;
      if (IApv < 30) score += 15;
      if (Jlast === "se défendre") score -= 5;
    }
  }

  score += difficultyModifier * 10;
  if (IApv < 50 && action === "se défendre") score += 12;

  // Bonus adaptatif
  const key = App.getSituationKey(state, playerIsDefending);
  const stats = App.situationStats[key]?.[action];
  if (stats?.count > 0) {
    const avg = stats.totalDelta / stats.count;
    score += avg * 0.5;
  }

  return score;
};

// --- Choix de la meilleure action ---
App.chooseBestAction = function(state, predictedPlayerAction, difficultyModifier, playerIsDefending) {
  const actions = ["attacker"];
  if (App.opponentCharacter.spe >= 1) actions.push("utiliser capacité spéciale");
  if (!App.opponentCharacter.defenseCooldown) actions.push("se défendre");
  if (App.opponentCharacter.defenseCooldown === 0) actions.push("se défendre");

  let best = actions[0], bestScore = -Infinity;
  actions.forEach(a => {
    const sc = App.evaluateAction(state, a, predictedPlayerAction, difficultyModifier, playerIsDefending);
    if (sc > bestScore) { bestScore = sc; best = a; }
  });

  const userData = getUserData();
  if (userData.difficulty === "Easy" && Math.random() < 0.3) {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  return best;
};

// --- Exécution du tour de l'IA avec délai ---
App.executeAITurn = function(action) {
  setTimeout(() => {
    if (action === "attacker") {
      App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
    } else if (action === "utiliser capacité spéciale" && App.opponentCharacter.spe >= 1) {
      App.useSpecialAbility(App.opponentCharacter, App.playerCharacter, false);
    } else if (action === "se défendre") {
      App.opponentDefense();
      App.opponentCharacter.defenseCooldown = 3;
    } else {
      App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
    }
    document.getElementById('attack-button').disabled = false;
    document.getElementById('special-button').disabled = false;
    document.getElementById('defense-button').disabled = false;
    document.getElementById('items-button').disabled = false;
    App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
  }, Math.random() * 2000 + 1000);
};

// --- Comparaison de deux tableaux ---
App.arraysEqual = function(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

// --- Prédiction par séquence ---
App.predictPlayerNextActionBySequence = function(order = 2) {
  if (App.playerActionHistory.length < order) return null;
  const seq = App.playerActionHistory.slice(-order);
  const counts = {};

  for (let i = 0; i <= App.historicalData.length - order - 1; i++) {
    const histSeq = App.historicalData.slice(i, i + order).map(r => r[3]);
    if (App.arraysEqual(histSeq, seq) && i + order < App.historicalData.length) {
      const next = App.historicalData[i + order][3];
      counts[next] = (counts[next] || 0) + 1;
    }
  }
  return Object.keys(counts).length ? App.weightedRandomAction(counts) : null;
};

// --- Tour de l’adversaire (IA) ---
App.opponentTurn = function() {
  // Désactivation boutons
  ['attack', 'special', 'defense', 'items'].forEach(id => {
    document.getElementById(id + '-button').disabled = true;
  });

  // Cooldown défense
  if (App.opponentCharacter.defenseCooldown > 0) {
    App.opponentCharacter.defenseCooldown--;
  }

  // Construction de l’état courant
  const Jdef = App.playerCharacter.defense_droit >= 1 ? 1 : 0;
  const Jcs = App.playerCharacter.spe >= 1 ? 1 : 0;
  const Jpv = Math.min(100, Math.ceil((App.playerCharacter.pv / App.playerCharacter.pv_maximum) * 100 / 20) * 20);
  const Jact = App.playerCharacter.last_action;
  const IAdef = App.opponentCharacter.defense_droit >= 1 ? 1 : 0;
  const IAcs = App.opponentCharacter.spe >= 1 ? 1 : 0;
  const IApv = Math.min(100, Math.ceil((App.opponentCharacter.pv / App.opponentCharacter.pv_maximum) * 100 / 20) * 20);

  App.playerActionHistory.push(Jact);
  if (App.playerActionHistory.length > 30) {
    App.playerActionHistory = App.playerActionHistory.slice(-30);
  }
  App.savePlayerActionHistory(App.playerActionHistory);

  const currentState = [Jcs, Jdef, Jpv, Jact, IAcs, IAdef, IApv];
  const playerIsDefending = App.playerCharacter.defense_droit === 4;
  const currentKey = App.getSituationKey(currentState, playerIsDefending);

  // Mise à jour des stats de la situation précédente
  if (App.lastSituationKey && App.lastAIAction != null) {
    const dP = App.lastPlayerHP - App.playerCharacter.pv;
    const dAI = App.lastAIHP - App.opponentCharacter.pv;
    let eff = dP - dAI;
    if (Math.abs(eff) < 100) eff = 0;
    const stats = App.situationStats[App.lastSituationKey] ||= {
      attacker: { totalDelta: 0, count: 0 },
      "utiliser capacité spéciale": { totalDelta: 0, count: 0 },
      "se défendre": { totalDelta: 0, count: 0 }
    };
    stats[App.lastAIAction].totalDelta += eff;
    stats[App.lastAIAction].count++;
  }

  // Prédiction et choix d’action
  const userData = getUserData();
  let similar = App.findSimilarData(currentState, App.historicalData);
  let predicted = App.mostProbableAction(similar);
  const diffMod = userData.difficulty === "Hard" ? 0.2 : userData.difficulty === "Easy" ? -0.2 : 0;
  if (Math.random() > (userData.difficulty === "Hard" ? 1 : 0.75)) predicted = null;

  const nextAction = App.chooseBestAction(currentState, predicted, diffMod, playerIsDefending);

  // Exécution et mise à jour pour prochain tour
  App.historicalData.push(currentState);
  App.saveHistoricalData(App.historicalData);

  App.lastState = currentState;
  App.lastAIAction = App.opponentCharacter.nextAction || nextAction;
  App.lastSituationKey = currentKey;
  App.lastPlayerHP = App.playerCharacter.pv;
  App.lastAIHP = App.opponentCharacter.pv;

  App.opponentCharacter.nextAction = nextAction;
  App.executeAITurn(App.lastAIAction);

  // Fin du tour IA → mise à jour UI
  App.adversairePasserTour();
  App.joueurPasserTour();
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
};

// Assurez-vous que le namespace App existe
window.App = window.App || {};

// --- Défense spécifique de l’adversaire ---
App.opponentDefense = function() {
  App.opponentCharacter.isDefending = true;
  App.opponentCharacter.spe -= 0.1;
  App.opponentCharacter.defense_droit = 4;

  // Sauvegarde de l'attaque temporaire
  const savedAttack = App.opponentCharacter.attaque;
  App.opponentCharacter.attaque = Math.round(savedAttack * 0.8);

  // Soin basé sur 80% des dégâts subis
  const soin = Math.round(App.opponentCharacter.degats_subit * 0.8);
  App.opponentCharacter.pv += soin;

  const specialLogMessage =
    `${App.opponentCharacter.name} se défend de la dernière attaque de ${App.playerCharacter.name}.`;
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }

  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.addCombatLog(specialLogMessage, logColor, false);
  App.scrollToBottom();

  // L’adversaire riposte immédiatement
  App.handleAttack(App.opponentCharacter, App.playerCharacter, false);

  // Restauration de l'attaque d’origine
  App.opponentCharacter.attaque = savedAttack;
};

// --- Gestion de la défense pour n’importe quel personnage ---
App.handleDefense = function(character, opponent, isPlayer) {
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }
  let specialLogMessage;

  if (character.defense_droit === 0) {
    if (character.spe >= 0.1) {
      character.spe -= 0.1;
      character.defense_bouton = 1;
      character.defense_droit = 4;
      specialLogMessage =
        `${character.name} se défend contre la prochaine attaque de ${opponent.name}.`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      if (isPlayer) {
        character.last_action = 1;
        character.defense_partie++;
        App.opponentTurn();
      }
    } else {
      specialLogMessage =
        `${character.name} n'a pas assez d'énergie spéciale pour se défendre !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, true);
    }
  } else {
    specialLogMessage =
      `${character.name} ne peut pas se défendre avant ${character.defense_droit} tours.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
    if (isPlayer) {
      App.handleAttack(character, opponent, true);
    }
  }

  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
};

// --- Gestion de l’attaque pour n’importe quel personnage ---
App.handleAttack = function(attacker, defender, isPlayerAttacking) {
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    logColor = 'white';
  } else {
    logColor = 'black';
  }
  let gainSpe;

  // Calcul du gain de spe selon le personnage
  if (["Doudou", "Diva", "Cocobi"].includes(attacker.name)) {
    gainSpe = 0.20;
    attacker.spe += gainSpe;
    if (attacker.chargement2) {
      attacker.spe -= 0.10;
      gainSpe = 0.10;
    }
  }
  if (["Boompy"].includes(attacker.name)) {
    gainSpe = 0.34;
    attacker.spe += gainSpe;
    if (attacker.chargement2) {
      attacker.spe -= 0.17;
      gainSpe = 0.17;
    }
  } else {
    gainSpe = 0.25;
    attacker.spe += gainSpe;
    if (attacker.chargement2) {
      attacker.spe -= 0.125;
      gainSpe = 0.125;
    }
  }
  if (!isPlayerAttacking && attacker.isDefending) {
    attacker.spe -= gainSpe;
    attacker.isDefending = false;
  }
  if (isPlayerAttacking) {
    App.specialAbility = attacker.spe;
    attacker.last_action = 0;
    if (attacker.spe < 0) attacker.last_action = 2;
  }
  if (attacker.spe > 1) attacker.spe = 1;

  let damage = 0;
  let specialLogMessage;

  // Cas d’immobilisation ou de cape
  if (attacker.immobilisation > 0) {
    specialLogMessage =
      `${defender.name} a immobilisé ${attacker.name} ! Il ne peut pas attaquer.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
  } else if (defender.cape) {
    specialLogMessage =
      `${defender.name} utilise une cape de l'ombre, ${attacker.name} rate son attaque !`;
    App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
  } else {
    // Calcul de la défense modifiée aléatoirement
    const defenseModifier = 0.9 + Math.random() * 0.2;
    const modDefense = Math.round(defender.defense * defenseModifier);
    damage = Math.max(0, attacker.attaque - modDefense);
    if (attacker.name === "Boompy" && attacker.spe >= 1) {
      damage = Math.max(0, attacker.attaque * 1.5 - modifiedDefense);
      attacker.spe -= 1;
      specialLogMessage = `${attacker.name} est surchargé, il inflige 150% de ses dégâts de base`;
      App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
    }

    // Si défense activée
    if (defender.defense_bouton === 1) {
      defender.defense_bouton = 0;
      damage = Math.round(attacker.attaque * 0.2);
    }

    defender.pv = Math.max(defender.pv - damage, 0);
    App.opponentCharacter.degats_subit = damage;

    if (isPlayerAttacking) {
      specialLogMessage =
        `Vous infligez ${damage} points de dégâts à ${defender.name}.`;
      document.getElementById('opponent-pv').textContent =
        `PV: ${App.opponentCharacter.pv}`;
      App.playerCharacter.degats_partie += damage;
      if (App.playerCharacter.spe >= 0.1) {
        App.playerCharacter.degats_partie_base += damage;
      }
    } else {
      specialLogMessage =
        `${attacker.name} inflige ${damage} points de dégâts.`;
      document.getElementById('player-pv').textContent =
        `PV: ${App.playerCharacter.pv}`;
    }
    App.addCombatLog(specialLogMessage, logColor, isPlayerAttacking);
  }

  // Vérification de la fin de partie
  if (defender.pv === 0) {
    const userData = getUserData();
    let perteTrophees = 0;

    if (isPlayerAttacking) {
      userData.victoires++;
      userData.trophees += 10;
      userData.fin_trophee = 10;
      if (userData.parties_weekend_test < 1) {
        userData.trophees -= 10;
      }
    } else {
      userData.defaites++;
      const t = userData.trophees;
      if (t < 150) perteTrophees = 1;
      else if (t <= 150) perteTrophees = 3;
      else if (t <= 300) perteTrophees = 5;
      else if (t <= 500) perteTrophees = 8;
      else if (t <= 750) perteTrophees = 10;
      else perteTrophees = 12;
      if (userData.parties_weekend_test < 1) perteTrophees = 0;
      userData.trophees = Math.max(t - perteTrophees, 0);
    }

    // Calcul des récompenses XP / argent
    let gainXP = App.calculateXP(attacker, defender, isPlayerAttacking);
    let gainArgent = Math.round(gainXP / 3);
    if (gainXP < 20 && isPlayerAttacking) gainXP = 20;
    if (userData.XP_jour >= 5000) gainXP = 0;
    if (App.playerCharacter.xp2) gainXP *= 2;
    if (App.playerCharacter.points2) gainArgent *= 2;

    userData.XP_jour += gainXP;
    if (userData.Double_XP > 0) {
      gainXP *= 2;
      userData.Double_XP -= 1;
    } else if (userData.Double_XP_acheté > 0) {
      userData.Double_XP_acheté -= 1;
      gainXP *= 2;
    }
    if (userData.parties_weekend_test < 1) {
      gainArgent = 0;
      gainXP = 0;
      userData.parties_weekend_test++;
    }
    userData.pass_XP += gainXP;
    App.updateCharacterXP(userData, attacker.name, gainXP);
    userData.argent += gainArgent;

    // Message de fin et sauvegarde utilisateur
    const endMsg = isPlayerAttacking
      ? `${defender.name} a été vaincu !`
      : `${attacker.name} vous a vaincu !`;
    App.addCombatLog(endMsg, logColor, "milieu");

    userData.gagnant = attacker.name;
    userData.fin_xp = gainXP;
    userData.fin_argent = gainArgent;
    userData.fin_trophee = isPlayerAttacking ? 10 : -perteTrophees;
    saveUserData(userData);

    // ——— Système de quêtes hebdo ———
    for (let week = 1; week <= 10; week++) {
      if (userData[`semaine${week}`]) {
        for (let quest = 1; quest <= 5; quest++) {
          const keyBase = `Semaine${week}_${quest}`;
          const completedKey = `${keyBase}_completed`;
          const typeKey = `${keyBase}_type`;
          const currentKey = `${keyBase}_current`;
          const characterKey = `${keyBase}_character`;
          if (!userData[completedKey]) {
            switch (userData[typeKey]) {
              case "O":
                userData[currentKey] += App.playerCharacter.objets_partie;
                break;
            }
          }

        }
      }
    }

    const mainQuests = [1, 2, 3];
    mainQuests.forEach(n => {
      const typeKey = `quete${n}_type`;
      const charKey = `quete${n}_character`;
      const currentKey = `quete${n}_current`;
      switch (userData[typeKey]) {
        case "victoire_classique":
          if (isPlayerAttacking && App.playerCharacter.name === userData[charKey]) {
            userData[currentKey] += 1;
          }
          break;
        case "objets_total":
          userData[currentKey] += App.playerCharacter.objets_partie;
          break;
        case "defense_classique":
          userData[currentKey] += App.playerCharacter.defense_partie;
          break;
      }
    });

    // Mise à jour des quêtes
    const weekendQuests = [1, 2, 3];
    weekendQuests.forEach(n => {
      const typeKey = `weekend-quete${n}_type`;
      const charKey = `weekend-quete${n}_character`;
      const currentKey = `weekend-quete${n}_current`;
      switch (userData[typeKey]) {
        case "VCW":
          if (isPlayerAttacking && App.playerCharacter.name === userData[charKey]) {
            userData[currentKey] += 1;
          }
          break;
        case "DCW":
          userData[currentKey] += App.playerCharacter.degats_partie;
          break;
        case "OW":
          userData[currentKey] += App.playerCharacter.objets_partie;
          break;
        case "DECW":
          userData[currentKey] += App.playerCharacter.defense_partie;
          break;
      }
    });
    saveUserData(userData);
    App.checkAndDisplayCharacterUnlock(userData);

    // Désactivation des boutons d’action
    document.getElementById("attack-button").disabled = true;
    document.getElementById("special-button").disabled = true;

    // Fin de partie après 2s
    setTimeout(() => {
      localStorage.removeItem("savepartie_weekend");
      sessionStorage.removeItem("playerCharacter");
      sessionStorage.removeItem("opponentCharacter");
      loadPage("fin_partie");
    }, 2000);

  } else if (isPlayerAttacking) {
    // Si la partie continue, passe au tour adverse
    App.opponentTurn();
    App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
    App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
    App.updateUI();
  }

  App.updateSpecialButton();
  App.scrollToBottom();
};

// --- Calcul de l’XP gagné ---
App.calculateXP = function(attacker, defender, isPlayerAttacking) {
  const userData = getUserData();
  const niveau = Number(userData[`${attacker.name}_Level`]) * 0.1;
  if (isPlayerAttacking) {
    const ratio = (attacker.pv / attacker.pv_max) * 100;
    return Math.round((2 * ratio) * (1 / (1 + niveau)));
  } else if (userData.XP_jour >= 5000) {
    return 0;
  } else {
    return Math.round(20 - (2 * (niveau - 1)));
  }
};

// --- Mise à jour de l’XP dans userData ---
App.updateCharacterXP = function(userData, characterName, xp) {
  const key = `${characterName}_XP`;
  if (userData.hasOwnProperty(key)) {

    userData[key] += xp;


    saveUserData(userData);
  }
};

// --- Scroll du journal de combat ---
App.scrollToBottom = function() {
  const log = document.getElementById('combat-log');
  log.scrollTop = log.scrollHeight;
};

// --- Vérification des paliers et déblocages ---
App.checkAndDisplayCharacterUnlock = function(userData) {
  const rewardPals = [10, 20, 30, 40, 60, 80, 100, 120, 150, 180, 220, 260, 300, 350, 400, 460, 520, 580, 650, 720, 800, 880, 970, 1060, 1150, 1250, 1350, 1460, 1570, 1690];
  userData.palier_recompense ||= [];
  userData.recompense ||= 0;
  userData.perso_recompense ||= 0;

  const newReached = rewardPals.filter(t =>
    userData.trophees >= t && !userData.palier_recompense.includes(t)
  );
  if (newReached.length) {
    userData.palier_recompense.push(...newReached);
    userData.recompense += newReached.length;
    if (userData.palier_recompense.length % 10 === 0) {
      userData.perso_recompense++;
    }
    saveUserData(userData);
  }
};

// --- Sauvegarde complète de la partie ---
App.sauvegarderPartie = function(playerChar, opponentChar) {
  const sauvegarde = {
    playerCharacter: { ...playerChar },
    opponentCharacter: { ...opponentChar }
  };
  localStorage.setItem("savepartie_weekend", JSON.stringify(sauvegarde));
};

App.userData = getUserData();
App.userData.partie_commencee_weekend = true;
saveUserData(App.userData);



if (localStorage.getItem("savepartie_weekend")) {
  App.sauvegarde = JSON.parse(localStorage.getItem("savepartie_weekend"));
  App.loadSavedGame();
} else {
  App.spinEventWheel();
  App.initFromSession();
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
