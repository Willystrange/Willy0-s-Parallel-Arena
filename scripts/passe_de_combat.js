window.App = window.App || {};

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
  const popup = document.getElementById('premium-pass-popup');
  if (popup) popup.style.display = 'block';
};
App.hidePopup = function() {
  const popup = document.getElementById('premium-pass-popup');
  if (popup) popup.style.display = 'none';
};
App.handlePurchase = function() {
  App.hidePopup();
  const user = firebase.auth().currentUser;
  if (!user) { alert("Veuillez vous connecter"); return; }

  const loadingPopup = document.getElementById('loading-popup');
  loadingPopup.style.display = 'block';
  loadingPopup.classList.add('active');

  App.getRecaptchaToken('pass_purchase').then(recaptchaToken => {
      user.getIdToken().then(token => {
          fetch('/api/pass/buy', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  userId: user.uid,
                  recaptchaToken: recaptchaToken
              })
          })
          .then(res => res.json())
          .then(data => {
              loadingPopup.classList.remove('active');
              if (data.success) {
                  localStorage.setItem('userData', JSON.stringify(data.userData));
                  alert(App.t('battle_pass.success_purchase'));
                  alert(App.t('battle_pass.gift_xp'));
                  location.reload();
              } else {
                  alert(data.error || "Erreur lors de l'achat");
                  loadingPopup.style.display = 'none';
              }
          })
          .catch(err => {
              console.error("Erreur achat pass:", err);
              loadingPopup.classList.remove('active');
              loadingPopup.style.display = 'none';
              alert(App.t('shop.errors.network_error'));
          });
      });
  });
};


