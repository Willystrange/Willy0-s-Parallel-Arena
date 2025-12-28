// =================================================================================
// CORE COMBAT UI & UTILS
// Ce fichier gère uniquement l'affichage et les utilitaires partagés.
// La logique métier du combat (calculs, dégâts, IA) est sur le serveur.
// =================================================================================

window.App = window.App || {};

// -----------------------------------------------------------------------------
// 1. GESTION DE L'INTERFACE (UI)
// -----------------------------------------------------------------------------

App.updateSpecialBar = function(character, elementId) {
  const specialBar = document.getElementById(elementId);
  if (!specialBar) return;
  const fillElement = specialBar.querySelector('.special-fill');
  if (!fillElement) return;
  const maxSpecialAbility = 1;
  const widthPercentage = (character.spe / maxSpecialAbility) * 100;
  fillElement.style.width = `${widthPercentage}%`;
};

App.updateSpecialButton = function() {
  const btn = document.getElementById('special-button');
  if (!btn || !App.playerCharacter) return;

  const specialValue = App.playerCharacter.spe || 0;

  if (specialValue >= 1) {
    btn.classList.add('bright', 'grow');
    btn.textContent = 'Capacité spéciale';
  } else {
    btn.classList.remove('bright', 'grow');
    btn.textContent = `${specialValue.toFixed(2)} / 1`;
  }
};

App.updateUI = function() {
  if (!App.playerCharacter || !App.opponentCharacter) return;
  
  // Arrondi pour l'affichage
  App.playerCharacter.pv = Math.round(App.playerCharacter.pv);
  App.opponentCharacter.pv = Math.round(App.opponentCharacter.pv);

  document.getElementById('player-name').textContent = App.playerCharacter.name;
  document.getElementById('player-pv').textContent = `PV: ${App.playerCharacter.pv}`;
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');

  document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
  document.getElementById('opponent-pv').textContent = `PV: ${App.opponentCharacter.pv}`;
  App.updateSpecialBar(App.opponentCharacter, 'opponent-special-bar');
};

App.addCombatLog = function(message, color, isPlayer) {
  const combatLog = document.getElementById('combat-log');
  if (!combatLog) return;
  
  const logEntry = document.createElement('p');
  logEntry.textContent = message;
  logEntry.style.color = color;
  
  if (isPlayer === true) logEntry.style.textAlign = "left";
  else if (isPlayer === false) logEntry.style.textAlign = "right";
  else logEntry.style.textAlign = "center";
  
  combatLog.appendChild(logEntry);
  combatLog.scrollTop = combatLog.scrollHeight;
};

App.scrollToBottom = function() {
  const combatLog = document.getElementById('combat-log');
  if (combatLog) {
    combatLog.scrollTop = combatLog.scrollHeight;
  }
};

// -----------------------------------------------------------------------------
// 2. DONNÉES D'AFFICHAGE (STATISTIQUES & EFFETS)
// -----------------------------------------------------------------------------

