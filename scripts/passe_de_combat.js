window.App = window.App || {};

// ========== DÉTECTION MULTI-STRATÉGIES D’ADBLOCK ==========
App.detectAdBlock = function() {
  let adBlockDetected = false;

  // 1. Bait element
  const bait = document.createElement('div');
  bait.className = 'ads adsbox ad-banner advertisement adunit';
  bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-10000px;top:-10000px;';
  document.body.appendChild(bait);
  const baitHidden = getComputedStyle(bait).display === 'none' || bait.offsetParent === null;
  document.body.removeChild(bait);
  if (baitHidden) adBlockDetected = true;

  // 2. Variables globales courantes
  if (window.blockAdBlock || window.BlockAdBlock) {
    adBlockDetected = true;
  }

  // 3. API Brave (si disponible)
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    // on met à jour async, mais on force déjà le flag principal
    navigator.brave.isBrave().then(isBrave => {
      if (isBrave) {
        sessionStorage.setItem('adblocker', 'true');
        App.testPass();
      }
    });
  }

  // 4. Requête synchrone vers un script Ads
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', false);
    xhr.send(null);
    if (xhr.status === 0) {
      adBlockDetected = true;
    }
  } catch (e) {
    adBlockDetected = true;
  }

  // Stockage du résultat
  if (adBlockDetected) {
    sessionStorage.setItem('adblocker', 'true');
  } else {
    sessionStorage.removeItem('adblocker');
  }
};

