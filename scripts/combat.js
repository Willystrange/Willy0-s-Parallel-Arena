window.App = window.App || {};

userData = getUserData();



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
      perte_att: playerCharacter.perte_att,
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
  localStorage.setItem("savepartie", JSON.stringify(sauvegarde));
};

App.chargerPartie = function() {
  const sauvegardeLocal = JSON.parse(localStorage.getItem("savepartie"));
  if (!sauvegardeLocal) {
    console.warn("Aucune sauvegarde trouvée.");
    return;
  }
  // Affectation directe des objets sauvegardés aux variables globales
  App.playerCharacter = sauvegardeLocal.playerCharacter;
  App.opponentCharacter = sauvegardeLocal.opponentCharacter;

  console.log("Partie chargée avec succès !");
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
};


// Détection du mode d'affichage (standalone ou non)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  document.body.classList.add('web-app');
} else {
  document.body.classList.add('normal-app');
}


App.userData = getUserData();
console.log(App.userData.difficulty);

// Chargement de la sauvegarde de partie depuis localStorage
App.sauvegarde = null;
try {
  App.sauvegarde = JSON.parse(localStorage.getItem("savepartie"));
} catch (e) {
  console.error('Erreur lors du parsing de la sauvegarde :', e);
}
if (App.sauvegarde) {
  console.log('Sauvegarde trouvée :', App.sauvegarde);
}

if (userData.partie_commencee && App.sauvegarde) {
  App.chargerPartie();
} else {
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
  } else {
    // Redirection vers index.html via loadPage si les données du joueur ne sont pas trouvées
    loadPage('index');
  }

  // Récupération et initialisation du personnage adverse
  const storedOpponent = sessionStorage.getItem('opponentCharacter');
  if (storedOpponent) {
    App.opponentCharacter = JSON.parse(storedOpponent);

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
}

console.log('Player Character :', App.playerCharacter);
console.log('Opponent Character :', App.opponentCharacter);
App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);

// Empêche le retour en arrière dans l'historique du navigateur
history.replaceState(null, null, window.location.href);

console.log("good");

// Initialisation de la capacité spéciale (on suppose que playerCharacter.spe existe)
App.specialAbility = App.playerCharacter.spe || 0;

// Mise à jour de l'interface utilisateur pour le joueur
if (document.getElementById('player-name')) {
  document.getElementById('player-name').textContent = App.playerCharacter.name;
}
if (document.getElementById('player-pv')) {
  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
}

// Mise à jour de l'interface utilisateur pour l'adversaire
if (document.getElementById('opponent-name')) {
  document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
}
if (document.getElementById('opponent-pv')) {
  document.getElementById('opponent-pv').textContent = `PV: ${App.opponentCharacter.pv}`;
}

// Fonction qui met à jour la barre de capacité spéciale


// Fonction qui met à jour l'interface globale (PV, noms, barres spéciales)



App.updateUI();
console.log("1");

// Fonction qui met à jour l'état du bouton de capacité spéciale
App.updateSpecialButton = function() {
  const specialButton = document.getElementById('special-button');
  if (!specialButton) return;
  const maxSpecialAbility = 1; // Valeur maximale

  if (App.specialAbility >= maxSpecialAbility) {
    specialButton.classList.add('bright');
    specialButton.classList.add('grow'); // Pour agrandir le bouton
    specialButton.textContent = 'Capacité spéciale';
  } else {
    specialButton.classList.remove('bright');
    specialButton.classList.remove('grow');
    specialButton.textContent = `${App.specialAbility.toFixed(1)} / 1`;
  }
};
App.updateSpecialButton();
console.log("2");

// Fonction pour mettre à jour le tour et ajouter un log dans le combat
App.updateTour = function() {
  const logColor = "grey";
  App.playerCharacter.tourTT += 1;
  console.log("Tour ", App.playerCharacter.tourTT);
  let specialLogMessage = 'Tour ' + App.playerCharacter.tourTT;
  App.addCombatLog(specialLogMessage, logColor, "milieu");
};

// Fonction de passage de tour pour l'adversaire
App.adversairepasser_tour = function() {
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.opponentCharacter.PVAPRES = App.opponentCharacter.pv;
  const perte = App.opponentCharacter.PVAVANT - App.opponentCharacter.PVAPRES;
  if (perte > App.playerCharacter.MaxDegats) {
    App.playerCharacter.MaxDegats = perte;
  }
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
  App.opponentCharacter.PVAVANT = App.opponentCharacter.pv;
  App.sauvegarderPartie(App.playerCharacter, App.opponentCharacter);
};