// ===================== GESTION DES NIVEAUX ET RÉCOMPENSES =====================
App.initApp = function() {
  // Éléments HTML
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
    const freshData = getUserData(); // Toujours utiliser des données fraîches
    const currentLevel = parseInt(freshData.pass_level || 0);
    const currentXP = parseInt(freshData.pass_XP || 0);
    const nextLevelXP = App.calculateNextLevelXP(currentLevel);
    const xpPercentage = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));
    
    xpProgressText.textContent = App.t('battle_pass.level', {current: currentXP, next: nextLevelXP});
    xpProgressBar.style.width = `${xpPercentage}%`;
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('next-level').textContent = currentLevel + 1;
  };

  // Vérifie et notifie les nouveaux niveaux
  App.checkLevelUp = function() {
    const freshData = getUserData();
    const currentLevel = parseInt(freshData.pass_level || 0);
    
    // Utilisation d'une clé locale unique qui ne sera pas écrasée par le serveur
    // Cela garantit que si on a vu l'alerte sur ce navigateur, on ne la revoit pas.
    const localKey = 'parallel_pass_notified_level';
    let lastNotifiedLocal = localStorage.getItem(localKey);

    // Si pas de donnée locale, on tente de prendre celle du profil utilisateur
    if (lastNotifiedLocal === null) {
        lastNotifiedLocal = freshData.pass_last_notified_level || 0;
    }
    
    lastNotifiedLocal = parseInt(lastNotifiedLocal);

    // Cas particulier : Si on charge la page et qu'on est déjà à un niveau élevé (>1)
    // mais qu'aucune notification n'est enregistrée (ex: première visite après maj),
    // on enregistre le niveau actuel sans alerte pour éviter le spam.
    if (isNaN(lastNotifiedLocal) || lastNotifiedLocal === 0) {
         if (currentLevel > 1) {
             localStorage.setItem(localKey, currentLevel);
             freshData.pass_last_notified_level = currentLevel;
             saveUserData(freshData);
             return;
         }
    }

    if (currentLevel > lastNotifiedLocal) {
      // 1. Sauvegarde locale immédiate (priorité absolue)
      localStorage.setItem(localKey, currentLevel);
      
      // 2. Sauvegarde profil (secondaire)
      freshData.pass_last_notified_level = currentLevel;
      saveUserData(freshData);
      
      App.updateLevelInfo();
      
      setTimeout(() => {
          alert(App.t('battle_pass.level_up', {level: currentLevel}));
      }, 100);
    }
  };

  App.checkLevelUp();
  App.updateLevelInfo();

  // Pour l'affichage des récompenses, on a besoin d'une ref userData pour les badges
  const userData = getUserData(); 

  // Listes des récompenses
  // Helper pour les traductions
  const rT = (key, amount) => App.t('battle_pass.rewards.' + key, {amount: amount});

  const freeRewards = [
    { badge: 1, text: rT('points', 5), level: 1, type: 'points', value: 5, rarity: 'simple' },
    { badge: 2, text: rT('potion', 2), level: 2, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 3, text: rT('double_xp', 1), level: 3, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 4, text: rT('points', 10), level: 4, type: 'points', value: 10, rarity: 'simple' },
    { badge: 5, text: rT('solid_shield', 1), level: 5, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 6, text: rT('points', 15), level: 6, type: 'points', value: 15, rarity: 'simple' },
    { badge: 7, text: rT('sharp_sword', 2), level: 7, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 8, text: rT('power_elixir', 1), level: 8, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 9, text: rT('points', 10), level: 9, type: 'points', value: 10, rarity: 'simple' },
    { badge: 10, text: rT('chest_balance', 1), level: 10, type: 'lootbox_equilibre', rarity: 'simple' },
    { badge: 11, text: rT('points', 15), level: 11, type: 'points', value: 15, rarity: 'simple' },
    { badge: 12, text: rT('potion', 2), level: 12, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 13, text: rT('double_xp', 2), level: 13, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 14, text: rT('points', 10), level: 14, type: 'points', value: 10, rarity: 'simple' },
    { badge: 15, text: rT('solid_shield', 2), level: 15, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 16, text: rT('points', 20), level: 16, type: 'points', value: 20, rarity: 'simple' },
    { badge: 17, text: rT('shadow_cape', 1), level: 17, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 18, text: rT('points', 10), level: 18, type: 'points', value: 10, rarity: 'simple' },
    { badge: 19, text: rT('power_elixir', 1), level: 19, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 20, text: rT('regen_amulet', 1), level: 20, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 21, text: rT('points', 10), level: 21, type: 'points', value: 10, rarity: 'simple' },
    { badge: 22, text: rT('iron_armor', 1), level: 22, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 23, text: rT('sharp_sword', 2), level: 23, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 24, text: rT('points', 10), level: 24, type: 'points', value: 10, rarity: 'simple' },
    { badge: 25, text: rT('chest_attack', 1), level: 25, type: 'lootbox_attaque', rarity: 'simple' },
    { badge: 26, text: rT('points', 15), level: 26, type: 'points', value: 15, rarity: 'simple' },
    { badge: 27, text: rT('double_xp', 1), level: 27, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 28, text: rT('potion', 2), level: 28, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 29, text: rT('power_elixir', 1), level: 29, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 30, text: rT('points', 10), level: 30, type: 'points', value: 10, rarity: 'simple' },
    { badge: 31, text: rT('points', 20), level: 31, type: 'points', value: 20, rarity: 'simple' },
    { badge: 32, text: rT('solid_shield', 1), level: 32, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 33, text: rT('sharp_sword', 2), level: 33, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 34, text: rT('points', 10), level: 34, type: 'points', value: 10, rarity: 'simple' },
    { badge: 35, text: rT('regen_amulet', 1), level: 35, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 36, text: rT('points', 10), level: 36, type: 'points', value: 10, rarity: 'simple' },
    { badge: 37, text: rT('iron_armor', 1), level: 37, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 38, text: rT('renewal_crystal', 1), level: 38, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 39, text: rT('potion', 2), level: 39, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 40, text: rT('chest_defense', 1), level: 40, type: 'lootbox_defense', rarity: 'simple' },
    { badge: 41, text: rT('points', 15), level: 41, type: 'points', value: 15, rarity: 'simple' },
    { badge: 42, text: rT('power_elixir', 1), level: 42, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 43, text: rT('double_xp', 2), level: 43, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 44, text: rT('points', 10), level: 44, type: 'points', value: 10, rarity: 'simple' },
    { badge: 45, text: rT('solid_shield', 2), level: 45, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 46, text: rT('points', 20), level: 46, type: 'points', value: 20, rarity: 'simple' },
    { badge: 47, text: rT('shadow_cape', 1), level: 47, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 48, text: rT('points', 10), level: 48, type: 'points', value: 10, rarity: 'simple' },
    { badge: 49, text: rT('regen_amulet', 1), level: 49, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 50, text: rT('potion', 2), level: 50, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 51, text: rT('points', 10), level: 51, type: 'points', value: 10, rarity: 'simple' },
    { badge: 52, text: rT('renewal_crystal', 1), level: 52, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 53, text: rT('double_xp', 1), level: 53, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 54, text: rT('points', 10), level: 54, type: 'points', value: 10, rarity: 'simple' },
    { badge: 55, text: rT('chest_agility', 1), level: 55, type: 'lootbox_agilite', rarity: 'simple' },
    { badge: 56, text: rT('regen_amulet', 1), level: 56, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 57, text: rT('solid_shield', 2), level: 57, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 58, text: rT('points', 10), level: 58, type: 'points', value: 10, rarity: 'simple' },
    { badge: 59, text: rT('shadow_cape', 1), level: 59, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 60, text: rT('random_rewards', 7), level: 60, type: 'recompense', value: 7, rarity: 'simple' }
  ];
  const premiumRewards = [
    { badge: 1, text: rT('points', 10), level: 1, type: 'points', value: 10, rarity: 'premium' },
    { badge: 2, text: rT('potion', 3), level: 2, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 3, text: rT('double_xp', 2), level: 3, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 4, text: rT('points', 20), level: 4, type: 'points', value: 20, rarity: 'premium' },
    { badge: 5, text: rT('chest_attack', 1), level: 5, type: 'lootbox_attaque', rarity: 'premium' },
    { badge: 6, text: rT('points', 20), level: 6, type: 'points', value: 20, rarity: 'premium' },
    { badge: 7, text: rT('sharp_sword', 3), level: 7, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 8, text: rT('power_elixir', 2), level: 8, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 9, text: rT('points', 15), level: 9, type: 'points', value: 15, rarity: 'premium' },
    { badge: 10, text: rT('regen_amulet', 1), level: 10, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 11, text: rT('points', 20), level: 11, type: 'points', value: 20, rarity: 'premium' },
    { badge: 12, text: rT('potion', 3), level: 12, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 13, text: rT('double_xp', 3), level: 13, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 14, text: rT('points', 15), level: 14, type: 'points', value: 15, rarity: 'premium' },
    { badge: 15, text: rT('chest_defense', 1), level: 15, type: 'lootbox_defense', rarity: 'premium' },
    { badge: 16, text: rT('points', 30), level: 16, type: 'points', value: 30, rarity: 'premium' },
    { badge: 17, text: rT('shadow_cape', 1), level: 17, type: 'cape_ombre', rarity: 'premium' },
    { badge: 18, text: rT('points', 15), level: 18, type: 'points', value: 15, rarity: 'premium' },
    { badge: 19, text: rT('power_elixir', 2), level: 19, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 20, text: rT('chest_agilite', 1), level: 20, type: 'lootbox_agilite', rarity: 'premium' },
    { badge: 21, text: rT('points', 15), level: 21, type: 'points', value: 15, rarity: 'premium' },
    { badge: 22, text: rT('iron_armor', 1), level: 22, type: 'armure_fer', rarity: 'premium' },
    { badge: 23, text: rT('sharp_sword', 3), level: 23, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 24, text: rT('points', 15), level: 24, type: 'points', value: 15, rarity: 'premium' },
    { badge: 25, text: rT('renewal_crystal', 1), level: 25, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 26, text: rT('points', 20), level: 26, type: 'points', value: 20, rarity: 'premium' },
    { badge: 27, text: rT('double_xp', 3), level: 27, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 28, text: rT('potion', 3), level: 28, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 29, text: rT('power_elixir', 2), level: 29, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 30, text: rT('chest_balance', 1), level: 30, type: 'lootbox_equilibre', rarity: 'premium' },
    { badge: 31, text: rT('points', 30), level: 31, type: 'points', value: 30, rarity: 'premium' },
    { badge: 32, text: rT('solid_shield', 2), level: 32, type: 'bouclier_solide', value: 2, rarity: 'premium' },
    { badge: 33, text: rT('sharp_sword', 3), level: 33, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 34, text: rT('points', 15), level: 34, type: 'points', value: 15, rarity: 'premium' },
    { badge: 35, text: rT('chest_attack', 1), level: 35, type: 'lootbox_attaque', rarity: 'premium' },
    { badge: 36, text: rT('points', 20), level: 36, type: 'points', value: 20, rarity: 'premium' },
    { badge: 37, text: rT('iron_armor', 1), level: 37, type: 'armure_fer', rarity: 'premium' },
    { badge: 38, text: rT('renewal_crystal', 1), level: 38, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 39, text: rT('potion', 3), level: 39, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 40, text: rT('points', 15), level: 40, type: 'points', value: 15, rarity: 'premium' },
    { badge: 41, text: rT('points', 20), level: 41, type: 'points', value: 20, rarity: 'premium' },
    { badge: 42, text: rT('power_elixir', 2), level: 42, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 43, text: rT('double_xp', 3), level: 43, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 44, text: rT('points', 15), level: 44, type: 'points', value: 15, rarity: 'premium' },
    { badge: 45, text: rT('chest_defense', 1), level: 45, type: 'lootbox_defense', rarity: 'premium' },
    { badge: 46, text: rT('points', 30), level: 46, type: 'points', value: 30, rarity: 'premium' },
    { badge: 47, text: rT('shadow_cape', 1), level: 47, type: 'cape_ombre', rarity: 'premium' },
    { badge: 48, text: rT('points', 15), level: 48, type: 'points', value: 15, rarity: 'premium' },
    { badge: 49, text: rT('regen_amulet', 1), level: 49, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 50, text: rT('chest_agility', 1), level: 50, type: 'lootbox_agilite', rarity: 'premium' },
    { badge: 51, text: rT('points', 15), level: 51, type: 'points', value: 15, rarity: 'premium' },
    { badge: 52, text: rT('renewal_crystal', 1), level: 52, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 53, text: rT('double_xp', 2), level: 53, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 54, text: rT('points', 15), level: 54, type: 'points', value: 15, rarity: 'premium' },
    { badge: 55, text: rT('power_elixir', 2), level: 55, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 56, text: rT('points', 20), level: 56, type: 'points', value: 20, rarity: 'premium' },
    { badge: 57, text: rT('sharp_sword', 3), level: 57, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 58, text: rT('chest_balance', 1), level: 58, type: 'lootbox_equilibre', rarity: 'premium' },
    { badge: 59, text: rT('points', 30), level: 59, type: 'points', value: 30, rarity: 'premium' },
    { badge: 60, text: rT('random_rewards_korb', 7), level: 60, type: 'Personnage', value: 7, rarity: 'premium', characterName: 'Korb' }
  ];

  const rewardsPerPage = 3;
  const totalPages = Math.max(
    Math.ceil(freeRewards.length / rewardsPerPage),
    Math.ceil(premiumRewards.length / rewardsPerPage)
  );
  let currentPageIndex = 0;

  // Crée un élément de récompense
  App.createRewardElement = function(reward) {
    const div = document.createElement('div');
    div.className = `reward ${reward.rarity}`;
    div.dataset.badge = reward.badge;
    div.dataset.level = reward.level;
    div.dataset.rarity = reward.rarity;
    div.dataset.type = reward.type; // Ajout du type pour la logique de clic
    // Vérification de la récupération
    const redeemed = (reward.rarity === 'simple' && userData[`free_${reward.badge}`]) ||
      (reward.rarity === 'premium' && userData[`premium_${reward.badge}`]);
    if (redeemed) { div.classList.add('redeemed'); }
    div.innerHTML = `
      <div class="badge">${reward.badge}</div>
      ${reward.text}
      <div class="error-message hidden" id="error-${reward.badge}">${App.t('battle_pass.error_level')}</div>
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
    freeTitle.textContent = App.t('battle_pass.free_rewards');
    freeTitle.className = 'rewards-title';
    freeContainer.appendChild(freeTitle);
    
    const premiumTitle = document.createElement('h2');
    premiumTitle.textContent = App.t('battle_pass.premium_rewards');
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

  // Affiche la page courante
  App.showPage = function(index) {
    // Supprime la page active actuelle
    const currentPage = albumContainer.querySelector('.page.active');
    if (currentPage) {
      currentPage.classList.remove('active');
    }

    // Crée et affiche la nouvelle page
    const newPage = App.createPage(index);
    albumContainer.innerHTML = ''; // Vide le conteneur
    albumContainer.appendChild(newPage);
    newPage.classList.add('active');

    prevPageBtn.classList.toggle('hidden', index === 0);
    nextPageBtn.classList.toggle('hidden', index === totalPages - 1);
    currentPageIndex = index;
  };

  prevPageBtn.addEventListener('click', () => {
    if (currentPageIndex > 0) {
      App.showPage(currentPageIndex - 1);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPageIndex < totalPages - 1) {
      App.showPage(currentPageIndex + 1);
    }
  });

  // Gestion du clic sur une récompense
  albumContainer.addEventListener('click', event => {
    const rewardElement = event.target.closest('.reward');
    if (!rewardElement) return;
    const badge = rewardElement.dataset.badge;
    const badgeRarity = rewardElement.dataset.rarity;
    const isPremium = (badgeRarity === 'premium');
    
    const user = firebase.auth().currentUser;
    if (!user) return;

    if (isPremium && !userData.pass_premium) {
        App.showPopup();
        return;
    }

    App.getRecaptchaToken('pass_claim').then(recaptchaToken => {
        user.getIdToken().then(token => {
            fetch('/api/pass/claim', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    badge: badge,
                    isPremium: isPremium,
                    recaptchaToken: recaptchaToken
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('userData', JSON.stringify(data.userData));
                    rewardElement.classList.add('redeemed');
                    
                    if (data.extra && data.extra.openBox) {
                        let boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
                        boxesToOpen.push(data.extra.openBox);
                        sessionStorage.setItem('boxesToOpen', JSON.stringify(boxesToOpen));
                        loadPage('ouverture_coffre');
                    }
                } else {
                    if (data.error !== "Déjà récupéré") alert(data.error);
                }
            });
        });
    });
  });
  App.showPage(currentPageIndex);

  };
App.updateParallelPassTitle = function() {
  const userData = getUserData();
  const base = document.querySelector('.premiumA .base');
  if (userData.pass_premium) {
    base.textContent = App.t('battle_pass.title_premium');
  } else {
    base.textContent = App.t('battle_pass.title');
  }
}

// Initialisation avec attente des traductions
App.initPass = function() {
    if (App.translations && Object.keys(App.translations).length > 0) {
        App.translatePage();
        App.updateParallelPassTitle();
        App.initApp();
    } else {
        window.addEventListener('translationsLoaded', () => {
             App.translatePage();
             App.updateParallelPassTitle();
             App.initApp();
        }, { once: true });
        
        setTimeout(() => {
             App.translatePage();
             App.updateParallelPassTitle();
             App.initApp();
        }, 500);
    }
};

App.initPass();
