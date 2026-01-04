window.App = window.App || {};
App.equipments = App.equipments || window.equipments || [];

// -------------------------------------------------
// 1) Ajustement aléatoire si nécessaire
// -------------------------------------------------
App.adjustCharacters = function(nbr_perso) {
  const ud = getUserData();
  const names = App.characters.map(c => c.name);
  let unlocked = names.filter(n => ud[n] === 1);
  if (unlocked.length >= nbr_perso) return;
  while (unlocked.length < nbr_perso) {
    const rand = names[Math.floor(Math.random() * names.length)];
    if (ud[rand] === 1) continue;
    ud[rand] = 1;
    ud[`${rand}_first`] = true;
    ud[`${rand}_Level`] = 1;
    ud[`${rand}_XP`] = 0;
    unlocked.push(rand);
  }
  saveUserData(ud);
};

// -------------------------------------------------
// 2) Filtre : chargement / sauvegarde
// -------------------------------------------------
App.loadFilter = function() {
  const ud = getUserData();
  // Ne charge plus App.filterOrder
  App.filterAttribute = ud.filterAttribute || 'name';
  const attrSel = document.getElementById('filter-attribute');
  // Supprime la référence à orderSel
  if (attrSel) attrSel.value = App.filterAttribute;
};

App.saveFilter = function(attr) { // Supprime le paramètre 'order'
  const ud = getUserData();
  ud.filterAttribute = attr;
  // Supprime la sauvegarde de ud.filterOrder
  saveUserData(ud);
  App.filterAttribute = attr;
  // Supprime la mise à jour de App.filterOrder
};

// -------------------------------------------------
// 3) Fonctions de tri (simplifiées)
// -------------------------------------------------
App.orderRarity = ['commun', 'inhabituel', 'rare', 'épique', 'légendaire'];

App.getValue = function(c, attribute) { // Ajout de 'attribute' pour la flexibilité
  const ud = getUserData();
  switch (attribute) { // Utilise le paramètre 'attribute'
    case 'level':
      return ud[c.name] === 1
        ? (ud[`${c.name}_Level`] || 1)
        : 0;
    case 'rarete':
      return App.orderRarity.indexOf(c.rarete);
    case 'classe':
      return c.classe.toLowerCase();
    case 'name':
    default:
      return c.name.toLowerCase();
  }
};

// Supprime App.compare car le tri ascendant/descendant n'est plus géré globalement