// Passage de tour du joueur
App.joueurpasser_tour = function() {
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateUI();
  App.playerCharacter.tour += 1;
  App.playerCharacter.inventaire_objets = false;
  App.playerCharacter.objets_utilise = 0;
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
    App.playerCharacter.soin += (App.playerCharacter.pv_maximum * 0.02);
    App.playerCharacter.amulette_heal += 1;
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


// Affichage de la sélection d'objets
App.showItemSelection = function() {
  const itemSelectionDiv = document.getElementById('item-selection');
  itemSelectionDiv.style.display = 'block';

  // Effacer les éléments précédents
  itemSelectionDiv.innerHTML = '<h3>Choisissez un objet à utiliser</h3>';

  const userData = getUserData();
  const availableItems = [];

  // Vérifier et ajouter les objets disponibles
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

  if (App.playerCharacter.objets_utilise === 0) {
    if (!App.playerCharacter.inventaire_objets) {
      App.playerCharacter.selectedItems = [];
      const shuffledItems = availableItems.sort(() => 0.5 - Math.random());
      App.playerCharacter.selectedItems = shuffledItems.slice(0, 3);
      App.playerCharacter.inventaire_objets = true;
    }

    App.playerCharacter.selectedItems.forEach(item => {
      const itemButton = document.createElement('button');
      itemButton.textContent = `${item.name} (${item.count})`;
      itemButton.onclick = function() { App.useItem(item.name); };
      itemSelectionDiv.appendChild(itemButton);
    });

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Annuler';
    cancelButton.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancelButton);
  } else {
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Annuler';
    cancelButton.onclick = App.hideItemSelection;
    itemSelectionDiv.appendChild(cancelButton);
  }
};

App.partie = function() {
  userData = getUserData();
  userData.partie_commencee = true;
  saveUserData(userData);
}
App.partie();

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
      App.playerCharacter.spe += 0.8;
      if (App.playerCharacter.spe > 1) {
        App.playerCharacter.spe = 1;
      }
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
      App.playerCharacter.pv += 1100;
      App.playerCharacter.soin += 1100;
      if (App.playerCharacter.pv > App.playerCharacter.pv_maximum) {
        App.playerCharacter.pv = App.playerCharacter.pv_maximum;
      }
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

  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  App.hideItemSelection();

  const logColor = 'white';
  const specialLogMessage = `${itemName} utilisé !`;
  App.addCombatLog(specialLogMessage, logColor, 'milieu');
  App.scrollToBottom();
};


// Ajout d'une entrée dans le journal de combat
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