// Initialisation complète des personnages (RESTORED)
App.initializeCharacterProperties = function(character, isPlayer) {
    // --- BASE INITIALIZATION (for all modes) ---
    character.effects = character.effects || [];
    if (isPlayer && App.userData.characters && App.userData.characters[character.name]) {
        character.equipments = App.userData.characters[character.name].equipments || [];
    } else if (!character.equipments) {
        character.equipments = [];
    }
    character.bonusDamageNextAttack = 0;
    character.gardienRoyalTriggered = false;
    character.egideAubeTriggered = false;
    character.hermesBootsTriggered = false;
    character.guaranteedCritNextAttack = false;
    character.bottesInitieUsed = false;
    character.pv_maximum = character.pv;
    character.immobilisation = 0;
    character.defense_bouton = 0;
    character.defense_droit = 0;
    character.inconnu_super = 0;
    character.focalisateurDebuffTurns = 0;
    character.perte_att = 0;
    character.Oiseaudefense = 0;
    character.perte_defense_colorina = 0;
    character.sboonie_attaque = 0;
    character.poulpy_att = 0;
    character.Perro = 0;
    character.degats_partie = 0;
    character.objets_partie = 0;
    character.capacite_partie = 0;
    character.defense_partie = 0;
    character.objets_utilise = 0;
    character.inventaire_objets = false;
    character.tour = 1;
    character.last_action = 0;
    character.amulette_soin = 0;
    character.attaque_epee = 0;
    character.attaque_elixir = 0;
    character.armure = 0;
    character.degats_partie_base = 0;
    character.objets_soin = 0;
    character.defense_solide = 0;
    character.amuletteUses = 0;
    character.armureUses = 0;
    character.cape = false;
    character.capeUses = 0;
    character.crystalUses = 0;
    character.tourTT = 0;
    character.soin = 0;
    character.MaxDegats = 0;
    character.amulette_heal = 0;
    character.degats_subit = 0;
    character.special_countered_partie = 0;
    character.next_choice = "0";
    character.isDefending = false;
    character.PVAVANT = character.pv;
    character.PVAPRES = character.pv;
    character.chargement2 = false;
    character.nodefense = false;
    character.points2 = false;
    character.xp2 = false;
    character.noobject = false;
    character.isRaging = false;
    character.fragileArmor = false;
    character.quickRecovery = false;
    character.cursed = false;
    character.blessed = false;
    character.paradoxePosture = null;

    // Give AI random items at the start of a fight
    if (!isPlayer) {
        character.aiItems = [];
        // Assumes 'equipments' global variable from equipments_info.js is available
        const allItems = window.equipments || [];
        
        // Filter for consumable items that the AI can reasonably use.
        const consumableItems = allItems.filter(item => 
            [
                'Potion de Santé', 
                'Amulette de Régénération', 
                'Épée Tranchante', 
                'Elixir de Puissance', 
                'Armure de Fer', 
                'Bouclier solide', 
                'Crystal de renouveau', 
                "Cape de l'ombre",
                'Orbe de Siphon',
                'Purge Spirituelle'
            ].includes(item.name)
        );
        
        if (consumableItems.length > 0) {
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * consumableItems.length);
                // Add a copy to avoid issues if the same item is picked twice
                character.aiItems.push({ ...consumableItems[randomIndex] }); 
            }
            console.log("AI was given the following items:", character.aiItems.map(i => i.name));
        }
    }
};

App.effectNames = {
    'orbe_siphon_effect': "Gain d'énergie réduit",
    'purge_spirituelle': "Purge Spirituelle",
    'diva_special': "Attaque réduite",
    'poulpy_special': "Défense fragilisée",
    'oiseau_special': "Défense renforcée",
    'colorina_special': "Défense affaiblie",
    'sboonie_special': "Attaque affaiblie",
    'inconnu_buff_att': "Attaque augmentée",
    'inconnu_buff_def': "Défense augmentée",
    'perro_special': "Défense perforée",
    'nautilus_debuff': "Défense brisée",
    'epee_tranchante': "Bonus de l'Épée Tranchante",
    'elixir_puissance': "Bonus de l'Elixir de Puissance",
    'armure_fer_debuff': "Malus de l'Armure de Fer",
    'bouclier_solide': "Bonus du Bouclier Solide",
    'marque_chasseur': "Bonus Marque de Chasseur",
    'focalisateur_debuff': "Malus du Focalisateur",
    'riposte_affaiblie': "Riposte affaiblie",
    'boompy_surcharge_instable': "Surcharge Instable",
    'frostbite_buff_def': "Défense de Givre",
    'frostbite_debuff_def': "Défense Gelée",
    'inferno_debuff_att': "Attaque Incinérée",
    'steel_sentinel_buff_def': "Barrière d'Acier",
    'shadow_stalker_buff_def': "Voile d'Ombre",
    'thunderstrike_debuff_att': "Commotion",
    'giga_titan_buff_att': "Rage de Titan",
    'giga_titan_buff_def': "Peau de Titan",
    'stormbringer_debuff_def': "Défense Foudroyée",
    'stormbringer_buff_def': "Aura Tempétueuse",
    'earthshaker_debuff_def': "Défense Fracturée",
    'earthshaker_buff_def': "Peau de Pierre",
    'paradoxe_assaut_att': "Posture d'Assaut (Attaque)",
    'paradoxe_assaut_def': "Posture d'Assaut (Défense)",
    'paradoxe_garde_att': "Posture de Garde (Attaque)",
    'paradoxe_garde_def': "Posture de Garde (Défense)",
    'rage_effect': "Rage",
    'fragile_armor_effect': "Armure fragile",
    'quick_recovery_effect': "Récupération rapide",
    'curse_effect': "Malédiction",
    'blessing_effect': "Bénédiction",
    'egide_aube_shield': "Bouclier de l'Égide",
};

