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
    { name: "Willy", pv: 11100, attaque: 463, defense: 86, spe: 0.5, argent: 0, pv_max: 11100, attaque_originale: 463, defense_originale: 86, rarity: 'inhabituel' },
    { name: "Cocobi", pv: 11000, attaque: 440, defense: 115, spe: 0.5, argent: 0, pv_max: 10800, attaque_originale: 440, defense_originale: 115, rarity: 'légendaire' },
    { name: "Oiseau", pv: 9800, attaque: 510, defense: 85, spe: 0.5, argent: 0, pv_max: 9800, attaque_originale: 510, defense_originale: 85, rarity: 'rare' },
    { name: "Grours", pv: 13000, attaque: 430, defense: 68, spe: 0.5, argent: 0, pv_max: 1300, attaque_originale: 430, defense_originale: 68, rarity: 'rare' },
    { name: "Baleine", pv: 10200, attaque: 435, defense: 105, spe: 0.5, argent: 0, pv_max: 10200, attaque_originale: 435, defense_originale: 105, rarity: 'inhabituel' },
    { name: "Doudou", pv: 13800, attaque: 350, defense: 80, spe: 0, argent: 0, pv_max: 13800, attaque_originale: 350, defense_originale: 80, rarity: 'inhabituel' },
    { name: "Coeur", pv: 10000, attaque: 450, defense: 100, spe: 0.5, argent: 0, pv_max: 10000, attaque_originale: 450, defense_originale: 100, rarity: 'rare' },
    { name: "Diva", pv: 11021, attaque: 475, defense: 100, spe: 0.5, argent: 0, pv_max: 11021, attaque_originale: 475, defense_originale: 100, rarity: 'légendaire' },
    { name: "Poulpy", pv: 11500, attaque: 440, defense: 100, spe: 0.5, argent: 0, pv_max: 11500, attaque_originale: 440, defense_originale: 100, rarity: 'epique' },
    { name: "Colorina", pv: 9600, attaque: 420, defense: 80, spe: 0.5, argent: 0, pv_max: 9600, attaque_originale: 420, defense_originale: 80, rarity: 'commun' },
    { name: "Rosalie", pv: 10500, attaque: 460, defense: 85, spe: 0.5, argent: 0, pv_max: 10500, attaque_originale: 460, defense_originale: 85, rarity: 'epique' },
    { name: "Sboonie", pv: 10200, attaque: 410, defense: 95, spe: 0.5, argent: 0, pv_max: 9900, attaque_originale: 410, defense_originale: 95, rarity: 'commun' },
    { name: "Inconnu", pv: 11300, attaque: 435, defense: 83, spe: 0.25, argent: 0, pv_max: 11300, attaque_originale: 435, defense_originale: 83, rarity: "épique" },
    { name: "Boompy", pv: 11800, attaque: 500, defense: 80, spe: 0, argent: 0, pv_max: 11800, attaque_originale: 500, defense_originale: 80, rarity: "légendaire" },
    {name: "Perro", pv: 9700, attaque: 420, defense: 85, spe: 0.5, argent: 0, pv_max: 9700, attaque_originale: 420, defense_originale: 85, rarity: "commun"},
    {name: "Nautilus", pv: 11280, attaque: 470, defense: 74, spe: 0.5, argent: 0, pv_max: 11280, attaque_originale: 470, defense_originale: 74, rarity: "épique"},
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
      // mapping sans accents
      const rarityOrder = {
        'commun': 1,
        'inhabituel': 2,
        'rare': 3,
        'epique': 4,
        'legendaire': 5
      };

      // fonction de normalisation : minuscules + suppression des accents
      function normalizeRarity(str) {
        return str
          .toLowerCase()
          .normalize('NFD')              // décompose les caractères accentués
          .replace(/[\u0300-\u036f]/g, ''); // supprime les marqueurs d'accent
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

    // Créer les boutons pour chaque personnage
    sortedCharacters.forEach(character => {
      const button = document.createElement("button");
      button.classList.add("character-button");
      button.textContent = character.name;

      if (userData[character.name] === 1) {
        // Personnage débloqué
        button.style.backgroundColor = darkModeMediaQuery.matches ? "#2C3E50" : "#ff4500";
        button.onclick = () => displayStats(button, character);
      } else {
        // Personnage verrouillé
        button.classList.add("disabled");
        button.onclick = () => {
          button.classList.add("shake");
          setTimeout(() => button.classList.remove("shake"), 500);
          let unlockMessage = button.nextElementSibling;
          if (!unlockMessage || !unlockMessage.classList.contains('unlock-message')) {
            unlockMessage = document.createElement('div');
            unlockMessage.classList.add('unlock-message');
            unlockMessage.textContent = "Ce personnage n'est pas encore débloqué !";
            button.parentNode.insertBefore(unlockMessage, button.nextSibling);
          }
          unlockMessage.classList.add('show');
        };
      }

      characterList.appendChild(button);
    });
  }

  // Fonction d'affichage des statistiques d'un personnage sélectionné
  function displayStats(button, character) {
    // Supprimer d'éventuels éléments de statistiques existants
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

    statsDiv.innerHTML = `
      <h3>${character.name} (Niveau ${currentLevel})</h3>
      <p>Rareté: ${character.rarity}</p>          
      <p>PV: ${increasedPV}</p>
      <p>Attaque: ${increasedAttaque}</p>
      <p>Défense: ${increasedDefense}</p>
      <button class="choose-button"
        onclick="chooseCharacter({
          name: '${character.name}',
          pv: ${increasedPV},
          attaque: ${increasedAttaque},
          defense: ${increasedDefense},
          spe: ${character.spe},
          argent: ${character.argent},
          pv_max: ${character.pv_max},
          attaque_originale: ${character.attaque_originale},
          defense_originale: ${character.defense_originale}
        }); startMusicC();">
        Choisir
      </button>
    `;
    button.parentNode.insertBefore(statsDiv, button.nextSibling);
    // Forcer le reflow pour la transition CSS
    void statsDiv.offsetWidth;
    statsDiv.classList.add('show');
  }

  // Définit chooseCharacter en tant que fonction globale, reçoit l'objet complet des stats du joueur
  window.chooseCharacter = function(playerData) {
    // On conserve cet objet pour startGame()
    window._selectedPlayer = playerData;
    startGame();
  };

  // Démarrer la partie avec le personnage sélectionné
  function startGame() {
    // 1) Sauvegarde des infos du joueur AVEC LES STATS CALCULÉES
    sessionStorage.setItem('playerCharacter', JSON.stringify(window._selectedPlayer));

    // 2) Sélection aléatoire d'un adversaire parmi les autres personnages
    const remaining = characters.filter(c => c.name !== window._selectedPlayer.name);
    const opponentCharacter = remaining[Math.floor(Math.random() * remaining.length)];

    // 3) Calcul du niveau et des points d'amélioration de l'adversaire
    const playerLevel = userData[window._selectedPlayer.name + '_Level'] || 1;
    const minLvl = Math.max(1, playerLevel - 1);
    const maxLvl = playerLevel + 2;
    const opponentLevel = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
    const totalPoints = opponentLevel * 4;
    let pvPts = 0, atkPts = 0, defPts = 0;
    for (let i = 0; i < totalPoints; i++) {
      const stat = Math.floor(Math.random() * 3);
      if (stat === 0) pvPts++;
      else if (stat === 1) atkPts++;
      else defPts++;
    }

    const incPVopp = Math.round(opponentCharacter.pv * (1 + pvPts * 0.02));
    const incAtkopp = Math.round(opponentCharacter.attaque * (1 + atkPts * 0.02));
    const incDefopp = Math.round(opponentCharacter.defense * (1 + defPts * 0.02));
    const incAtkOrigOpp = Math.round(opponentCharacter.attaque_originale * (1 + atkPts * 0.02));
    const incDefOrigOpp = Math.round(opponentCharacter.defense_originale * (1 + defPts * 0.02));

    // 4) Sauvegarde dans la session
    sessionStorage.setItem('opponentCharacter', JSON.stringify({
      name: opponentCharacter.name,
      pv: incPVopp,
      attaque: incAtkopp,
      defense: incDefopp,
      spe: opponentCharacter.spe,
      argent: opponentCharacter.argent,
      pv_max: opponentCharacter.pv_max,
      attaque_originale: incAtkOrigOpp,
      defense_originale: incDefOrigOpp
    }));

    // 5) Navigation vers la page de combat
    loadPage('combat-weekend');
  }

  // Tri des personnages via le select
  document.getElementById('sort').addEventListener('change', e => {
    renderCharacterList(e.target.value);
  });

  // Affichage initial
  renderCharacterList('alphabetical');
};

// --- Au chargement du DOM, initialiser la sélection de personnage ---
App.initCharacterSelection();
