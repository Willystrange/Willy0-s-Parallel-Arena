// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Vérification du lancement de la partie ---
App.startGameIfStarted = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    // Navigation vers la page de combat en mode SPA
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.startGameIfStarted();

// --- Initialisation de la sélection de personnage ---
App.initCharacterSelection = function() {
  // Récupérer les données utilisateur depuis localStorage
  const userData = getUserData();

  // Liste des personnages avec leurs caractéristiques de base
  const characters = [
    {name: "Willy", pv: 11100, attaque: 463, defense: 86, spe: 0.5, vitesse: 200, critique: 5.5, pv_max: 11100, attaque_originale: 463, defense_originale: 86, rarity: 'inhabituel'},
    {name: "Cocobi", pv: 11000, attaque: 440, defense: 115, spe: 0.5, vitesse: 160, critique: 4, pv_max: 11000, attaque_originale: 440, defense_originale: 115, rarity: 'légendaire'},
    {name: "Oiseau", pv: 9800, attaque: 510, defense: 85, spe: 0.5, vitesse: 300, critique: 6.5, pv_max: 9800, attaque_originale: 510, defense_originale: 85, rarity: 'rare'},
    {name: "Grours", pv: 13000, attaque: 430, defense: 68, spe: 0.5, vitesse: 81, critique: 3, pv_max: 13000, attaque_originale: 430, defense_originale: 68, rarity: 'rare'},
    {name: "Baleine", pv: 10200, attaque: 435, defense: 105, spe: 0.5, vitesse: 101, critique: 3.5, pv_max: 10200, attaque_originale: 435, defense_originale: 105, rarity: 'inhabituel'},
    {name: "Doudou", pv: 13800, attaque: 350, defense: 80, spe: 0, vitesse: 1, critique: 2.5, pv_max: 13800, attaque_originale: 350, defense_originale: 80, rarity: 'inhabituel'},
    {name: "Coeur", pv: 10000, attaque: 450, defense: 100, spe: 0.5, vitesse: 180, critique: 4.5, pv_max: 10000, attaque_originale: 450, defense_originale: 100, rarity: 'rare'},
    {name: "Diva", pv: 11021, attaque: 475, defense: 100, spe: 0.5, vitesse: 260, critique: 6, pv_max: 11021, attaque_originale: 475, defense_originale: 100, rarity: 'légendaire'},
    {name: "Poulpy", pv: 11500, attaque: 440, defense: 100, spe: 0.5, vitesse: 121, critique: 4.5, pv_max: 11500, attaque_originale: 440, defense_originale: 100, rarity: 'epique'},
    {name: "Colorina", pv: 9600, attaque: 420, defense: 80, spe: 0.5, vitesse: 61, critique: 3.5, pv_max: 9600, attaque_originale: 420, defense_originale: 80, rarity: 'commun'},
    {name: "Rosalie", pv: 10500, attaque: 460, defense: 85, spe: 0.5, vitesse: 220, critique: 5, pv_max: 10500, attaque_originale: 460, defense_originale: 85, rarity: 'epique'},
    {name: "Sboonie", pv: 10200, attaque: 410, defense: 95, spe: 0.5, vitesse: 21, critique: 3, pv_max: 10200, attaque_originale: 410, defense_originale: 95, rarity: 'commun'},
    {name: "Inconnu", pv: 11300, attaque: 435, defense: 83, spe: 0.25, vitesse: 141, critique: 4, pv_max: 11300, attaque_originale: 435, defense_originale: 83, rarity: "épique"},
    {name: "Boompy", pv: 11800, attaque: 500, defense: 80, spe: 0, vitesse: 280, critique: 7, pv_max: 11800, attaque_originale: 500, defense_originale: 80, rarity: "légendaire"},
    {name: "Perro", pv: 9700, attaque: 420, defense: 85, spe: 0.5, vitesse: 41, critique: 3, pv_max: 9700, attaque_originale: 420, defense_originale: 85, rarity: "commun"},
    {name: "Nautilus", pv: 11280, attaque: 470, defense: 74, spe: 0.5, vitesse: 240, critique: 5, pv_max: 11280, attaque_originale: 470, defense_originale: 74, rarity: "épique"},
    {name: "Paradoxe", pv: 10950, attaque: 450, defense: 100, spe: 0.5, vitesse: 170, critique: 4.5, pv_max: 10950, attaque_originale: 450, defense_originale: 100, rarity: 'épique' },
    {name: "Korb", pv: 9750, attaque: 425, defense: 75, spe: 0.5, vitesse: 95, critique: 3.5, pv_max: 9750, attaque_originale: 425, defense_originale: 75, rarity: 'commun'},
  ];

  const characterList = document.getElementById("character-list");

  // Fonction pour trier et afficher la liste des personnages
  function renderCharacterList(sortType) {
    characterList.innerHTML = '';

    // Séparer les personnages débloqués des non-débloqués
    let unlockedCharacters = [];
    let lockedCharacters = [];

    characters.forEach(character => {
      if (userData[character.name] === 1) {
        unlockedCharacters.push(character);
      } else {
        lockedCharacters.push(character);
      }
    });

    // Fonction de tri des personnages
    function sortCharacters(chars, sortType) {
      const rarityOrder = {
        'commun': 1,
        'inhabituel': 2,
        'rare': 3,
        'epique': 4,
        'legendaire': 5
      };

      function normalizeRarity(str) {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      }

      return chars.sort((a, b) => {
        if (sortType === 'alphabetical') {
          return a.name.localeCompare(b.name);
        }
        if (sortType === 'level_asc' || sortType === 'level_desc') {
          const aLvl = userData[a.name + '_Level'] || 1;
          const bLvl = userData[b.name + '_Level'] || 1;
          return sortType === 'level_asc' ? aLvl - bLvl : bLvl - aLvl;
        }
        if (sortType === 'rarity_asc' || sortType === 'rarity_desc') {
          const aKey = normalizeRarity(a.rarity);
          const bKey = normalizeRarity(b.rarity);
          const aVal = rarityOrder[aKey] || 0;
          const bVal = rarityOrder[bKey] || 0;
          return sortType === 'rarity_asc'
            ? aVal - bVal
            : bVal - aVal;
        }
      });
    }

    unlockedCharacters = sortCharacters(unlockedCharacters, sortType);
    lockedCharacters = sortCharacters(lockedCharacters, sortType);

    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const sortedCharacters = unlockedCharacters.concat(lockedCharacters);

    sortedCharacters.forEach(character => {
      const button = document.createElement("button");
      button.classList.add("character-button");
      button.textContent = character.name;

      if (userData[character.name] === 1) {
        button.style.backgroundColor = darkModeMediaQuery.matches ? "#2C3E50" : "#ff4500";
        button.onclick = () => displayStats(button, character);
      } else {
        button.classList.add("disabled");
        button.onclick = () => {
          button.classList.add("shake");
          setTimeout(() => button.classList.remove("shake"), 500);
          let unlockMessage = button.nextElementSibling;
          if (!unlockMessage || !unlockMessage.classList.contains('unlock-message')) {
            unlockMessage = document.createElement('div');
            unlockMessage.classList.add('unlock-message');
            // TRADUCTION ICI
            unlockMessage.textContent = App.t('character_selection.locked_message');
            button.parentNode.insertBefore(unlockMessage, button.nextSibling);
          }
          unlockMessage.classList.add('show');
        };
      }

      characterList.appendChild(button);
    });
  }

  function displayStats(button, character) {
    document.querySelectorAll('.stats').forEach(el => el.remove());

    const statsDiv = document.createElement('div');
    statsDiv.classList.add('stats');

    const levelKey = character.name + '_Level';
    const currentLevel = userData[levelKey] || 1;
    const pv_pts = userData[character.name + '_PV_pts'] || 0;
    const attaque_pts = userData[character.name + '_attaque_pts'] || 0;
    const defense_pts = userData[character.name + '_defense_pts'] || 0;

    const increasedPV = Math.round((1 + pv_pts * 0.02) * character.pv);
    const increasedAttaque = Math.round((1 + attaque_pts * 0.02) * character.attaque);
    const increasedDefense = Math.round((1 + defense_pts * 0.02) * character.defense);

    let equipmentBonus = { pv: 0, attaque: 0, defense: 0, vitesse: 0, critique: 0 };
    let equipmentDescription = '';
    let finalPV = increasedPV;
    let finalAttaque = increasedAttaque;
    let finalDefense = increasedDefense;
    let finalVitesse = character.vitesse;
    let finalCritique = character.critique;

    if (userData.characters && userData.characters[character.name] && userData.characters[character.name].equipments && window.equipments) {
        userData.characters[character.name].equipments.forEach(equipId => {
            const equipment = window.equipments.find(e => e.id === equipId);
            if (equipment) {
                equipmentBonus.pv += parseInt(equipment.stats.pv) || 0;
                equipmentBonus.attaque += parseInt(equipment.stats.attaque) || 0;
                equipmentBonus.defense += parseInt(equipment.stats.defense) || 0;
                equipmentBonus.vitesse += parseInt(equipment.stats.vitesse) || 0;
                equipmentBonus.critique += parseInt(equipment.stats.critique) || 0;

                if (equipment.rarity === 'Légendaire' && equipment.bonus && equipment.bonus.description) {
                    equipmentDescription += `<p class="legendary-bonus">${equipment.bonus.description}</p>`;
                }
            }
        });

        finalPV += equipmentBonus.pv;
        finalAttaque += equipmentBonus.attaque;
        finalDefense += equipmentBonus.defense;
        finalVitesse += equipmentBonus.vitesse;
        finalCritique += equipmentBonus.critique;
    }

    const formatStat = (base, bonus) => {
        if (bonus !== 0) {
            return `${base} (+${bonus})`;
        }
        return base;
    };

    // --- TRADUCTION ---
    const getStatLabel = (key) => App.t(`character_selection.stats.${key}`);
    const normalizeRarity = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rarityLabel = App.t(`rarity.${normalizeRarity(character.rarity)}`);

    statsDiv.innerHTML = `
      <h3>${character.name} (${getStatLabel('level')} ${currentLevel})</h3>
      <p>${getStatLabel('rarity')} ${rarityLabel}</p>
      <p>${getStatLabel('pv')} ${formatStat(finalPV, equipmentBonus.pv)}</p>
      <p>${getStatLabel('attack')} ${formatStat(finalAttaque, equipmentBonus.attaque)}</p>
      <p>${getStatLabel('defense')} ${formatStat(finalDefense, equipmentBonus.defense)}</p>
      <p>${getStatLabel('speed')} ${formatStat(finalVitesse, equipmentBonus.vitesse)}</p>
      <p>${getStatLabel('crit')} ${formatStat(finalCritique, equipmentBonus.critique)}</p>
      ${equipmentDescription}
      <button class="choose-button"
        onclick="chooseCharacter({
          name: '${character.name}',
          pv: ${finalPV},
          attaque: ${finalAttaque},
          defense: ${finalDefense},
          spe: ${character.spe},
          vitesse: ${finalVitesse},
          critique: ${finalCritique},
          pv_max: ${character.pv_max + (equipmentBonus.pv || 0)},
          attaque_originale: ${character.attaque_originale},
          defense_originale: ${character.defense_originale},
          vitesse_originale: ${character.vitesse},
          critique_originale: ${character.critique},
        }); startMusicC(); ">
  ${getStatLabel('choose_button')}
</button>
    `;
    button.parentNode.insertBefore(statsDiv, button.nextSibling);
    void statsDiv.offsetWidth;
    statsDiv.classList.add('show');
  }

  window.chooseCharacter = function(playerData) {
    window._selectedPlayer = playerData;
    const gameMode = sessionStorage.getItem('gameMode');
    if (gameMode === 'survie') {
        startGame();
    } else {
        const playerEquipments = userData.characters && userData.characters[playerData.name] && userData.characters[playerData.name].equipments
          ? userData.characters[playerData.name].equipments
          : [];
        startGame(playerEquipments.length);
    }
  };

  function startGame(playerEquipmentCount = 0) {
    sessionStorage.setItem('playerCharacter', JSON.stringify(window._selectedPlayer));
    const gameMode = sessionStorage.getItem('gameMode');

    if (gameMode === 'survie') {
        loadPage('combat-survie');
        return;
    }

    const remaining = characters.filter(c => c.name !== window._selectedPlayer.name);
    const opponentCharacter = remaining[Math.floor(Math.random() * remaining.length)];

    const playerMasteryData = (userData.characters && userData.characters[window._selectedPlayer.name])
        ? userData.characters[window._selectedPlayer.name]
        : { masteryLevel: 1, masteryGrade: 0 };
    
    const masteryLevel = playerMasteryData.masteryLevel || 1;
    const masteryGrade = playerMasteryData.masteryGrade || 0;

    let pvMultiplier, attaqueMultiplier, defenseMultiplier, critiqueMultiplier;

    if (masteryLevel === 1) {
        let statMultiplier;
        if (masteryGrade === 0) {
            statMultiplier = 0.85;
        } else if (masteryGrade === 1) {
            statMultiplier = 0.90;
        } else if (masteryGrade === 2) {
            statMultiplier = 0.95;
        } else { // Dernier grade ou plus
            statMultiplier = 1.00;
        }
        pvMultiplier = statMultiplier;
        attaqueMultiplier = statMultiplier;
        defenseMultiplier = statMultiplier;
        critiqueMultiplier = statMultiplier;
    } else {
        // Appliquer les bonus de maîtrise (système actuel pour les autres niveaux)
        pvMultiplier = Math.pow(1.02, masteryLevel) * Math.pow(1.015, masteryGrade);
        attaqueMultiplier = Math.pow(1.025, masteryLevel) * Math.pow(1.02, masteryGrade);
        defenseMultiplier = Math.pow(1.03, masteryLevel) * Math.pow(1.025, masteryGrade);
        critiqueMultiplier = Math.pow(1.015, masteryLevel) * Math.pow(1.01, masteryGrade);
    }

    let incPVopp = Math.round(opponentCharacter.pv * pvMultiplier);
    let incAtkopp = Math.round(opponentCharacter.attaque * attaqueMultiplier);
    let incDefopp = Math.round(opponentCharacter.defense * defenseMultiplier);
    let opponentVitesse = opponentCharacter.vitesse; // Vitesse ne change pas
    let opponentCritique = opponentCharacter.critique * critiqueMultiplier;
    
    // Mettre à jour aussi les stats originales pour la cohérence si nécessaire
    const incAtkOrigOpp = Math.round(opponentCharacter.attaque_originale * attaqueMultiplier);
    const incDefOrigOpp = Math.round(opponentCharacter.defense_originale * defenseMultiplier);
    let opponentEquipments = [];

    if (window.equipments && playerEquipmentCount > 0) {
        let availableEquipments = [...window.equipments];
        for (let i = 0; i < playerEquipmentCount; i++) {
            if (availableEquipments.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableEquipments.length);
            const equipment = availableEquipments[randomIndex];
            
            opponentEquipments.push(equipment.id);

            incPVopp += parseInt(equipment.stats.pv) || 0;
            incAtkopp += parseInt(equipment.stats.attaque) || 0;
            incDefopp += parseInt(equipment.stats.defense) || 0;
            opponentVitesse += parseInt(equipment.stats.vitesse) || 0;
            opponentCritique += parseInt(equipment.stats.critique) || 0;
        }
    }

    const finalOpponentData = {
      name: opponentCharacter.name,
      pv: incPVopp,
      attaque: incAtkopp,
      defense: incDefopp,
      spe: opponentCharacter.spe,
      vitesse: opponentVitesse,
      critique: opponentCritique,
      pv_max: incPVopp,
      attaque_originale: incAtkOrigOpp,
      defense_originale: incDefOrigOpp,
      vitesse_originale: opponentCharacter.vitesse,
      critique_originale: opponentCharacter.critique,
      equipments: opponentEquipments,
    };

    sessionStorage.setItem('opponentCharacter', JSON.stringify(finalOpponentData));

    if (gameMode === 'classique') {
        loadPage('combat');
    } else if (gameMode === 'classique-weeknd') {
        loadPage('combat-weekend');
    } else {
        loadPage('combat'); // Default to classic
    }
  }

  const sortEl = document.getElementById('sort');
  if (sortEl) {
    sortEl.addEventListener('change', e => {
      renderCharacterList(e.target.value);
    });
  }

  renderCharacterList('alphabetical');
};

// Attendre le chargement des traductions avant d'initialiser
if (App.translationPromise) {
    App.translationPromise.then(() => {
        App.translatePage(); // Traduit les éléments statiques avec data-i18n
        App.initCharacterSelection();
    });
} else {
    App.initCharacterSelection();
}