// scripts/perso_stats.js

window.App = window.App || {};

// -------------------------------------------------
// 0) Déclaration des personnages
// -------------------------------------------------
App.characters = [
  { name: "Willy", pv: 11100, attaque: 463, defense: 86, spe: "Effectue trois attaques.", rarete: "inhabituel", classe: "Lame de l’Ombre" },
  { name: "Cocobi", pv: 11000, attaque: 440, defense: 115, spe: "Réduit les PV adverses de 12% de ses PV max.", rarete: "légendaire", classe: "Briseur de Défense" },
  { name: "Oiseau", pv: 9800, attaque: 510, defense: 85, spe: "Inflige 2.5x son attaque et gagne 20 défense.", rarete: "rare", classe: "Assassin Sauvage" },
  { name: "Grours", pv: 13000, attaque: 430, defense: 68, spe: "Inflige 500 + son attaque, ignore 50% de la défense.", rarete: "rare", classe: "Colosse Invincible" },
  { name: "Baleine", pv: 10200, attaque: 435, defense: 105, spe: "Si défense ≥ 29, perd 15 défense, gagne 1000 PV.", rarete: "inhabituel", classe: "Gardien Résolu" },
  { name: "Doudou", pv: 13800, attaque: 350, defense: 80, spe: "Régénère 5% ou 15% de ses PV actuels selon max.", rarete: "inhabituel", classe: "Régénérateur Mystique" },
  { name: "Coeur", pv: 10000, attaque: 450, defense: 100, spe: "Inflige 1.5x son attaque et régénère 10–15% des dégâts.", rarete: "rare", classe: "Soigneur d’Élite" },
  { name: "Diva", pv: 11021, attaque: 475, defense: 100, spe: "Réduit l'attaque adverse de 25% pour 3 tours.", rarete: "légendaire", classe: "Lame de l’Ombre" },
  { name: "Poulpy", pv: 11500, attaque: 440, defense: 100, spe: "Inflige 1.75× son attaque, ignore 50% def, -15% def adversaire.", rarete: "épique", classe: "Briseur de Défense" },
  { name: "Colorina", pv: 9600, attaque: 420, defense: 80, spe: "Inflige 85% de son attaque et réduit la défense de l'adversaire de 15% pour 3 tours.", rarete: "commun", classe: "Briseur de Défense" },
  { name: "Rosalie", pv: 10500, attaque: 460, defense: 85, spe: "Inflige 2× attaque + 25% de chance d'immobiliser.", rarete: "épique", classe: "Maître des Arcanes" },
  { name: "Sboonie", pv: 10200, attaque: 410, defense: 95, spe: "Régénère 8% de ses PV max, inflige 50 dégâts et -15% attaque adverse.", rarete: "commun", classe: "Soigneur d’Élite" },
  { name: "Inconnu", pv: 11300, attaque: 435, defense: 83, spe: "Bloque la capacité adverse pour 3 tours et gagne +25 attaque/défense.", rarete: "épique", classe: "Maître des Arcanes" },
  { name: "Boompy", pv: 11800, attaque: 500, defense: 80, spe: "À chaque attaque, charge un compteur; au troisième coup, déclenche une explosion infligeant 150% de l’attaque à tous les adversaires.", rarete: "légendaire", classe: "Assassin Sauvage" },
  { name: "Perro", pv: 9700, attaque: 420, defense: 85, spe: "Réduit de 30 % la défense de l'adversaire pendant 2 tours.", rarete: "commun", classe: "Briseur de Défense" },
  { name: "Nautilus", pv: 11280, attaque: 470, defense: 74, spe: "3 frappes à 60% de l'attaque. Chaque frappe a 50% de chance de diminuer de 10 points la défense de l'adversaire.", rarete: "épique", classe: "Lame de l’Ombre" }
];

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
  loadPage(name + 'amelioration');
}

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
    const currPV = Math.round((1 + pv_p * .02) * character.pv);
    const currAt = Math.round((1 + at_p * .02) * character.attaque);
    const currDef = Math.round((1 + def_p * .02) * character.defense);

    html = `
      <strong>${character.name}</strong><br>
      Rareté : ${character.rarete}<br>
      Classe : ${character.classe}<br>
      PV : ${currPV}<br>
      Attaque : ${currAt}<br>
      Défense : ${currDef}<br>
      Spéciale : ${character.spe}<br><br>
      <button class="button-improve"
              onclick="App.GoPerso('${character.name}')">
        Améliorer ${character.name}
      </button>
    `;
  } else {
    html = `
      <strong>${character.name}</strong><br>
      Rareté : ${character.rarete}<br>
      Classe : ${character.classe}<br>
      PV : ${character.pv}<br>
      Attaque : ${character.attaque}<br>
      Défense : ${character.defense}<br>
      Spéciale : ${character.spe}
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
App.initCharacters = function() {
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

  App.renderCharacters();
};

App.adjustCharacters(getUserData().nbr_perso || 0);
App.initCharacters();