// Ton test qui affiche l’alerte si adblock détecté
// Remplace App.testPass par cette nouvelle version
App.testPass = function() {
  if (sessionStorage.getItem("adblocker")) {
    const overlay = document.getElementById('adblock-overlay');
    overlay.style.display = 'block';

    // Quand l'utilisateur clique ou touche, on renvoie au menu principal
    const handler = () => {
      overlay.style.display = 'none';
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      App.showMainMenu(); // ou loadPage('menu_principal');
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
  }
};


// On lance la détection dès que le DOM est prêt, puis le test
App.detectAdBlock();
App.testPass();
// ===================== NAVIGATION =====================
App.viewCharacters = function() {
  loadPage('perso_stats');
};
App.viewShop = function() {
  loadPage('boutique');
};
App.showMainMenu = function() {
  loadPage('menu_principal');
};
App.goToPasse = function() { /* À définir si nécessaire */ };

App.StartedGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.StartedGame();

// ===================== PASS PREMIUM =====================
App.showPopup = function() {
  document.getElementById('ad-popup').style.display = 'block';
};
App.hidePopup = function() {
  document.getElementById('ad-popup').style.display = 'none';
};
App.handlePurchase = function() {
  App.hidePopup();
  const userData = getUserData();
  const loadingPopup = document.getElementById('loading-popup');
  loadingPopup.style.display = 'block';
  loadingPopup.classList.add('active');
  setTimeout(() => {
    if (userData.argent >= 850) {
      userData.argent -= 850;
      userData.pass_premium = true;
      userData.pass_XP += 500;
      saveUserData(userData);
      alert('Achat réussi, le Parallel Pass 3 Premium est maintenant disponible !');
      alert('En cadeau, vous recevez 500 XP supplémentaire !');
      location.reload();
    } else {
      alert('Points insuffisants pour effectuer cet achat.');
    }
    loadingPopup.classList.remove('active');
    setTimeout(() => loadingPopup.style.display = 'none', 2000);
  }, 2000);
};

// ===================== GESTION DES NIVEAUX ET RÉCOMPENSES =====================
App.initApp = function() {
  // Récupération des données et éléments HTML
  const userData = JSON.parse(localStorage.getItem('userData'));
  const albumContainer = document.getElementById('album-container');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const xpProgressBar = document.querySelector('.xp-progress-bar');
  const xpProgressText = document.getElementById('xp-progress-text');

  // Calcule les XP pour le prochain niveau
  App.calculateNextLevelXP = function(level) {
    return Math.round((50 + (level * 20)) * 1.1);
  };

  // Met à jour l'affichage du niveau et la barre de progression
  App.updateLevelInfo = function() {
    const currentLevel = userData.pass_level;
    const currentXP = userData.pass_XP;
    const nextLevelXP = App.calculateNextLevelXP(currentLevel);
    const xpPercentage = (currentXP / nextLevelXP) * 100;
    xpProgressText.textContent = `XP: ${currentXP} / ${nextLevelXP}`;
    xpProgressBar.style.width = `${xpPercentage}%`;
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('next-level').textContent = currentLevel + 1;
  };

  // Vérifie et applique les level-ups
  App.checkLevelUp = function() {
    let levelGained = false;
    while (userData.pass_XP >= App.calculateNextLevelXP(userData.pass_level)) {
      const nextXP = App.calculateNextLevelXP(userData.pass_level);
      userData.pass_level++;
      userData.pass_XP -= nextXP;
      levelGained = true;
    }
    if (levelGained) {
      saveUserData(userData);
      App.updateLevelInfo();
      alert(`Félicitations ! Vous avez atteint le niveau ${userData.pass_level}.`);
    }
  };

  App.checkLevelUp();
  App.updateLevelInfo();

  // Listes des récompenses
  const freeRewards = [
    { badge: 1, text: "5 Points", level: 1, type: 'points', value: 5, rarity: 'simple' },
    { badge: 2, text: "2 Potions de santé", level: 2, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 3, text: "Double XP", level: 3, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 4, text: "10 Points", level: 4, type: 'points', value: 10, rarity: 'simple' },
    { badge: 5, text: "Bouclier solide", level: 5, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 6, text: "15 Points", level: 6, type: 'points', value: 15, rarity: 'simple' },
    { badge: 7, text: "2 Épées tranchantes", level: 7, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 8, text: "Élixir de puissance", level: 8, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 9, text: "10 Points", level: 9, type: 'points', value: 10, rarity: 'simple' },
    { badge: 10, text: "Amulette de régénération", level: 10, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 11, text: "15 Points", level: 11, type: 'points', value: 15, rarity: 'simple' },
    { badge: 12, text: "2 Potions de santé", level: 12, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 13, text: "2 Double XP", level: 13, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 14, text: "10 Points", level: 14, type: 'points', value: 10, rarity: 'simple' },
    { badge: 15, text: "2 Boucliers solides", level: 15, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 16, text: "20 Points", level: 16, type: 'points', value: 20, rarity: 'simple' },
    { badge: 17, text: "Cape de l’ombre", level: 17, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 18, text: "10 Points", level: 18, type: 'points', value: 10, rarity: 'simple' },
    { badge: 19, text: "Élixir de puissance", level: 19, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 20, text: "Amulette de régénération", level: 20, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 21, text: "10 Points", level: 21, type: 'points', value: 10, rarity: 'simple' },
    { badge: 22, text: "Armure de fer", level: 22, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 23, text: "2 Épées tranchantes", level: 23, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 24, text: "10 Points", level: 24, type: 'points', value: 10, rarity: 'simple' },
    { badge: 25, text: "Crystal de renouveau", level: 25, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 26, text: "15 Points", level: 26, type: 'points', value: 15, rarity: 'simple' },
    { badge: 27, text: "Double XP", level: 27, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 28, text: "2 Potions de santé", level: 28, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 29, text: "Élixir de puissance", level: 29, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 30, text: "10 Points", level: 30, type: 'points', value: 10, rarity: 'simple' },
    { badge: 31, text: "20 Points", level: 31, type: 'points', value: 20, rarity: 'simple' },
    { badge: 32, text: "Bouclier solide", level: 32, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 33, text: "2 Épées tranchantes", level: 33, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 34, text: "10 Points", level: 34, type: 'points', value: 10, rarity: 'simple' },
    { badge: 35, text: "Amulette de régénération", level: 35, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 36, text: "10 Points", level: 36, type: 'points', value: 10, rarity: 'simple' },
    { badge: 37, text: "Armure de fer", level: 37, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 38, text: "Crystal de renouveau", level: 38, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 39, text: "2 Potions de santé", level: 39, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 40, text: "10 Points", level: 40, type: 'points', value: 10, rarity: 'simple' },
    { badge: 41, text: "15 Points", level: 41, type: 'points', value: 15, rarity: 'simple' },
    { badge: 42, text: "Élixir de puissance", level: 42, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 43, text: "2 Double XP", level: 43, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 44, text: "10 Points", level: 44, type: 'points', value: 10, rarity: 'simple' },
    { badge: 45, text: "2 Boucliers solides", level: 45, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 46, text: "20 Points", level: 46, type: 'points', value: 20, rarity: 'simple' },
    { badge: 47, text: "Cape de l’ombre", level: 47, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 48, text: "10 Points", level: 48, type: 'points', value: 10, rarity: 'simple' },
    { badge: 49, text: "Amulette de régénération", level: 49, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 50, text: "2 Potions de santé", level: 50, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 51, text: "10 Points", level: 51, type: 'points', value: 10, rarity: 'simple' },
    { badge: 52, text: "Crystal de renouveau", level: 52, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 53, text: "Double XP", level: 53, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 54, text: "10 Points", level: 54, type: 'points', value: 10, rarity: 'simple' },
    { badge: 55, text: "Élixir de puissance", level: 55, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 56, text: "Amulette de régénération", level: 56, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 57, text: "2 Boucliers solides", level: 57, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 58, text: "10 Points", level: 58, type: 'points', value: 10, rarity: 'simple' },
    { badge: 59, text: "Cape de l’ombre", level: 59, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 60, text: "7 récompenses aléatoires", level: 60, type: 'recompense', value: 7, rarity: 'simple' }
  ];
  const premiumRewards = [
    { badge: 1, text: "10 Points", level: 1, type: 'points', value: 10, rarity: 'premium' },
    { badge: 2, text: "3 Potions de santé", level: 2, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 3, text: "2 Double XP", level: 3, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 4, text: "20 Points", level: 4, type: 'points', value: 20, rarity: 'premium' },
    { badge: 5, text: "2 Boucliers solides", level: 5, type: 'bouclier_solide', value: 2, rarity: 'premium' },
    { badge: 6, text: "20 Points", level: 6, type: 'points', value: 20, rarity: 'premium' },
    { badge: 7, text: "3 Épées tranchantes", level: 7, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 8, text: "2 Élixirs de puissance", level: 8, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 9, text: "15 Points", level: 9, type: 'points', value: 15, rarity: 'premium' },
    { badge: 10, text: "Amulette de régénération", level: 10, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 11, text: "20 Points", level: 11, type: 'points', value: 20, rarity: 'premium' },
    { badge: 12, text: "3 Potions de santé", level: 12, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 13, text: "3 Double XP", level: 13, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 14, text: "15 Points", level: 14, type: 'points', value: 15, rarity: 'premium' },
    { badge: 15, text: "3 Boucliers solides", level: 15, type: 'bouclier_solide', value: 3, rarity: 'premium' },
    { badge: 16, text: "30 Points", level: 16, type: 'points', value: 30, rarity: 'premium' },
    { badge: 17, text: "Cape de l’ombre", level: 17, type: 'cape_ombre', rarity: 'premium' },
    { badge: 18, text: "15 Points", level: 18, type: 'points', value: 15, rarity: 'premium' },
    { badge: 19, text: "2 Élixirs de puissance", level: 19, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 20, text: "Amulette de régénération", level: 20, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 21, text: "15 Points", level: 21, type: 'points', value: 15, rarity: 'premium' },
    { badge: 22, text: "Armure de fer", level: 22, type: 'armure_fer', rarity: 'premium' },
    { badge: 23, text: "3 Épées tranchantes", level: 23, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 24, text: "15 Points", level: 24, type: 'points', value: 15, rarity: 'premium' },
    { badge: 25, text: "Cristal de renouveau", level: 25, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 26, text: "20 Points", level: 26, type: 'points', value: 20, rarity: 'premium' },
    { badge: 27, text: "3 Double XP", level: 27, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 28, text: "3 Potions de santé", level: 28, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 29, text: "2 Élixirs de puissance", level: 29, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 30, text: "15 Points", level: 30, type: 'points', value: 15, rarity: 'premium' },
    { badge: 31, text: "30 Points", level: 31, type: 'points', value: 30, rarity: 'premium' },
    { badge: 32, text: "2 Boucliers solides", level: 32, type: 'bouclier_solide', value: 2, rarity: 'premium' },
    { badge: 33, text: "3 Épées tranchantes", level: 33, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 34, text: "15 Points", level: 34, type: 'points', value: 15, rarity: 'premium' },
    { badge: 35, text: "Amulette de régénération", level: 35, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 36, text: "20 Points", level: 36, type: 'points', value: 20, rarity: 'premium' },
    { badge: 37, text: "Armure de fer", level: 37, type: 'armure_fer', rarity: 'premium' },
    { badge: 38, text: "Cristal de renouveau", level: 38, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 39, text: "3 Potions de santé", level: 39, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 40, text: "15 Points", level: 40, type: 'points', value: 15, rarity: 'premium' },
    { badge: 41, text: "20 Points", level: 41, type: 'points', value: 20, rarity: 'premium' },
    { badge: 42, text: "2 Élixirs de puissance", level: 42, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 43, text: "3 Double XP", level: 43, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 44, text: "15 Points", level: 44, type: 'points', value: 15, rarity: 'premium' },
    { badge: 45, text: "3 Boucliers solides", level: 45, type: 'bouclier_solide', value: 3, rarity: 'premium' },
    { badge: 46, text: "30 Points", level: 46, type: 'points', value: 30, rarity: 'premium' },
    { badge: 47, text: "Cape de l’ombre", level: 47, type: 'cape_ombre', rarity: 'premium' },
    { badge: 48, text: "15 Points", level: 48, type: 'points', value: 15, rarity: 'premium' },
    { badge: 49, text: "Amulette de régénération", level: 49, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 50, text: "3 Potions de santé", level: 50, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 51, text: "15 Points", level: 51, type: 'points', value: 15, rarity: 'premium' },
    { badge: 52, text: "Cristal de renouveau", level: 52, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 53, text: "2 Double XP", level: 53, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 54, text: "15 Points", level: 54, type: 'points', value: 15, rarity: 'premium' },
    { badge: 55, text: "2 Élixirs de puissance", level: 55, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 56, text: "20 Points", level: 56, type: 'points', value: 20, rarity: 'premium' },
    { badge: 57, text: "3 Épées tranchantes", level: 57, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 58, text: "3 Boucliers solides", level: 58, type: 'bouclier_solide', value: 3, rarity: 'premium' },
    { badge: 59, text: "30 Points", level: 59, type: 'points', value: 30, rarity: 'premium' },
    { badge: 60, text: "7 récompenses aléatoires + Nautilus", level: 60, type: 'recompense', value: 7, rarity: 'premium' }
  ];

  const rewardsPerPage = 3;
  const totalPages = Math.max(
    Math.ceil(freeRewards.length / rewardsPerPage),
    Math.ceil(premiumRewards.length / rewardsPerPage)
  );
  let pages = [];
  let currentPageIndex = 0;

  // Crée un élément de récompense
  App.createRewardElement = function(reward) {
    const div = document.createElement('div');
    div.className = `reward ${reward.rarity}`;
    div.dataset.badge = reward.badge;
    div.dataset.level = reward.level;
    div.dataset.rarity = reward.rarity;
    // Vérification de la récupération
    const redeemed = (reward.rarity === 'simple' && userData[`free_${reward.badge}`]) ||
      (reward.rarity === 'premium' && userData[`premium_${reward.badge}`]);
    if (redeemed) { div.classList.add('redeemed'); }
    div.innerHTML = `
      <div class="badge">${reward.badge}</div>
      ${reward.text}
      <div class="error-message hidden" id="error-${reward.badge}">Vous n'avez pas atteint le niveau nécessaire.</div>
    `;
    return div;
  };

  // Crée une page de récompenses
  App.createPage = function(pageIndex) {
    const page = document.createElement('div');
    page.className = 'page';
    
    const rewardsContainer = document.createElement('div');
    rewardsContainer.className = 'rewards-container';
    
    const freeContainer = document.createElement('div');
    freeContainer.className = 'free-rewards';
    const premiumContainer = document.createElement('div');
    premiumContainer.className = 'premium-rewards';
    
    const freeTitle = document.createElement('h2');
    freeTitle.textContent = 'Récompenses Gratuites';
    freeTitle.className = 'rewards-title';
    freeContainer.appendChild(freeTitle);
    
    const premiumTitle = document.createElement('h2');
    premiumTitle.textContent = 'Récompenses Premium';
    premiumTitle.className = 'rewards-title';
    premiumContainer.appendChild(premiumTitle);
    
    const freeStart = pageIndex * rewardsPerPage;
    for (let i = freeStart; i < freeStart + rewardsPerPage && i < freeRewards.length; i++) {
      freeContainer.appendChild(App.createRewardElement(freeRewards[i]));
    }
    
    const premiumStart = pageIndex * rewardsPerPage;
    for (let i = premiumStart; i < premiumStart + rewardsPerPage && i < premiumRewards.length; i++) {
      const elem = App.createRewardElement(premiumRewards[i]);
      elem.classList.add('premium');
      premiumContainer.appendChild(elem);
    }
    
    rewardsContainer.appendChild(freeContainer);
    rewardsContainer.appendChild(premiumContainer);
    page.appendChild(rewardsContainer);
    
    return page;
  };

  // Ajoute les pages au conteneur
  for (let i = 0; i < totalPages; i++) {
    const page = App.createPage(i);
    albumContainer.appendChild(page);
    pages.push(page);
  }

  // Affiche la page courante
  App.showPage = function(index) {
    pages.forEach((page, i) => page.classList.toggle('active', i === index));
    prevPageBtn.classList.toggle('hidden', index === 0);
    nextPageBtn.classList.toggle('hidden', index === totalPages - 1);
  };

  prevPageBtn.addEventListener('click', () => {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      App.showPage(currentPageIndex);
    }
  });
  nextPageBtn.addEventListener('click', () => {
    if (currentPageIndex < totalPages - 1) {
      currentPageIndex++;
      App.showPage(currentPageIndex);
    }
  });

  // Gestion du clic sur une récompense
  albumContainer.addEventListener('click', event => {
    const rewardElement = event.target.closest('.reward');
    if (!rewardElement) return;
    const badge = rewardElement.dataset.badge;
    const badgeRarity = rewardElement.dataset.rarity;
    const levelRequired = parseInt(rewardElement.dataset.level);
    const errorElement = document.getElementById(`error-${badge}`);
    let free = false, premium = false;
    if (userData.pass_level >= levelRequired) {
      let reward;
      if (badgeRarity === 'simple') {
        reward = freeRewards.find(r => r.badge === parseInt(badge));
        free = true;
      } else if (badgeRarity === 'premium') {
        reward = premiumRewards.find(r => r.badge === parseInt(badge));
        premium = true;
        if (!userData.pass_premium) {
          App.showPopup();
          return;
        }
      }
      if (reward && ((free && !userData[`free_${badge}`]) || (premium && !userData[`premium_${badge}`]))) {
        // Attribution de la récompense
        switch (reward.type) {
          case 'points':
            userData.argent = (userData.argent || 0) + reward.value;
            break;
          case 'potion_sante':
            userData.Potion_de_Santé_acheté = (userData.Potion_de_Santé_acheté || 0) + (reward.value || 1);
            break;
          case 'amulette_regeneration':
            userData.Amulette_de_Régénération_acheté = (userData.Amulette_de_Régénération_acheté || 0) + (reward.value || 1);
            break;
          case 'epee_tranchante':
            userData.epee_tranchante_acheté = (userData.epee_tranchante_acheté || 0) + (reward.value || 1);
            break;
          case 'elixir_puissance':
            userData.elixir_puissance_acheté = (userData.elixir_puissance_acheté || 0) + (reward.value || 1);
            break;
          case 'armure_fer':
            userData.armure_fer_acheté = (userData.armure_fer_acheté || 0) + (reward.value || 1);
            break;
          case 'Double_XP':
            userData.Double_XP_acheté = (userData.Double_XP_acheté || 0) + (reward.value || 1);
            break;
          case 'Personnage':
            userData.Boompy = 1;
            break;
          case 'recompense':
            userData.recompense = (userData.recompense || 0) + (reward.value || 1);
            break;
          case 'bouclier_solide':
            userData.bouclier_solide_acheté = (userData.bouclier_solide_acheté || 0) + (reward.value || 1);
            break;
          case 'cape_ombre':
            userData.Cape_acheté = (userData.Cape_acheté || 0) + (reward.value || 1);
            break;
          case 'crystal_renouveau':
            userData.crystal_acheté = (userData.crystal_acheté || 0) + (reward.value || 1);
            break;
          default:
            break;
        }
        if (badgeRarity === 'simple') {
          userData[`free_${badge}`] = true;
        } else if (badgeRarity === 'premium') {
          userData[`premium_${badge}`] = true;
        }
        saveUserData(userData);
        rewardElement.classList.add('redeemed');
      }
    } else {
      rewardElement.classList.add('shake');
      errorElement.classList.remove('hidden');
      setTimeout(() => rewardElement.classList.remove('shake'), 500);
    }
  });
  App.showPage(currentPageIndex);

  // Mise à jour finale du pass "Boompy"
  let updatedUserData = getUserData();
  if (updatedUserData.pass_level >= 60 && updatedUserData.pass_premium && updatedUserData.Nautilus != 1) {
    updatedUserData.Nautilus = 1;
  }
  saveUserData(updatedUserData);
};
App.updateParallelPassTitle = function() {
  const userData = getUserData();
  const base = document.querySelector('.premiumA .base');
  if (userData.pass_premium) {
    base.textContent = 'Parallel Pass +';
  } else {
    base.textContent = 'Parallel Pass';
  }
}
// Appelle cette fonction une fois que userData est bien chargé
App.updateParallelPassTitle();
App.initApp();