// -------------------------------------------------
// 4) Récupération de la liste à afficher
// -------------------------------------------------
App.getRenderData = function() {
  const ud = getUserData();
  const attr = App.filterAttribute;

  // Séparer unlocked / locked
  const unlocked = App.characters.filter(c => ud[c.name] === 1);
  const locked = App.characters.filter(c => ud[c.name] !== 1);

  if (attr === 'rarete' || attr === 'classe') {
    // Regrouper par label
    const map = new Map();
    App.characters.forEach(c => {
      const key = c[attr];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    // Trier les labels selon ordre naturel (ascendant)
    let labels = Array.from(map.keys());
    if (attr === 'rarete') {
      labels.sort((a, b) => {
        const ia = App.orderRarity.indexOf(a), ib = App.orderRarity.indexOf(b);
        return ia - ib; // Toujours ascendant pour la rareté
      });
    } else {
      labels.sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase()) return -1;
        if (a.toLowerCase() > b.toLowerCase()) return 1;
        return 0;
      });
    }
    // Construire la data : [{ header:label }, { char }, ...]
    const data = [];
    labels.forEach(label => {
      data.push({ header: label });
      // dans chaque groupe, débloqués d'abord, puis locked
      const group = map.get(label);
      const groupUnlocked = group.filter(c => ud[c.name] === 1);
      const groupLocked = group.filter(c => ud[c.name] !== 1);
      // on peut trier secondairement par nom asc
      groupUnlocked.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      groupLocked.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      groupUnlocked.concat(groupLocked).forEach(c => data.push({ char: c }));
    });
    return data;
  } else {
    // name or level: trier unlocked puis locked
    // Tri ascendant par défaut pour 'name' et 'level'
    unlocked.sort((a, b) => {
      const va = App.getValue(a, attr), vb = App.getValue(b, attr);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    locked.sort((a, b) => {
      const va = App.getValue(a, attr), vb = App.getValue(b, attr);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return unlocked.concat(locked).map(c => ({ char: c }));
  }
};


// -------------------------------------------------
// 5) Rendu dans le DOM
// -------------------------------------------------
App.renderCharacters = function() {
  const container = document.querySelector('.character-container');
  if (!container) return;
  container.innerHTML = '';
  const ud = getUserData();

  App.getRenderData().forEach(item => {
    if (item.header) {
      const h = document.createElement('div');
      h.className = 'group-header';
      h.textContent = item.header;
      container.appendChild(h);
    } else if (item.char) {
      const c = item.char;
      const el = document.createElement('div');
      el.className = 'character';
      if (ud[c.name] === 1) el.classList.add('unlocked');
      const lvl = ud[c.name] === 1
        ? (ud[`${c.name}_Level`] || 1)
        : 0;
      el.innerHTML = `
        <div class="char-wrapper">
          <span class="level-circle">${lvl}</span>
          <span class="char-name">${c.name}</span>
        </div>`;
      el.addEventListener('click', () => App.toggleStats(c, el));
      container.appendChild(el);
    }
  });
};

// -------------------------------------------------
// 6) Toggle stats / affichage / scroll
// -------------------------------------------------
App.GoPerso = function(name) {
  localStorage.setItem('characterToImprove', name);
  loadPage('character-upgrade');
}

App.goToEquipments = function(characterName) {
  sessionStorage.setItem('characterToEquip', characterName);
  loadPage('equipments');
};

App.hideStats = function() {
  const stats = document.querySelector('.stats');
  stats.style.maxHeight = '0px';
  stats.classList.remove('show');
  stats.classList.add('hide');
  stats.addEventListener('transitionend', function onEnd(e) {
    if (e.propertyName === 'max-height') {
      stats.style.display = 'none';
      stats.removeEventListener('transitionend', onEnd);
    }
  });
};

App.displayCharacterStats = function(character, element) {
  const stats = document.querySelector('.stats');
  const ud = getUserData();
  const unlocked = ud[character.name] === 1;
  let html = '';

  if (unlocked) {
    const lvl = ud[`${character.name}_Level`] || 1;
    const pv_p = ud[`${character.name}_PV_pts`] || 0;
    const at_p = ud[`${character.name}_attaque_pts`] || 0;
    const def_p = ud[`${character.name}_defense_pts`] || 0;
    const vit_p = ud[`${character.name}_vitesse_pts`] || 0;
    const crit_p = ud[`${character.name}_critique_pts`] || 0;

    // Données de maîtrise
    const characterData = (ud.characters && ud.characters[character.name]) ? ud.characters[character.name] : {};
    const masteryLevel = characterData.masteryLevel || 0;
    const masteryGrade = characterData.masteryGrade || 0;
    const masteryPoints = characterData.masteryPoints || 0;
    
    // Noms de maîtrise traduits
    let levelName = App.t(`mastery.levels.${masteryLevel}`);
    if (levelName === `mastery.levels.${masteryLevel}`) levelName = App.t('mastery.fallback_level', { level: masteryLevel });

    let gradeName = App.t(`mastery.grades.${masteryGrade}`);
    if (gradeName === `mastery.grades.${masteryGrade}`) gradeName = App.t('mastery.fallback_grade', { grade: masteryGrade + 1 });

    function getPointsRequired(level, grade) {
        const gradesPerLevel = [3, 4, 5, 5, 5, 10]; 
        const basePointsPerGrade = 100;
        const levelMultiplier = Math.pow(1.6, level);
        const gradeMultiplier = 1 + (grade * 0.25);
        return Math.floor(basePointsPerGrade * levelMultiplier * gradeMultiplier);
    }
    const pointsRequired = getPointsRequired(masteryLevel, masteryGrade);
    const progressPercentage = pointsRequired > 0 ? Math.min((masteryPoints / pointsRequired) * 100, 100) : 0;

    // Calcul des stats de base améliorées par les points de compétence
    const basePV = Math.round((1 + pv_p * .02) * character.pv);
    const baseAt = Math.round((1 + at_p * .02) * character.attaque);
    const baseDef = Math.round((1 + def_p * .02) * character.defense);
    const baseVit = Math.round((1 + vit_p * .02) * character.vitesse);
    const baseCrit = Math.round((1 + crit_p * .02) * character.chanceCritique);

    // Calcul des bonus d'équipement
    const equipmentBonuses = { pv: 0, attaque: 0, defense: 0, vitesse: 0, critique: 0 };
    if (ud.characters && ud.characters[character.name] && ud.characters[character.name].equipments) {
      ud.characters[character.name].equipments.forEach(equipId => {
        const equipment = App.equipments.find(e => e.id === equipId);
        if (equipment) {
          Object.keys(equipment.stats).forEach(stat => {
            const value = parseInt(equipment.stats[stat]);
            if (!isNaN(value)) {
              equipmentBonuses[stat] += value;
            }
          });
        }
      });
    }

    // Calcul des stats finales
    const finalPV = basePV + equipmentBonuses.pv;
    const finalAt = baseAt + equipmentBonuses.attaque;
    const finalDef = baseDef + equipmentBonuses.defense;
    const finalVit = baseVit + equipmentBonuses.vitesse;
    const finalCrit = baseCrit + equipmentBonuses.critique;

    // Fonction pour formater l'affichage des stats avec bonus
    const formatStat = (base, bonus) => {
      if (bonus > 0) {
        return `${base + bonus} (+${bonus})`;
      } else if (bonus < 0) {
        return `${base + bonus} (${bonus})`;
      }
      return base;
    };
    
    // Helper pour traduire la classe et la description du sort
    const translateClass = (className) => {
        const key = `classes.${className}`;
        const val = App.t(key);
        return val === key ? className : val;
    };

    const translateSpell = (charName, defaultDesc) => {
        const key = `spell_descriptions.${charName}`;
        const val = App.t(key);
        return val === key ? defaultDesc : val;
    };

    // Traductions des stats
    const translatedRarity = App.t('perso_stats.stats_rarity', { value: character.rarete });
    const translatedClass = App.t('perso_stats.stats_class', { value: translateClass(character.classe) });
    const translatedPV = App.t('perso_stats.stats_pv', { value: formatStat(basePV, equipmentBonuses.pv) });
    const translatedAt = App.t('perso_stats.stats_attack', { value: formatStat(baseAt, equipmentBonuses.attaque) });
    const translatedDef = App.t('perso_stats.stats_defense', { value: formatStat(baseDef, equipmentBonuses.defense) });
    const translatedVit = App.t('perso_stats.stats_speed', { value: formatStat(baseVit, equipmentBonuses.vitesse) });
    const translatedCrit = App.t('perso_stats.stats_crit', { value: formatStat(baseCrit, equipmentBonuses.critique) });
    
    // Traduction de la capacité spéciale (Description statique)
    const spellDesc = translateSpell(character.name, character.spe);
    const translatedSpe = App.t('perso_stats.stats_special', { value: spellDesc });

    html = `
      <button id="mastery-help-icon" class="help-icon">?</button>
      <strong>${character.name}</strong><br>
      ${translatedRarity}<br>
      ${translatedClass}<br>
      ${translatedPV}<br>
      ${translatedAt}<br>
      ${translatedDef}<br>
      ${translatedVit}<br>
      ${translatedCrit}<br>
      ${translatedSpe}<br>
      
      <div class="mastery-display">
        <div class="mastery-title">${App.t('perso_stats.mastery_title')}</div>
        <div class="mastery-rank"><span class="mastery-level-name">${levelName}</span> <span class="mastery-grade-name">${gradeName}</span></div>
        <div class="mastery-progress-bar-container">
          <div class="mastery-progress-bar" style="width: ${progressPercentage}%;"></div>
        </div>
        <div class="mastery-points">${masteryPoints} / ${pointsRequired} pts</div>
      </div>

      <br>
      <button class="button-improve"
              onclick="App.GoPerso('${character.name}')">
        ${App.t('perso_stats.button_improve', { name: character.name })}
      </button>
      <button class="button-improve"
              onclick="App.goToEquipments('${character.name}')">
        ${App.t('perso_stats.button_equip')}
      </button>
    `;
  } else {
    // Version verrouillée
    // Helper pour traduire la classe et la description du sort (répété ou sorti du bloc if)
    const translateClass = (className) => {
        const key = `classes.${className}`;
        const val = App.t(key);
        return val === key ? className : val;
    };
    const translateSpell = (charName, defaultDesc) => {
        const key = `spell_descriptions.${charName}`;
        const val = App.t(key);
        return val === key ? defaultDesc : val;
    };
    
    const spellDesc = translateSpell(character.name, character.spe);

    html = `
      <strong>${character.name}</strong><br>
      ${App.t('perso_stats.stats_rarity', { value: character.rarete })}<br>
      ${App.t('perso_stats.stats_class', { value: translateClass(character.classe) })}<br>
      ${App.t('perso_stats.stats_pv', { value: character.pv })}<br>
      ${App.t('perso_stats.stats_attack', { value: character.attaque })}<br>
      ${App.t('perso_stats.stats_defense', { value: character.defense })}<br>
      ${App.t('perso_stats.stats_speed', { value: character.vitesse })}<br>
      ${App.t('perso_stats.stats_crit', { value: character.chanceCritique })}<br>
      ${App.t('perso_stats.stats_special', { value: spellDesc })}<br>
    `;
  }

  stats.innerHTML = html;
  stats.style.display = 'block';
  stats.style.maxHeight = '0px';
  element.parentNode.insertBefore(stats, element.nextSibling);

  requestAnimationFrame(() => {
    stats.style.maxHeight = stats.scrollHeight + 'px';
    stats.classList.add('show');
    stats.classList.remove('hide');
  });

  setTimeout(() => {
    const container = document.querySelector('.content');
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = element.getBoundingClientRect();
    const offset = eRect.top - cRect.top + container.scrollTop;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }, 150);
};

App.currentCharElement = null;
App.toggleStats = function(character, element) {
  if (App.currentCharElement === element) {
    App.hideStats();
    App.currentCharElement = null;
  } else {
    App.displayCharacterStats(character, element);
    App.currentCharElement = element;
  }
};

// -------------------------------------------------
// 7) Initialisation
// -------------------------------------------------
App.initHelpModal = function() {
    const modal = document.getElementById('mastery-help-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.close-button');
    const levelsList = document.getElementById('mastery-levels-list');
    const gradesList = document.getElementById('mastery-grades-list');

    if (!closeBtn || !levelsList || !gradesList) return;

    // Populate lists using App.t for dynamic arrays
    const levels = App.translations && App.translations.mastery && App.translations.mastery.levels ? App.translations.mastery.levels : [];
    const grades = App.translations && App.translations.mastery && App.translations.mastery.grades ? App.translations.mastery.grades : [];

    levelsList.innerHTML = levels.map(name => `<li>${name}</li>`).join('');
    gradesList.innerHTML = grades.map(name => `<li>${name}</li>`).join('');

    // Event delegation for the help icon
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'mastery-help-icon') {
            modal.style.display = 'block';
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
};

App.initCharacters = async function() {
  if (!App.characters || App.characters.length === 0) {
      if (typeof App.loadCharactersData === 'function') {
          await App.loadCharactersData();
      }
  }

  App.loadFilter();
  const attrSel = document.getElementById('filter-attribute');
  // Supprime la récupération de orderSel
  if (attrSel) { // Simplification de la condition
    attrSel.addEventListener('change', () => {
      App.saveFilter(attrSel.value); // Appelle saveFilter avec un seul paramètre
      App.renderCharacters();
    });
  }

  const stats = document.querySelector('.stats');
  if (stats) {
    stats.style.display = 'none';
    stats.classList.add('hide');
  }
  
  // Traduction de la page statique
  App.translatePage();

  App.initHelpModal();
  App.renderCharacters();
};

App.adjustCharacters(getUserData().nbr_perso || 0);
App.initCharacters();