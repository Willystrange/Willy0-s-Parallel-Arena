window.App = window.App || {};

App.characters = {
  'Doudou': 4,
  'Coeur': 3,
  'Grours': 3,
  'Baleine': 4,
  'Poulpy': 2,
  'Willy': 4,
  'Oiseau': 3,
  'Colorina': 5,
  'Cocobi': 1,
  'Diva': 1,
  'Sboonie': 5,
  'Rosalie': 2,
  'Inconnue': 2,
  'Boompy': 1,
  'Perro': 5,
};

App.rarityProbabilities = {
  1: 0.05, // Légendaire
  2: 0.10, // Épique
  3: 0.20, // Rare
  4: 0.30,  // Inhabituel
  5: 0.35   // Commun
};

App.xpRanges = {
  1: [150, 300], // Légendaire
  2: [100, 150], // Épique
  3: [50, 100],  // Rare
  4: [20, 50],   // Inhabituel
  5: [5, 20],    // Commun
};

App.getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

App.getRandomXP = function() {
  const rarityRand = Math.random();
  let cumulativeProb = 0;
  let selectedRarity = null;
  for (const [rarityLevel, probability] of Object.entries(App.rarityProbabilities)) {
    cumulativeProb += probability;
    if (rarityRand < cumulativeProb) {
      selectedRarity = parseInt(rarityLevel);
      break;
    }
  }
  if (selectedRarity && App.xpRanges[selectedRarity]) {
    const [min, max] = App.xpRanges[selectedRarity];
    return App.getRandomInt(min, max);
  }
}

App.getRandomRarity = function() {
  const rarityRand = Math.random();
  let cumulativeProb = 0;
  let selectedRarity = null;
  for (const [rarityLevel, probability] of Object.entries(App.rarityProbabilities)) {
    cumulativeProb += probability;
    if (rarityRand < cumulativeProb) {
      selectedRarity = parseInt(rarityLevel);
      break;
    }
  }
  return selectedRarity || App.getRandomRarity();
}