// Utilisé par le panneau de stats pour afficher les valeurs réelles
App.getEffectiveStat = function(character, statName) {
    const baseStatValue = character[statName + '_originale'] || character[statName];
    
    let additiveBonus = 0;
    let multiplicativeBonus = 1;

    // Bonus Amulette du Paria (Visualisation seulement, le serveur fait foi)
    if ((character.equipments || []).includes('amulette_paria') && character.pv < (character.pv_maximum * 0.5)) {
        if (statName === 'attaque') {
            additiveBonus += 20;
        } else if (statName === 'defense') {
            additiveBonus += 15;
        }
    }

    if (character.effects && character.effects.length > 0) {
        character.effects.forEach(effect => {
            if (effect.stat === statName) {
                if (effect.type === 'additive') additiveBonus += effect.value;
                else if (effect.type === 'multiplicative') multiplicativeBonus *= effect.value;
            }
        });
    }

    // Weekend Mode Effects (Visualisation)
    if (statName === 'attaque' && character.isRaging) {
        const pvPercentage = character.pv / character.pv_maximum;
        if (pvPercentage <= 0.3) {
            multiplicativeBonus *= 1.3;
        } else if (pvPercentage <= 0.6) {
            multiplicativeBonus *= 1.15;
        }
    }
    if (statName === 'defense' && character.fragileArmor) {
        multiplicativeBonus *= 0.5;
    }

    return Math.round((baseStatValue + additiveBonus) * multiplicativeBonus);
};

// -----------------------------------------------------------------------------
// 3. SAUVEGARDE ET CHARGEMENT LOCAL
// -----------------------------------------------------------------------------

App.getSaveKey = function() {
    if (App.gameMode === 'classic') {
        return 'savepartie';
    } else if (App.gameMode === 'weekend') {
        return 'savepartie_weekend';
    } else if (App.gameMode === 'survie') {
        return 'savepartie_survie';
    }
    return null;
};

App.saveGame = function(playerCharacter, opponentCharacter) {
    const key = App.getSaveKey();
    if (!key || !playerCharacter || !opponentCharacter) return;

    const saveData = {
        playerCharacter: { ...playerCharacter },
        opponentCharacter: { ...opponentCharacter }
    };
    localStorage.setItem(key, JSON.stringify(saveData));
};

App.loadGame = function() {
    const key = App.getSaveKey();
    if (!key) return null;

    const savedData = localStorage.getItem(key);
    if (!savedData) return null;

    try {
        const s = JSON.parse(savedData);
        // Compatibilité ascendante basique
        if (s.playerCharacter && !s.playerCharacter.effects) s.playerCharacter.effects = [];
        if (s.opponentCharacter && !s.opponentCharacter.effects) s.opponentCharacter.effects = [];
        return s;
    } catch (e) {
        console.error(`Error loading save data for key ${key}:`, e);
        return null;
    }
};

// -----------------------------------------------------------------------------
// 4. GESTION DES OBJETS (UI)
// -----------------------------------------------------------------------------