App.useSpecialAbility = function(character, opponent, isPlayer) {
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log("L'utilisateur préfère le mode sombre");
    logColor = 'white';
  } else {
    console.log("L'utilisateur préfère le mode clair");
    logColor = 'black';
  }
  if (character.spe < 1) {
    const specialLogMessage = `${character.name} a tenté d'utiliser sa capacité spéciale, mais n'avait pas assez d'énergie, il va donc attaquer`;
    App.addCombatLog(specialLogMessage, logColor, "left");
    App.handleAttack(character, opponent, isPlayer);
    return;
  }
  if (character.spe >= 1) {
    character.spe -= 1;
    if (isPlayer) {
      App.specialAbility -= 1;
      character.capacite_partie += 1;
      character.last_action = 2;
    }

    const logColor = 'white';
    let specialLogMessage = "";

    if (character.immobilisation >= 1) {
      specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'a immobilisé, donc l'attaque échoue et rien ne se passe.`;
      opponent.pv -= 0;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
    } else if (opponent.defense_bouton === 1) {
      opponent.defense_bouton = 0;
      specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'en empêche, donc l'attaque échoue et rien ne se passe.`;
      opponent.pv -= 0;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
    } else if (character.inconnu_super >= 1) {
      specialLogMessage = `${character.name} ne peut pas utiliser sa capacité spéciale, car ${opponent.name} l'a bloqué pour encore ${character.inconnu_super} tours.`;
      character.spe += 1;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.handleAttack(character, opponent, isPlayer);
    } else if (isPlayer && opponent.nextAction === "se défendre") {
      specialLogMessage = `${character.name} utilise sa capacité spéciale ! Mais ${opponent.name} l'en empêche !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      App.opponentTurn();
    } else {
      switch (character.name) {
        case "Diva":
          opponent.attaque *= 0.75;
          character.spe -= 0.25;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! L'attaque de ${opponent.name} est réduite à ${Math.round(opponent.attaque.toFixed(2))} pour les 3 prochains tours.`;
          opponent.perte_att += 3;
          if (!isPlayer) {
            opponent.perte_att += 1;
          }
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          App.handleAttack(character, opponent, isPlayer);
          break;

        case "Willy":
          character.spe -= 0.25;
          App.specialAbility -= 0.25;
          const opponentDefenseModifiee = 0.9 + Math.random() * 0.2;
          const opponentDefensee = Math.round(opponent.defense * opponentDefenseModifiee);
          opponent.pv += (2 * (opponentDefensee - character.attaque));
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il effectue 3 attaques !\n\n${character.name} attaque ${opponent.name} et inflige ${Math.round(2 * (character.attaque - opponentDefensee))} points de dégâts.`;
          character.degats_partie += (2 * (character.attaque - opponentDefensee));
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          App.handleAttack(character, opponent, isPlayer);
          character.last_action = 2;
          break;

        case "Baleine":
          if (character.defense < 29) {
            specialLogMessage = "Baleine n'a plus assez de défense pour utiliser sa capacité spéciale, il va donc attaquer.";
            App.addCombatLog(specialLogMessage, logColor, isPlayer);
            App.handleAttack(character, opponent, isPlayer);
          } else {
            specialLogMessage = "Baleine utilise sa capacité spéciale ! Il perd 15 de défense et gagne 1000 PV !";
            App.addCombatLog(specialLogMessage, logColor, isPlayer);
            character.spe -= 0.25;
            if (isPlayer) {
              App.specialAbility -= 0.25;
            }
            character.defense -= 15;
            character.pv += 1000;
            App.handleAttack(character, opponent, isPlayer);
          }
          break;

        case "Doudou":
          character.spe -= 0.25;
          let regeneratedAmount;
          if (character.pv < (character.pv_max / 2)) {
            regeneratedAmount = Math.ceil(character.pv * 0.15);
            specialLogMessage = `${character.name} utilise sa capacité spéciale ! Elle régénère ${Math.round(regeneratedAmount)} PV.`;
            character.pv += regeneratedAmount;
            if (character.pv > character.pv_max) {
              character.pv = character.pv_max;
            }
            App.addCombatLog(specialLogMessage, logColor, isPlayer);
            App.handleAttack(character, opponent, isPlayer);
            App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
            App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
          } else {
            regeneratedAmount = Math.ceil(character.pv * 0.05);
            specialLogMessage = `${character.name} utilise sa capacité spéciale ! Elle régénère ${Math.round(regeneratedAmount)} PV.`;
            character.pv += regeneratedAmount;
            if (character.pv > character.pv_max) {
              character.pv = character.pv_max;
            }
            App.addCombatLog(specialLogMessage, logColor, isPlayer);
            App.handleAttack(character, opponent, isPlayer);
            App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
            App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
          }
          break;

        case "Cocobi":
          const reductionAmount = Math.ceil(opponent.pv_maximum * 0.12);
          opponent.pv -= reductionAmount;
          if (opponent.pv < 0) {
            opponent.pv = 0;
          }
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! ${opponent.name} perd ${Math.round(reductionAmount)} PV.`;
          character.degats_partie += reductionAmount;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Coeur":
          const specialDamage = Math.round(character.attaque * 1.5);
          const absorbedHealth = Math.round(specialDamage * (character.pv > (character.pv_max / 2) ? 0.1 : 0.15));
          opponent.pv -= specialDamage;
          character.pv += absorbedHealth;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il inflige ${Math.round(specialDamage)} points de dégâts et récupère ${Math.round(absorbedHealth)} PV.`;
          character.degats_partie += specialDamage;
          if (opponent.pv < 0) opponent.pv = 0;
          if (character.pv > character.pv_max) character.pv = character.pv_max;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Grours":
          const Damage = 500 + character.attaque;
          const defense = Math.round(opponent.defense * 0.5);
          opponent.pv -= (Damage - defense);
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il inflige ${Math.round(Damage - defense)} points de dégâts à ${opponent.name}, ignorant le bouclier.`;
          character.degats_partie += (Damage - defense);
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Poulpy":
          const poulpyDamage = Math.round(character.attaque * 1.75);
          const effectiveDefense = Math.round(opponent.defense * 0.6);
          const netDamage = Math.max(0, poulpyDamage - effectiveDefense);
          opponent.pv -= netDamage;
          opponent.defense *= 0.85;
          opponent.poulpy_att += 3;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il inflige ${Math.round(netDamage)} points de dégâts à ${opponent.name}, ignore 50% de sa défense et réduit sa défense de 15% pour les 2 prochains tours.`;
          character.degats_partie += netDamage;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Oiseau":
          const DamageOiseau = character.attaque * 2.5;
          character.defense += 20;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il inflige ${Math.round(DamageOiseau)} points de dégâts et gagne 20 de défense.`;
          opponent.pv -= DamageOiseau;
          character.Oiseaudefense += 2;
          character.degats_partie += DamageOiseau;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Colorina":
          const colorinaDamage = Math.round(character.attaque * 0.85);
          opponent.pv -= colorinaDamage;
          opponent.defense *= 0.85;
          opponent.perte_defense_colorina += 4;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il inflige ${Math.round(colorinaDamage)} points de dégâts et réduit la défense de ${opponent.name} de 15% pour les 3 prochains tours.`;
          character.degats_partie += colorinaDamage;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Rosalie":
          const rosalieDamage = Math.round(character.attaque * 2);
          const immobilizationChance = Math.random();
          if (immobilizationChance < 0.25) {
            opponent.immobilisation = 1;
            specialLogMessage = `${character.name} utilise sa capacité spéciale ! Elle inflige ${Math.round(rosalieDamage)} points de dégâts et immobilise ${opponent.name} pour un tour.`;
          } else {
            specialLogMessage = `${character.name} utilise sa capacité spéciale ! Elle inflige ${Math.round(rosalieDamage)} points de dégâts.`;
          }
          opponent.pv -= rosalieDamage;
          if (opponent.pv < 0) opponent.pv = 0;
          character.degats_partie += rosalieDamage;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Sboonie":
          const pvsupp = Math.round(character.pv_max * 0.08);
          character.pv += pvsupp;
          opponent.pv -= 50;
          opponent.attaque = Math.round(opponent.attaque * 0.85);
          if (!isPlayer) {
            opponent.sboonie_attaque += 1;
          }
          opponent.sboonie_attaque += 1;
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Il régénère ${Math.round(pvsupp)} PV, inflige 50 de dégâts et réduit de 15% l'attaque de ${opponent.name} pour le prochain tour.`;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
          break;

        case "Inconnu":
          character.spe -= 0.25;
          opponent.inconnu_super += 3;
          if (isPlayer) {
            opponent.inconnu_super += 1;
          }
          character.attaque += 25;
          character.defense += 25;
          specialLogMessage = `${character.name} utilise sa capacité spéciale, il augmente son attaque et sa défense de 15 et ${opponent.name} ne peut pas utiliser sa capacité spéciale pendant 3 tours !`;
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

        default:
          specialLogMessage = `${character.name} utilise sa capacité spéciale ! Effet spécifique à définir.`;
          App.addCombatLog(specialLogMessage, logColor, isPlayer);
      }
    }

    document.getElementById(isPlayer ? 'player-pv' : 'opponent-pv').textContent = `PV: ${character.pv}`;
    character.last_action = 2;
    App.updateSpecialButton();
    App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
    App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
    App.updateUI();
    App.scrollToBottom();

    if (isPlayer && character.name != "Diva" && character.name != "Willy" && character.name != "Baleine" && character.name != "Doudou") {
      App.opponentTurn();
    }
  }
};