App.generateAndStoreReward = function(userData) {
  let rewards = [];
  const forceCharacter = userData.perso_recompense > 0;

  if (forceCharacter) {
    userData.perso_recompense -= 1;
    let characterObtained = false;
    let attempts = 0;
    while (!characterObtained && attempts < 10) {
      attempts++;
      const selectedRarity = App.getRandomRarity();
      const availableCharacters = Object.keys(App.characters).filter(char => userData[char] !== 1 && App.characters[char] === selectedRarity);
      if (availableCharacters.length > 0) {
        const reward = availableCharacters[App.getRandomInt(0, availableCharacters.length - 1)];
        userData[reward] = 1;
        rewards.push(reward);
        saveUserData(userData);
        characterObtained = true;
      }
    }
    // Si aucun personnage n'a pu être obtenu, on offre une récompense de repli
    if (!characterObtained) {
      const doubleXPAmount = App.getRandomInt(1, 5);
      userData.Double_XP_acheté = (userData.Double_XP_acheté || 0) + doubleXPAmount;
      rewards.push(`DOUBLE XP : +${doubleXPAmount}`);
      saveUserData(userData);
    }
  } else {
    userData.recompense -= 1;
    saveUserData(userData);

    const rewardTypes = [
      { type: 'character', chance: 0.06, rarity: 'rare' },
      { type: 'doubleXP', chance: 0.11, rarity: 'commun' },
      { type: 'healthPotion', chance: 0.11, rarity: 'commun' },
      { type: 'amulet', chance: 0.10, rarity: 'commun' },
      { type: 'xp', chance: 0.11, rarity: 'commun' },
      { type: 'money', chance: 0.12, rarity: 'commun' },
      { type: 'epee', chance: 0.10, rarity: 'uncommun' },
      { type: 'elixir', chance: 0.10, rarity: 'uncommun' },
      { type: 'armor', chance: 0.10, rarity: 'uncommun' },
      { type: 'bouclier', chance: 0.09, rarity: 'uncommun' },
      { type: 'cape', chance: 0.10, rarity: 'uncommun' },
      { type: 'crystal', chance: 0.10, rarity: 'uncommun' },
    ];

    const getRewardType = () => {
      let rand = Math.random();
      let cumulativeChance = 0;
      for (const rewardType of rewardTypes) {
        cumulativeChance += rewardType.chance;
        if (rand < cumulativeChance) {
          return rewardType.type;
        }
      }
      return rewardTypes[rewardTypes.length - 1].type;
    };

    const getNumRewards = () => {
      const rand = Math.random();
      if (rand < 0.70) return 1;
      if (rand < 0.90) return 2;
      return 3;
    };

    const numRewards = getNumRewards();
    for (let i = 0; i < numRewards; i++) {
      const rewardType = getRewardType();
      switch (rewardType) {
        case 'character': {
          const selectedRarity = App.getRandomRarity();
          const availableCharacters = Object.keys(App.characters).filter(char => userData[char] !== 1 && App.characters[char] === selectedRarity);
          if (availableCharacters.length > 0) {
            const reward = availableCharacters[App.getRandomInt(0, availableCharacters.length - 1)];
            userData[reward] = 1;
            rewards.push(reward);
          }
          break;
        }
        case 'doubleXP': {
          let doubleXPAmount = App.getRandomInt(1, 5);
          userData.Double_XP_acheté = (userData.Double_XP_acheté || 0) + doubleXPAmount;
          rewards.push(`DOUBLE XP : +${doubleXPAmount}`);
          break;
        }
        case 'healthPotion': {
          userData.Potion_de_Santé_acheté = (userData.Potion_de_Santé_acheté || 0) + 1;
          rewards.push("Potion de Santé");
          break;
        }
        case 'amulet': {
          userData.Amulette_de_Régénération_acheté = (userData.Amulette_de_Régénération_acheté || 0) + 1;
          rewards.push("Amulette de Régénération");
          break;
        }
        case 'xp': {
          const acquiredCharacters = Object.keys(App.characters).filter(char => userData[char] === 1);
          if (acquiredCharacters.length > 0) {
            const character = acquiredCharacters[App.getRandomInt(0, acquiredCharacters.length - 1)];
            const xpAmount = App.getRandomXP();
            userData[character + '_XP'] = (userData[character + '_XP'] || 0) + xpAmount;
            rewards.push(`${character} XP : +${xpAmount}`);
          }
          break;
        }
        case 'money': {
          const moneyAmount = App.getRandomInt(1, 30);
          userData.argent = (userData.argent || 0) + moneyAmount;
          rewards.push(`Points : +${moneyAmount}`);
          break;
        }
        case 'epee': {
          userData.epee_tranchante_acheté = (userData.epee_tranchante_acheté || 0) + 1;
          rewards.push("Épée");
          break;
        }
        case 'elixir': {
          userData.elixir_puissance_acheté = (userData.elixir_puissance_acheté || 0) + 1;
          rewards.push("Elixir de Puissance");
          break;
        }
        case 'armor': {
          userData.armure_fer_acheté = (userData.armure_fer_acheté || 0) + 1;
          rewards.push("Armure de fer");
          break;
        }
        case 'bouclier': {
          userData.bouclier_solide_acheté = (userData.bouclier_solide_acheté || 0) + 1;
          rewards.push("Bouclier Solide");
          break;
        }
        case 'cape': {
          userData.Cape_acheté = (userData.Cape_acheté || 0) + 1;
          rewards.push("Cape de l'ombre");
          break;
        }
        case 'crystal': {
          userData.crystal_acheté = (userData.crystal_acheté || 0) + 1;
          rewards.push("Crystal de renouveau");
          break;
        }
        default:
          break;
      }
    }
  }
  saveUserData(userData);
  return rewards;
}

App.currentRewardIndex = 0;

App.displayReward = function() {
  const userData = getUserData();
  let rewards = JSON.parse(localStorage.getItem('currentReward'));

  if (!rewards) {
    if (!userData) {
      document.getElementById('reward-display').innerText = "Aucune donnée utilisateur trouvée.";
      return;
    }
    if (userData.recompense <= 0 && userData.perso_recompense <= 0) {
      loadPage(menu_principal);
    } else {
      rewards = App.generateAndStoreReward(userData);
      localStorage.setItem('currentReward', JSON.stringify(rewards));
    }
  }

  const rewardDisplay = document.getElementById('reward-display');
  if (rewards.length > 0) {
    rewardDisplay.innerText = rewards[App.currentRewardIndex];
    document.body.addEventListener('click', App.showNextReward);
  } else {
    // Si jamais la liste des récompenses est vide, on redirige directement sans afficher de message d'erreur
    localStorage.removeItem('currentReward');
    loadPage('menu_principal');
  }
}

App.showNextReward = function() {
  const rewards = JSON.parse(localStorage.getItem('currentReward'));
  const rewardDisplay = document.getElementById('reward-display');

  if (App.currentRewardIndex < rewards.length - 1) {
    App.currentRewardIndex++;
    rewardDisplay.innerText = rewards[App.currentRewardIndex];
  } else {
    document.body.removeEventListener('click', App.showNextReward);
    localStorage.removeItem('currentReward');
    loadPage('menu_principal');
  }
}

App.goToMainMenu = function() {
  localStorage.removeItem('currentReward');
  loadPage('menu_principal');
}


App.displayReward();