// Effets locaux pour mise à jour immédiate de l'inventaire avant confirmation serveur
App.itemEffects = {
  'Crystal de renouveau': (userData, player) => { userData.crystal_acheté -= 1; player.crystalUses += 1; },
  "Cape de l'ombre": (userData, player) => { userData.Cape_acheté -= 1; player.capeUses += 1; },
  'Potion de Santé': (userData, player) => { userData.Potion_de_Santé_acheté -= 1; },
  'Amulette de Régénération': (userData, player) => { userData.Amulette_de_Régénération_acheté -= 1; player.amuletteUses += 1; },
  'Épée Tranchante': (userData, player) => { userData.epee_tranchante_acheté -= 1; },
  'Elixir de Puissance': (userData, player) => { userData.elixir_puissance_acheté -= 1; },
  'Armure de Fer': (userData, player) => { userData.armure_fer_acheté -= 1; player.armureUses += 1; },
  'Bouclier solide': (userData, player) => { userData.bouclier_solide_acheté -= 1; },
  'Marque de Chasseur': (userData, player) => { userData.marque_chasseur_acheté -= 1; },
  'Orbe de Siphon': (userData, player) => { userData.orbe_siphon_acheté -= 1; },
  'Purge Spirituelle': (userData, player) => { userData.purge_spirituelle_acheté -= 1; },
};

App.useItem = function(itemName) {
  // Cette fonction est souvent surchargée par les scripts spécifiques (combat.js, etc.)
  // pour appeler executeServerAction. On la garde ici comme fallback ou utilitaire.
  App.playerCharacter.objets_utilise = 1;
  const effect = App.itemEffects[itemName];
  if (effect) {
    effect(App.userData, App.playerCharacter);
  }
  if (window.saveUserData) saveUserData(App.userData);
  App.hideItemSelection();
  App.addCombatLog(`${itemName} utilisé (en attente serveur)...`, 'grey', 'milieu');
};

App.hideItemSelection = function() {
  const itemSelectionDiv = document.getElementById('item-selection');
  if (itemSelectionDiv) itemSelectionDiv.style.display = 'none';
};

App.showItemSelection = function() {
  const itemSelectionDiv = document.getElementById('item-selection');
  if (!itemSelectionDiv || !App.playerCharacter) return;

  itemSelectionDiv.style.display = 'block';
  itemSelectionDiv.innerHTML = '<h3>Choisissez un objet à utiliser</h3>';

  // Vérification spécifique mode weekend (visualisation)
  if (App.gameMode === 'weekend' && App.playerCharacter.noobject) {
      App.addCombatLog("Les objets sont désactivés pour cet événement !", 'red', true);
      App.hideItemSelection();
      return;
  }

  if (App.playerCharacter.objets_utilise > 0) {
      itemSelectionDiv.innerHTML += '<p>Vous avez déjà utilisé un objet ce tour.</p>';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Annuler';
      cancelBtn.onclick = App.hideItemSelection;
      itemSelectionDiv.appendChild(cancelBtn);
      return;
  }

  const availableItems = [];
  if (App.userData.crystal_acheté > 0 && App.playerCharacter.crystalUses < 2) availableItems.push({ name: 'Crystal de renouveau', count: App.userData.crystal_acheté });
  if (App.userData.bouclier_solide_acheté > 0) availableItems.push({ name: 'Bouclier solide', count: App.userData.bouclier_solide_acheté });
  if (App.userData.Cape_acheté > 0 && App.playerCharacter.capeUses < 2) availableItems.push({ name: "Cape de l'ombre", count: App.userData.Cape_acheté });
  if (App.userData.Potion_de_Santé_acheté > 0) availableItems.push({ name: 'Potion de Santé', count: App.userData.Potion_de_Santé_acheté });
  if (App.userData.armure_fer_acheté > 0 && App.playerCharacter.armureUses < 2) availableItems.push({ name: 'Armure de Fer', count: App.userData.armure_fer_acheté });
  if (App.userData.Amulette_de_Régénération_acheté > 0 && App.playerCharacter.amuletteUses < 1) availableItems.push({ name: 'Amulette de Régénération', count: App.userData.Amulette_de_Régénération_acheté });
  if (App.userData.epee_tranchante_acheté > 0) availableItems.push({ name: 'Épée Tranchante', count: App.userData.epee_tranchante_acheté });
  if (App.userData.elixir_puissance_acheté > 0) availableItems.push({ name: 'Elixir de Puissance', count: App.userData.elixir_puissance_acheté });
  if (App.userData.marque_chasseur_acheté > 0) availableItems.push({ name: 'Marque de Chasseur', count: App.userData.marque_chasseur_acheté });
  if (App.userData.orbe_siphon_acheté > 0) availableItems.push({ name: 'Orbe de Siphon', count: App.userData.orbe_siphon_acheté });
  if (App.userData.purge_spirituelle_acheté > 0) availableItems.push({ name: 'Purge Spirituelle', count: App.userData.purge_spirituelle_acheté });

  if (!App.playerCharacter.inventaire_objets) {
      const shuffled = availableItems.sort(() => 0.5 - Math.random());
      App.playerCharacter.selectedItems = shuffled.slice(0, 3);
      App.playerCharacter.inventaire_objets = true;
  }
  const itemsToShow = App.playerCharacter.selectedItems || [];

  if (itemsToShow.length === 0) {
      itemSelectionDiv.innerHTML += "<p>Aucun objet disponible.</p>";
  } else {
      itemsToShow.forEach(item => {
          const btn = document.createElement('button');
          btn.textContent = `${item.name} (${item.count})`;
          btn.onclick = () => App.useItem(item.name);
          itemSelectionDiv.appendChild(btn);
      });
  }

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = App.hideItemSelection;
  itemSelectionDiv.appendChild(cancelBtn);
};