// --------------------------
// Fonctions utilitaires déjà existantes (intégrées dans app)
// --------------------------


App.loadPlayerActionHistory = function() {
  let history = localStorage.getItem("playerActionHistory");
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
    console.log("Prédiction par séquence trouvée :", sequencePrediction);
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
  localStorage.setItem("historicalData", JSON.stringify(data));
};

App.loadHistoricalData = function() {
  const data = localStorage.getItem("historicalData");
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
      console.log("Bonus défense car le joueur peut utiliser sa capacité spéciale");
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
    console.log(`Bonus adaptatif pour l'action "${action}" dans la situation ${situationKey}: avgDelta = ${avgDelta}, bonus = ${avgDelta * 0.5}`);
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
    console.log(`Action "${action}" -> score ${score}`);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  });

  if (userData.difficulty === "Easy" && Math.random() < 0.3) {
    bestAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
    console.log("Difficulté Easy : choix aléatoire de l'action", bestAction);
  }

  return bestAction;
};

App.executeAITurn = function(chosenAction) {
  const delay = Math.floor(Math.random() * 2000) + 1000; // délai entre 1s et 3s
  setTimeout(() => {
    console.log("L'IA exécute l'action planifiée :", chosenAction);
    if (chosenAction === "attacker") {
      App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
    } else if (chosenAction === "utiliser capacité spéciale" && App.opponentCharacter.spe === 1) {
      App.useSpecialAbility(App.opponentCharacter, App.playerCharacter, false);
    } else if (chosenAction === "se défendre") {
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
  console.log("6");
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


  console.log("5");


  App.playerActionHistory.push(Jaction);
  if (App.playerActionHistory.length > 30) {
    App.playerActionHistory = App.playerActionHistory.slice(-30);
  }
  App.savePlayerActionHistory(App.playerActionHistory);
  console.log("7");

  const currentState = [Jcs, Jdefense, Jpv, Jaction, IAcs, IAdefense, IApv];
  console.log("État courant :", currentState);

  const playerIsDefending = (App.playerCharacter.defense_droit === 4);
  const currentSituationKey = App.getSituationKey(currentState, playerIsDefending);

  // Mise à jour des statistiques de la situation précédente
  let currentPlayerHP = App.playerCharacter.pv;
  let currentAIHP = App.opponentCharacter.pv;
  console.log("8");
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
    console.log(`Mise à jour de l'efficacité pour l'action "${App.lastAIAction}" dans la situation ${App.lastSituationKey} : deltaPlayer = ${deltaPlayer}, deltaAI = ${deltaAI}, effectiveDelta = ${effectiveDelta}, nouvelle moyenne = ${App.situationStats[App.lastSituationKey][App.lastAIAction].totalDelta / App.situationStats[App.lastSituationKey][App.lastAIAction].count}`);
  }

  // Choix de l'action pour ce tour
  let currentAction = App.opponentCharacter.nextAction;
  if (!currentAction) {
    const possibleActions = ["attacker"];
    if (App.opponentCharacter.spe >= 0.8) possibleActions.push("utiliser capacité spéciale");
    if (!App.opponentCharacter.defenseCooldown || App.opponentCharacter.defenseCooldown === 0) possibleActions.push("se défendre");
    currentAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
  }
  console.log("Action planifiée pour ce tour :", currentAction);
  App.executeAITurn(currentAction);

  console.log("9");

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
    console.log("Prédiction ignorée (difficulté moindre)");
  }
  console.log("Action prédite du joueur pour le prochain tour :", predictedPlayerAction);

  // Planification du prochain coup de l'IA
  const nextAction = App.chooseBestAction(App.opponentCharacter, currentState, predictedPlayerAction, difficultyModifier, playerIsDefending);
  console.log("Action planifiée pour le prochain tour :", nextAction);
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

// -----------------------------
// Gestion du combat : Défense, Attaque, XP, sauvegarde et fin de partie
// -----------------------------

App.opponentDefense = function() {
  App.opponentCharacter.isDefending = true;
  App.opponentCharacter.spe -= 0.1;
  const isPlayer = false;
  App.opponentCharacter.defense_droit = 4;

  const soin = Math.round(App.opponentCharacter.degats_subit * 0.8);
  let attaque = App.opponentCharacter.attaque;
  App.opponentCharacter.attaque = Math.round(App.opponentCharacter.attaque * 0.8);
  App.opponentCharacter.pv += soin;

  specialLogMessage = `${App.opponentCharacter.name} se defend de la dernière attaque de ${App.playerCharacter.name}.`;
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log("L'utilisateur préfère le mode sombre");
    logColor = 'white';
  } else {
    console.log("L'utilisateur préfère le mode clair");
    logColor = 'black';
  }
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.addCombatLog(specialLogMessage, logColor, isPlayer);
  App.scrollToBottom();

  App.handleAttack(App.opponentCharacter, App.playerCharacter, false);
  App.opponentCharacter.attaque = attaque;
};

App.handleDefense = function(character, opponent, isPlayer) {
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log("L'utilisateur préfère le mode sombre");
    logColor = 'white';
  } else {
    console.log("L'utilisateur préfère le mode clair");
    logColor = 'black';
  }
  if (character.defense_droit === 0) {
    if (character.spe >= 0.1) {
      character.spe -= 0.1;
      character.defense_bouton = 1;
      character.defense_droit = 4;
      specialLogMessage = `${character.name} se defend contre la prochaine attaque de ${opponent.name}.`;
      console.log("3");
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
      console.log("4");
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
  }
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
  App.updateUI();
  App.scrollToBottom();
};

App.handleAttack = function(attacker, defender, isPlayer) {
  const isPlayerAttacking = isPlayer;
  let logColor = 'null';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log("L'utilisateur préfère le mode sombre");
    logColor = 'white';
  } else {
    console.log("L'utilisateur préfère le mode clair");
    logColor = 'black';
  }

  // Augmentation de spe et gestion des actions spéciales
  if (isPlayerAttacking) {
    specialAbility = attacker.spe;
    attacker.last_action = 0;
  }
  if (isPlayerAttacking && attacker.spe < 0) {
    attacker.last_action = 2;
  }

  if (["Doudou", "Diva", "Cocobi"].includes(attacker.name)) {
    attacker.spe += 0.20;
    if (!isPlayer && attacker.isDefending) {
      attacker.spe -= 0.20;
      attacker.isDefending = false;
    }
  } else if (["Boompy"].includes(attacker.name)) {
    attacker.spe += 0.34;
  } else {
    attacker.spe += 0.25;
    if (!isPlayer && attacker.isDefending) {
      attacker.spe -= 0.25;
      attacker.isDefending = false;
    }
  }
  if (attacker.spe >= 1) attacker.spe = 1;

  let damage, specialLogMessage;

  // Cas d'immobilisation ou de cape
  if (attacker.immobilisation > 0) {
    damage = 0;
    specialLogMessage = `${defender.name} a immobilisé ${attacker.name} ! Il ne peut pas attaquer.`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
  } else if (defender.cape) {
    damage = 0;
    specialLogMessage = `${defender.name} a utilisé une cape de l'ombre, ${attacker.name} ne l'a pas atteint !`;
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
  } else {
    // Calcul aléatoire de la défense
    const defenseModifier = 0.9 + Math.random() * 0.2;
    const modifiedDefense = Math.round(defender.defense * defenseModifier);
    damage = Math.max(0, attacker.attaque - modifiedDefense);
    if (attacker.name === "Boompy" && attacker.spe >= 1) {
      damage = Math.max(0, attacker.attaque * 1.5 - modifiedDefense);
      attacker.spe -= 1;
      specialLogMessage = `${attacker.name} est surchargé, il inflige 150% de ses dégats de base !`;
      App.addCombatLog(specialLogMessage, logColor, isPlayer);
    }
    if (defender.defense_bouton === 1) {
      defender.defense_bouton = 0;
      damage = Math.round(attacker.attaque * 0.2);
    }

    App.opponentCharacter.degats_subit = damage;
    defender.pv = Math.max(defender.pv - damage, 0);

    if (isPlayerAttacking) {
      specialLogMessage = `Vous attaquez et infligez ${damage} points de dégâts à ${defender.name}.`;
      document.getElementById('opponent-pv').textContent = `PV: ${defender.pv}`;
      App.playerCharacter.degats_partie += damage;
      if (App.playerCharacter.spe >= 0.1) {
        App.playerCharacter.degats_partie_base += damage;
      }
    } else {
      specialLogMessage = `${attacker.name} attaque et inflige ${damage} points de dégâts.`;
      document.getElementById('player-pv').textContent = `PV: ${defender.pv}`;
    }
    App.addCombatLog(specialLogMessage, logColor, isPlayer);
  }

  // Si le défenseur est vaincu
  if (defender.pv === 0) {
    const userData = getUserData();
    let perteTrophees = 0;

    // Victoire ou défaite
    if (isPlayerAttacking) {
      userData.victoires += 1;
      userData.trophees += 10;
      userData.fin_trophee = 10;
      if (userData.parties_test < 1) {
        userData.trophees -= 10;
      }
    } else {
      userData.defaites += 1;
      // Calcul perte de trophées selon palier
      if (userData.trophees < 150) perteTrophees = 1;
      else if (userData.trophees <= 150) perteTrophees = 3;
      else if (userData.trophees <= 300) perteTrophees = 5;
      else if (userData.trophees <= 500) perteTrophees = 8;
      else if (userData.trophees <= 750) perteTrophees = 10;
      else perteTrophees = 12;
      if (userData.parties_test < 1) {
        perteTrophees = 0;
      }
      userData.fin_trophee = perteTrophees * (-1);
      userData.trophees = Math.max(userData.trophees - perteTrophees, 0);
      saveUserData(userData);
    }

    // Récompenses XP & argent
    let gain_XP = App.calculateXP(attacker, defender, isPlayerAttacking);
    let gain_argent = Math.round(gain_XP / 3);
    if (gain_XP < 20 && isPlayerAttacking) gain_XP = 20;
    if (userData.XP_jour >= 2500) gain_XP = 0;
    userData.XP_jour += gain_XP;
    saveUserData(userData);

    // Bonus double XP
    if (userData.Double_XP > 0) {
      gain_XP *= 2;
      userData.Double_XP -= 1;
    } else if (userData.Double_XP_acheté > 0) {
      gain_XP *= 2;
      userData.Double_XP_acheté -= 1;
    }

    // Première parties gratuites (weekend/test)
    if (userData.parties_test < 1) {
      gain_argent = 0;
      gain_XP = 0;
      userData.parties_test += 1;
      saveUserData(userData);
    }
    userData.pass_XP += gain_XP;
    saveUserData(userData);

    // Application des gains finaux
    App.updateCharacterXP(userData, App.playerCharacter.name, gain_XP);
    userData.argent += gain_argent;
    userData.gagnant = attacker.name;
    userData.fin_xp = gain_XP;
    userData.fin_argent = gain_argent;

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
              case "VCS":
                if (isPlayerAttacking) userData[currentKey] += 1;
                break;
              case "CC":
                userData[currentKey] += App.playerCharacter.capacite_partie;
                break;
              case "VPCS":
                if (isPlayerAttacking && App.playerCharacter.name === userData[characterKey]) {
                  userData[currentKey] += 1;
                }
                break;
              case "DSC":
                userData[currentKey] += App.playerCharacter.degats_partie;
                break;
              case "O":
                userData[currentKey] += App.playerCharacter.objets_partie;
                break;
              case "DC":
                userData[currentKey] += App.playerCharacter.defense_partie;
                break;
            }
            saveUserData(userData);
          }
        }
      }
    }

    // ——— Quêtes principales ———
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
        case "dommages_classique":
          userData[currentKey] += App.playerCharacter.degats_partie;
          break;
        case "objets_total":
          userData[currentKey] += App.playerCharacter.objets_partie;
          break;
        case "defense_classique":
          userData[currentKey] += App.playerCharacter.defense_partie;
          break;
      }
    });
    saveUserData(userData);

    // ----- Quêtes d'été -----
    for (let i = 1; i <= 15; i++) {
      const key = `Summer${i}`;
      const activeKey = `${key}_active`;
      const typeKey = `${key}_type`;
      const currentKey = `${key}_current`;
      if (userData[activeKey]) {
        switch (userData[typeKey]) {
          case "VTM":
            if (isPlayerAttacking) userData[currentKey] += 1;
            break;
          case "VSD":
            if (isPlayerAttacking && App.playerCharacter.defense_partie === 0) {
              userData[currentKey] += 1;
            }
            break;
          case "CSP":
            if (App.playerCharacter.capacite_partie >= 3) {
              userData[currentKey] += 1;
            }
            break;
          case "DPS":
            if (App.playerCharacter.degats_partie >= 10000) {
              userData[currentKey] += 1;
            }
            break;
          case "SMP":
            if (App.playerCharacter.soin >= 4000) {
              userData[currentKey] += 1;
            }
            break;
          case "ODP":
            if (App.playerCharacter.objets_partie >= 3) {
              userData[currentKey] += 1;
            }
            break;
          case "VMT":
            if (isPlayerAttacking && App.playerCharacter.tourTT <= 30) {
              userData[currentKey] += 1;
            }
            break;
          case "MDST":
            if (App.playerCharacter.MaxDegats >= 1000) {
              userData[currentKey] += 1;
            }
            break;
          case "DPS2":
            if (App.playerCharacter.degats_partie >= 12000) {
              userData[currentKey] += 1;
            }
            break;
          case "VEL":
            if (isPlayerAttacking && App.playerCharacter.name === "Cocobi" || App.playerCharacter.name === "Diva" || App.playerCharacter.name === "Poulpy" || App.playerCharacter.name === "Rosalie" || App.playerCharacter.name === "Inconnu" || App.playerCharacter.name === "Boompy") {
              userData[currentKey] += 1;
            }
            break;
          case "ASH":
            if (App.playerCharacter.amulette_heal >= 5) {
              userData[currentKey] += 1;
            }
            break;
          case "USP":
            if (App.playerCharacter.objets_soin >= 3) {
              userData[currentKey] += 1;
            }
            break;
          case "VPS":
            if (isPlayerAttacking) {
              userData[currentKey] += 1;
            }
            break;
          case "VPP":
            if (isPlayerAttacking && App.playerCharacter.name === "Perro") {
              userData[currentKey] += 1;
            }
            break;
        }
      }
    }

    // Vérification de déblocage de personnages
    App.checkAndDisplayCharacterUnlock(userData);

    // Log de fin de combat
    specialLogMessage = isPlayerAttacking
      ? `${defender.name} a été vaincu !`
      : `${attacker.name} vous a vaincu !`;
    App.addCombatLog(specialLogMessage, logColor, "milieu");
    saveUserData(userData);

    // Fin de partie
    setTimeout(() => {
      localStorage.removeItem("savepartie");
      sessionStorage.removeItem('App.playerCharacter');
      sessionStorage.removeItem('opponentCharacter');
      loadPage("fin_partie");
    }, 2000);

  } else {
    // Le combat continue si le défenseur tient encore
    if (isPlayerAttacking) {
      App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
      App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
      App.updateUI();
      App.opponentTurn();
    }
    App.updateSpecialBar(App.playerCharacter, 'player-special-bar');
    App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
    App.updateUI();
  }

  App.updateSpecialButton();
  App.scrollToBottom();
};


