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
    btn.textContent = App.t('combat.actions.special');
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

  const pvLabel = App.t('combat.stats_panel.stat_pv');

  document.getElementById('player-name').textContent = App.playerCharacter.name;
  document.getElementById('player-pv').textContent = `${pvLabel} ${App.playerCharacter.pv}`;
  App.updateSpecialBar(App.playerCharacter, 'player-special-bar');

  document.getElementById('opponent-name').textContent = App.opponentCharacter.name;
  document.getElementById('opponent-pv').textContent = `${pvLabel} ${App.opponentCharacter.pv}`;
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

App.updateTour = function() {}; // Géré par le serveur, conservé pour compatibilité HTML

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
    container.innerHTML = `<p>${App.t('combat.stats_panel.no_game')}</p>`;
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

    let effectsList = `<h6>${App.t('combat.stats_panel.active_effects')}</h6>`;
    if (character.effects && character.effects.length > 0) {
      effectsList += '<ul>';
      character.effects.forEach(effect => {
        // TRADUCTION DES EFFETS
        const effectName = App.t(`effects.${effect.id}`);
        const duration = effect.duration < 999 
            ? App.t('combat.stats_panel.duration_turns', { n: effect.duration }) 
            : App.t('combat.stats_panel.permanent');
        effectsList += `<li>${effectName} (${duration})</li>`;
      });
      effectsList += '</ul>';
    } else {
      effectsList += `<p>${App.t('combat.stats_panel.no_effects')}</p>`;
    }

    content += `
      <div class="stats-block">
        <h5>${characterInfo.title}</h5>
        <ul>
          ${App.t('combat.stats_panel.stat_pv')} ${character.pv} / ${maxPv}<br><br>
          ${App.t('combat.stats_panel.stat_attack')} ${App.getEffectiveStat(character, 'attaque')} / ${character.attaque_originale}<br><br>
          ${App.t('combat.stats_panel.stat_defense')} ${App.getEffectiveStat(character, 'defense')} / ${character.defense_originale}<br><br>
          ${App.t('combat.stats_panel.stat_speed')} ${App.getEffectiveStat(character, 'vitesse')} / ${character.vitesse_originale}
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
        // Use loaded App.equipments
        const allItems = App.equipments || window.equipments || [];
        
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
// 6. GESTIONNAIRE DE COMBAT CENTRALISÉ (API)
// ----------------------------------------------------------------------------- 

App.combatManager = {
    syncCombatStart: async function(gameMode, extraData = {}) {
        const connection = JSON.parse(localStorage.getItem('connection'));
        if (!connection || !connection.userid) {
            loadPage('connection');
            return null;
        }

        const user = firebase.auth().currentUser;
        if (!user) return null;

        // Load equipments data if needed for AI generation client-side (though most logic is server now)
        if (typeof App.loadEquipmentsData === 'function') {
            await App.loadEquipmentsData();
        }

        // Sync local changes first
        if (typeof App.saveUserDataToFirebase === 'function') {
            await App.saveUserDataToFirebase(user.uid);
        }

        const recaptchaToken = await App.getRecaptchaToken(`combat_${gameMode}_start`);
        
        const payload = {
            userId: user.uid,
            gameMode: gameMode,
            playerCharacter: App.playerCharacter, // Note: Server expects names or simple objects, but handles full objs
            opponentCharacter: App.opponentCharacter, // Can be null for survival
            recaptchaToken: recaptchaToken,
            ...extraData
        };

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/combat/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            return data;
        } catch (e) {
            console.error("Combat Start Error:", e);
            return { success: false, error: e.message };
        }
    },

    executeAction: async function(action, extra = {}) {
        // UI Lock
        const buttons = ['attack-button', 'special-button', 'defense-button', 'items-button'];
        buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = true; });

        const connection = JSON.parse(localStorage.getItem('connection'));
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/combat/action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.uid, action, ...extra })
            });
            const data = await response.json();

            if (data.success) {
                // Logs
                if (data.results.logs) {
                    for (const log of data.results.logs) {
                        App.addCombatLog(log.text, log.color, log.side);
                        if (!log.text.startsWith('Tour')) await new Promise(r => setTimeout(r, 600));
                    }
                }
                
                // Unlock buttons on success (unless game over, handled by caller or navigation)
                if (!data.results.gameOver) {
                    buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
                }

                return data;
            } else {
                console.error("Action Error:", data.error);
                // Unlock on error
                buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
                return null;
            }
        } catch (e) {
            console.error("Execute Action Error:", e);
            buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
            return null;
        }
    },

    handleGameOver: function(data, gameMode) {
        if (data.results.updatedUserData) {
            localStorage.setItem('userData', JSON.stringify(data.results.updatedUserData));
        }
        if (data.results.masteryGameResult) {
            sessionStorage.setItem('masteryGameResult', JSON.stringify(data.results.masteryGameResult));
        }
        
        // Clear session and save data
        sessionStorage.removeItem('playerCharacter');
        sessionStorage.removeItem('opponentCharacter');
        const saveKey = App.getSaveKey();
        if (saveKey) localStorage.removeItem(saveKey);

        const cheatBtn = document.getElementById('cheat-btn-dev');
        if (cheatBtn) cheatBtn.remove();

        if (gameMode === 'survie') {
            App.handleSurvivalRewards(data.game.wave);
        } else {
             setTimeout(() => {
                sessionStorage.setItem("gameMode", gameMode);
                loadPage("fin_partie");
            }, 2000);
        }
    }
};

// Fallback for survival rewards handling if not defined elsewhere
App.handleSurvivalRewards = App.handleSurvivalRewards || function(wave) {
    const userData = getUserData();
    const log = document.getElementById('combat-log');
    if (log) {
        log.innerHTML += `<p>${App.t('combat.survival.defeat_wave', { wave: wave })}</p>`;
    }
    setTimeout(() => loadPage('fin_partie_survie'), 2000);
};

// ----------------------------------------------------------------------------- 
// 7. GESTION DES OBJETS (CLIENT)
// ----------------------------------------------------------------------------- 

App.availableCombatItems = [
    { name: 'Potion de Santé', prop: 'Potion_de_Santé_acheté', desc: 'combat.items.potion_desc' },
    { name: 'Amulette de Régénération', prop: 'Amulette_de_Régénération_acheté', desc: 'combat.items.amulet_desc' },
    { name: 'Épée Tranchante', prop: 'epee_tranchante_acheté', desc: 'combat.items.sword_desc' },
    { name: 'Elixir de Puissance', prop: 'elixir_puissance_acheté', desc: 'combat.items.elixir_desc' },
    { name: 'Armure de Fer', prop: 'armure_fer_acheté', desc: 'combat.items.armor_desc' },
    { name: 'Bouclier solide', prop: 'bouclier_solide_acheté', desc: 'combat.items.shield_desc' },
    { name: 'Crystal de renouveau', prop: 'crystal_acheté', desc: 'combat.items.crystal_desc' },
    { name: "Cape de l'ombre", prop: 'Cape_acheté', desc: 'combat.items.cape_desc' },
    { name: 'Marque de Chasseur', prop: 'marque_chasseur_acheté', desc: 'combat.items.hunter_desc' },
    { name: 'Purge Spirituelle', prop: 'purge_spirituelle_acheté', desc: 'combat.items.purge_desc' },
    { name: 'Orbe de Siphon', prop: 'orbe_siphon_acheté', desc: 'combat.items.siphon_desc' }
];

App.showItemSelection = function() {
    const container = document.getElementById('item-selection');
    if (!container) return;

    let contentHtml = `
        <div class="items-grid" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 10px;">
    `;

    let hasItems = false;
    App.availableCombatItems.forEach(item => {
        const quantity = App.userData[item.prop] || 0;
        if (quantity > 0) {
            hasItems = true;
            contentHtml += `
                <button class="item-selection" onclick="App.useItem('${item.name.replace(/'/g, "\'")}')">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty" style="font-weight: bold; margin-left: 5px; color: gold;">x${quantity}</span>
                </button>
            `;
        }
    });

    if (!hasItems) {
        contentHtml += `<p class="no-items">${App.t('combat.actions.no_items')}</p>`;
    }

    contentHtml += `
        </div>
        <button class="cancel-btn" onclick="App.hideItemSelection()" style="padding: 8px 16px; margin-top: 10px;">${App.t('combat.actions.cancel')}</button>
    `;

    container.innerHTML = contentHtml;
    container.style.display = 'block';
    
    const actions = document.querySelector('.combat-actions');
    if (actions) actions.style.display = 'none';
};

App.hideItemSelection = function() {
    const container = document.getElementById('item-selection');
    if (container) container.style.display = 'none';
    
    const actions = document.querySelector('.combat-actions');
    if (actions) actions.style.display = 'flex';
};

App.useItem = function(itemName) {
  App.hideItemSelection();
  App.executeServerAction('use_item', { itemName: itemName });
};

// =================================================================================
// END CORE COMBAT
// =================================================================================