// -----------------------------------------------------------------------------
// 5. PANNEAU DE STATISTIQUES
// -----------------------------------------------------------------------------

App.initStatsPanelState = function() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  panel.classList.remove('active');
  panel.classList.add('inactive');
};

App.renderDetailedStats = function() {
  const container = document.getElementById('detailed-stats-content');
  if (!container) return;
  container.innerHTML = '';
  if (!App.playerCharacter || !App.opponentCharacter) {
    container.innerHTML = '<p>Aucune partie chargée…</p>';
    return;
  }

  const characters = [
    { data: App.playerCharacter, title: App.playerCharacter.name },
    { data: App.opponentCharacter, title: App.opponentCharacter.name }
  ];

  let content = '';
  characters.forEach(characterInfo => {
    const character = characterInfo.data;
    const maxPv = character.pv_maximum || character.pv_max;

    let effectsList = '<h6>Effets actifs</h6>';
    if (character.effects && character.effects.length > 0) {
      effectsList += '<ul>';
      character.effects.forEach(effect => {
        const effectName = App.effectNames[effect.id] || effect.id;
        const duration = effect.duration < 999 ? `${effect.duration} tour(s)` : 'Permanent';
        effectsList += `<li>${effectName} (${duration})</li>`;
      });
      effectsList += '</ul>';
    } else {
      effectsList += '<p>Aucun effet actif.</p>';
    }

    content += `
      <div class="stats-block">
        <h5>${characterInfo.title}</h5>
        <ul>
          PV : ${character.pv} / ${maxPv}<br><br>
          Attaque : ${App.getEffectiveStat(character, 'attaque')} / ${character.attaque_originale}<br><br>
          Défense : ${App.getEffectiveStat(character, 'defense')} / ${character.defense_originale}<br><br>
          Vitesse : ${App.getEffectiveStat(character, 'vitesse')} / ${character.vitesse_originale}
        </ul>
        ${effectsList}
      </div>
    `;
  });

  container.innerHTML = content;
};

App.toggleStatsPanel = function() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;

  const isActive = panel.classList.contains('active');
  panel.classList.toggle('active', !isActive);
  panel.classList.toggle('inactive', isActive);

  // Désactiver les boutons pendant que le panneau est ouvert pour éviter les clics accidentels
  const buttonsDisabled = !isActive;
  const ids = ['attack-button', 'special-button', 'defense-button', 'items-button'];
  ids.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = buttonsDisabled;
  });

  if (!isActive) {
    App.renderDetailedStats();
  }
};