App.calculateXP = function(attacker, defender, isPlayerAttacking) {
  let userData = getUserData();
  let niveau = Number(userData[attacker.name + "_Level"]) * 0.1;
  if (isPlayerAttacking) {
    let joueur_pv = attacker.pv;
    let joueur_pv_base = attacker.pv_max;
    return Math.round((2 * (joueur_pv / joueur_pv_base) * 100) * (1 / (1 + niveau)));
  } else if (userData.XP_jour >= 2500) {
    return 0;
  } else {
    return Math.round(20 - (2 * (niveau - 1)));
  }
};

App.updateCharacterXP = function(userData, characterName, xp) {
  switch (characterName) {
    case "Willy":
      userData.Willy_XP += xp;
      break;
    case "Cocobi":
      userData.Cocobi_XP += xp;
      break;
    case "Oiseau":
      userData.Oiseau_XP += xp;
      break;
    case "Grours":
      userData.Grours_XP += xp;
      break;
    case "Baleine":
      userData.Baleine_XP += xp;
      break;
    case "Doudou":
      userData.Doudou_XP += xp;
      break;
    case "Coeur":
      userData.Coeur_XP += xp;
      break;
    case "Diva":
      userData.Diva_XP += xp;
      break;
    case "Poulpy":
      userData.Poulpy_XP += xp;
      break;
    case "Colorina":
      userData.Colorina_XP += xp;
      break;
  }
  saveUserData(userData);
};

App.scrollToBottom = function() {
  const combatLog = document.getElementById('combat-log');
  combatLog.scrollTop = combatLog.scrollHeight;
};

App.checkAndDisplayCharacterUnlock = function(userData) {
  const rewardPals = [
    { trophies: 10 },
    { trophies: 20 },
    { trophies: 30 },
    { trophies: 40 },
    { trophies: 60 },
    { trophies: 80 },
    { trophies: 100 },
    { trophies: 120 },
    { trophies: 150 },
    { trophies: 180 },
    { trophies: 220 },
    { trophies: 260 },
    { trophies: 300 },
    { trophies: 350 },
    { trophies: 400 },
    { trophies: 460 },
    { trophies: 520 },
    { trophies: 580 },
    { trophies: 650 },
    { trophies: 720 },
    { trophies: 800 },
    { trophies: 880 },
    { trophies: 970 },
    { trophies: 1060 },
    { trophies: 1150 },
    { trophies: 1250 },
    { trophies: 1350 },
    { trophies: 1460 },
    { trophies: 1570 },
    { trophies: 1690 }
  ];

  if (!userData.palier_recompense) {
    userData.palier_recompense = [];
  }

  let newPalsReached = 0;

  for (const reward of rewardPals) {
    if (userData.trophees >= reward.trophies) {
      if (!userData.palier_recompense.includes(reward.trophies)) {
        userData.palier_recompense.push(reward.trophies);
        userData.recompense += 1;
        newPalsReached++;
      }
    }
  }

  if (newPalsReached > 0 && (userData.palier_recompense.length % 10 === 0)) {
    userData.perso_recompense = (userData.perso_recompense || 0) + 1;
  }

  saveUserData(userData);
};

// app.js (ou ton module principal SPA)

// 1) On s’assure que le panneau est en état "inactive" dès qu’il apparaît
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
